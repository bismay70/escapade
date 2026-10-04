"""Small local persistent store; all queries are scoped to the server session."""
import json
import sqlite3
from contextlib import contextmanager

from backend.config import database_path
from backend.models import Preferences


class Store:
    def __init__(self, path=None):
        self.path = path or database_path()
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with self.connect() as conn:
            conn.executescript("""
                PRAGMA journal_mode=WAL;
                CREATE TABLE IF NOT EXISTS profiles(session TEXT PRIMARY KEY, preferences TEXT NOT NULL);
                CREATE TABLE IF NOT EXISTS messages(id INTEGER PRIMARY KEY AUTOINCREMENT, session TEXT NOT NULL, role TEXT NOT NULL, content TEXT NOT NULL, payload TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
                CREATE INDEX IF NOT EXISTS messages_session ON messages(session,id);
                CREATE TABLE IF NOT EXISTS offers(id TEXT PRIMARY KEY, session TEXT NOT NULL, payload TEXT NOT NULL, expires_at REAL NOT NULL);
                CREATE INDEX IF NOT EXISTS offers_session ON offers(session);
                CREATE TABLE IF NOT EXISTS bookings(id TEXT PRIMARY KEY, session TEXT NOT NULL, offer_id TEXT NOT NULL, idempotency_key TEXT NOT NULL, payload TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP, UNIQUE(session,idempotency_key));
                CREATE TABLE IF NOT EXISTS payment_events(id TEXT PRIMARY KEY, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
            """)

    @contextmanager
    def connect(self):
        conn = sqlite3.connect(self.path, timeout=10)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
            conn.commit()
        finally:
            conn.close()

    def profile(self, session):
        with self.connect() as conn:
            row = conn.execute("SELECT preferences FROM profiles WHERE session=?", (session,)).fetchone()
        return Preferences.model_validate_json(row[0]) if row else Preferences()

    def save_profile(self, session, preferences):
        with self.connect() as conn:
            conn.execute("INSERT INTO profiles VALUES (?,?) ON CONFLICT(session) DO UPDATE SET preferences=excluded.preferences", (session, preferences.model_dump_json()))

    def history(self, session, limit=40):
        with self.connect() as conn:
            rows = conn.execute("SELECT role,content,payload,created_at FROM messages WHERE session=? ORDER BY id DESC LIMIT ?", (session, limit)).fetchall()
        return [{**dict(row), "payload": json.loads(row["payload"]) if row["payload"] else None} for row in reversed(rows)]

    def append_turn(self, session, message, response):
        with self.connect() as conn:
            conn.execute("INSERT INTO messages(session,role,content) VALUES (?,'user',?)", (session, message))
            conn.execute("INSERT INTO messages(session,role,content,payload) VALUES (?,'assistant',?,?)", (session, response["answer"], json.dumps(response)))
            # Bound retained history for this local demo.
            conn.execute("DELETE FROM messages WHERE session=? AND id NOT IN (SELECT id FROM messages WHERE session=? ORDER BY id DESC LIMIT 100)", (session, session))

    def clear_history(self, session):
        with self.connect() as conn:
            conn.execute("DELETE FROM messages WHERE session=?", (session,))

    def save_offer(self, session, offer, expires_at):
        with self.connect() as conn:
            conn.execute("INSERT INTO offers VALUES (?,?,?,?)", (offer["offer_id"], session, json.dumps(offer), expires_at))
            # Expiring inventory is transient; persisted booking snapshots remain intact.
            conn.execute("DELETE FROM offers WHERE expires_at < strftime('%s','now') - 86400")

    def offer(self, session, offer_id):
        with self.connect() as conn:
            row = conn.execute("SELECT payload,expires_at FROM offers WHERE id=? AND session=?", (offer_id, session)).fetchone()
        return (json.loads(row["payload"]), row["expires_at"]) if row else None

    def create_booking(self, session, booking, idempotency_key):
        with self.connect() as conn:
            conn.execute("INSERT OR IGNORE INTO bookings(id,session,offer_id,idempotency_key,payload) VALUES (?,?,?,?,?)", (booking["id"], session, booking["offer"]["offer_id"], idempotency_key, json.dumps(booking)))
            row = conn.execute("SELECT payload FROM bookings WHERE session=? AND idempotency_key=?", (session, idempotency_key)).fetchone()
        return json.loads(row[0])

    def booking(self, session, booking_id):
        with self.connect() as conn:
            row = conn.execute("SELECT payload FROM bookings WHERE id=? AND session=?", (booking_id, session)).fetchone()
        return json.loads(row[0]) if row else None

    def bookings(self, session):
        with self.connect() as conn:
            rows = conn.execute("SELECT payload FROM bookings WHERE session=? ORDER BY created_at DESC,id DESC LIMIT 100", (session,)).fetchall()
        return [json.loads(row[0]) for row in rows]

    def change_booking(self, session, booking_id, change):
        """Serialize mutations across processes, preserving reservation/payment state."""
        with self.connect() as conn:
            conn.execute("BEGIN IMMEDIATE")
            row = conn.execute("SELECT payload FROM bookings WHERE id=? AND session=?", (booking_id, session)).fetchone()
            if not row:
                return None
            booking = json.loads(row[0])
            change(booking)
            conn.execute("UPDATE bookings SET payload=? WHERE id=?", (json.dumps(booking), booking_id))
        return booking

    def apply_payment_event(self, event_id, booking_id, change):
        with self.connect() as conn:
            conn.execute("BEGIN IMMEDIATE")
            if conn.execute("SELECT 1 FROM payment_events WHERE id=?", (event_id,)).fetchone():
                return False
            row = conn.execute("SELECT payload FROM bookings WHERE id=?", (booking_id,)).fetchone()
            if row:
                booking = json.loads(row[0])
                change(booking)
                conn.execute("UPDATE bookings SET payload=? WHERE id=?", (json.dumps(booking), booking_id))
            conn.execute("INSERT INTO payment_events(id) VALUES (?)", (event_id,))
        return True
