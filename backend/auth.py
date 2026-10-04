"""Firebase authentication shared by the API, without client-controlled identities.

These SDK calls perform network I/O. Async routes should call them in a threadpool.
"""
import importlib
import os
import threading
import time
from datetime import timedelta
from pathlib import Path

from fastapi import HTTPException

BASE_DIR = Path(__file__).resolve().parent
SESSION_SECONDS = 60 * 60 * 24 * 5
_init_lock = threading.Lock()


def _credential_path() -> Path | None:
    value = os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH", "").strip()
    if not value:
        return None
    path = Path(value).expanduser()
    return path if path.is_absolute() else BASE_DIR / path


def auth_configured() -> bool:
    """Report configuration presence; do not claim credentials have been validated."""
    return bool(os.getenv("FIREBASE_PROJECT_ID", "").strip() and _credential_path())


def _firebase():
    project = os.getenv("FIREBASE_PROJECT_ID", "").strip()
    path = _credential_path()
    if not project or path is None or not path.is_file():
        raise HTTPException(503, "Sign-in is unavailable. Configure Firebase Authentication on the server.")
    try:
        sdk = importlib.import_module("firebase_admin")
        credentials = importlib.import_module("firebase_admin.credentials")
        firebase_auth = importlib.import_module("firebase_admin.auth")
        # A named app avoids accidentally reusing credentials initialized elsewhere.
        with _init_lock:
            try:
                app = sdk.get_app("vacanes-auth")
            except ValueError:
                app = sdk.initialize_app(credentials.Certificate(str(path)), {"projectId": project}, name="vacanes-auth")
        if getattr(app, "project_id", None) != project:
            raise ValueError("Firebase project mismatch")
        return firebase_auth, app
    except Exception:
        raise HTTPException(503, "Sign-in is unavailable. Check the server's Firebase configuration.") from None


def _user(claims: dict) -> dict:
    uid = claims.get("uid") or claims.get("sub")
    if not isinstance(uid, str) or not uid or len(uid) > 128:
        raise ValueError("Invalid Firebase subject")
    # Only these verified identity fields cross the API boundary.
    return {"uid": uid, "email": claims.get("email") if isinstance(claims.get("email"), str) else None,
            "name": claims.get("name") if isinstance(claims.get("name"), str) else None}


def verify_session(cookie: str) -> dict | None:
    """Return a verified user, or None for expired/revoked/unavailable sessions."""
    if not isinstance(cookie, str) or not cookie or len(cookie) > 12000:
        return None
    try:
        firebase_auth, app = _firebase()
        return _user(firebase_auth.verify_session_cookie(cookie, check_revoked=True, app=app))
    except Exception:
        return None


def exchange_id_token(token: str) -> dict:
    """Exchange a recently authenticated ID token for a five-day signed session."""
    if not isinstance(token, str) or not token or len(token) > 12000:
        raise HTTPException(401, "Sign-in could not be verified. Please sign in again.")
    firebase_auth, app = _firebase()
    try:
        claims = firebase_auth.verify_id_token(token, check_revoked=True, app=app)
        authenticated_at = claims.get("auth_time")
        if not isinstance(authenticated_at, (int, float)) or isinstance(authenticated_at, bool):
            raise ValueError("Missing authentication time")
        age = time.time() - authenticated_at
        if not 0 <= age < 300:
            raise ValueError("Recent sign-in required")
        user = _user(claims)
        cookie = firebase_auth.create_session_cookie(token, expires_in=timedelta(seconds=SESSION_SECONDS), app=app)
        if not isinstance(cookie, str) or not cookie:
            raise ValueError("Invalid session cookie")
        return {"session_cookie": cookie, "expires_in": SESSION_SECONDS, "user": user}
    except Exception:
        raise HTTPException(401, "Sign-in could not be verified. Please sign in again.") from None
