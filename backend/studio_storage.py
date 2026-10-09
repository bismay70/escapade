"""Optional shared PostgreSQL storage for studio queues and workspace data."""
import os
from contextlib import contextmanager
from backend.models import Preferences

class Row(dict):
    def __getitem__(self,key):
        return list(self.values())[key] if isinstance(key,int) else super().__getitem__(key)

class Cursor:
    def __init__(self,cursor):self.cursor=cursor
    @property
    def rowcount(self):return self.cursor.rowcount
    def fetchone(self):
        row=self.cursor.fetchone();return Row(row) if row is not None else None
    def fetchall(self):return [Row(r) for r in self.cursor.fetchall()]
    def __iter__(self):return iter(self.fetchall())

class Connection:
    def __init__(self,conn):self.conn=conn
    def execute(self,sql,params=()):
        if sql=='BEGIN IMMEDIATE':
            # Cross-process advisory lock serializes queue claims and state transitions.
            return Cursor(self.conn.execute('SELECT pg_advisory_xact_lock(76420819)'))
        return Cursor(self.conn.execute(sql.replace('?','%s'),params))
    def executescript(self,script):
        for sql in script.split(';'):
            if sql.strip():self.execute(sql.replace('id INTEGER PRIMARY KEY,job','id BIGSERIAL PRIMARY KEY,job'))

class SharedStudioStore:
    def __init__(self,local,url):
        self.local,self.url=local,url
        with self.connect() as c:c.execute('CREATE TABLE IF NOT EXISTS studio_profiles(identity TEXT PRIMARY KEY,payload TEXT)')
    @contextmanager
    def connect(self):
        import psycopg
        from psycopg.rows import dict_row
        with psycopg.connect(self.url,row_factory=dict_row,connect_timeout=10) as conn:yield Connection(conn)
    def sync_profile(self,sid):
        p=self.local.profile(sid)
        with self.connect() as c:c.execute('INSERT INTO studio_profiles VALUES(?,?) ON CONFLICT(identity) DO UPDATE SET payload=excluded.payload',(sid,p.model_dump_json()))
    def profile(self,sid):
        with self.connect() as c:row=c.execute('SELECT payload FROM studio_profiles WHERE identity=?',(sid,)).fetchone()
        return Preferences.model_validate_json(row['payload']) if row else Preferences()

def studio_store(local):
    url=os.getenv('STUDIO_DATABASE_URL','')
    return SharedStudioStore(local,url) if url else local
