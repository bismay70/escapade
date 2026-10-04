import sys
import time
from types import SimpleNamespace
from unittest.mock import Mock

import pytest
from fastapi import HTTPException

from backend import auth


@pytest.fixture
def firebase(monkeypatch, tmp_path):
    path = tmp_path / "service-account.json"
    path.write_text("{}")
    monkeypatch.setenv("FIREBASE_PROJECT_ID", "vacanes-test")
    monkeypatch.setenv("FIREBASE_SERVICE_ACCOUNT_PATH", str(path))
    app = SimpleNamespace(project_id="vacanes-test")
    sdk = SimpleNamespace(get_app=Mock(return_value=app), initialize_app=Mock(return_value=app))
    credentials = SimpleNamespace(Certificate=Mock(return_value="private-credential"))
    claims = {"uid": "verified-user", "email": "user@example.com", "name": "Traveler", "auth_time": time.time() - 10,
              "admin": True, "private_claim": "must-not-be-returned"}
    provider = SimpleNamespace(verify_id_token=Mock(return_value=claims),
                               verify_session_cookie=Mock(return_value=claims),
                               create_session_cookie=Mock(return_value="signed-session-cookie"))
    monkeypatch.setitem(sys.modules, "firebase_admin", sdk)
    monkeypatch.setitem(sys.modules, "firebase_admin.credentials", credentials)
    monkeypatch.setitem(sys.modules, "firebase_admin.auth", provider)
    return sdk, credentials, provider, app


def test_token_exchange_uses_revocation_and_limited_user_claims(firebase):
    _, _, provider, app = firebase
    response = auth.exchange_id_token("id-token")
    provider.verify_id_token.assert_called_once_with("id-token", check_revoked=True, app=app)
    assert provider.create_session_cookie.call_args.kwargs["expires_in"].total_seconds() == 432000
    assert response == {"session_cookie": "signed-session-cookie", "expires_in": 432000,
                        "user": {"uid": "verified-user", "email": "user@example.com", "name": "Traveler"}}


@pytest.mark.parametrize("age", [301, 3600, -60])
def test_old_or_future_authentication_cannot_create_session(firebase, age):
    _, _, provider, _ = firebase
    provider.verify_id_token.return_value["auth_time"] = time.time() - age
    with pytest.raises(HTTPException) as error:
        auth.exchange_id_token("id-token")
    assert error.value.status_code == 401
    provider.create_session_cookie.assert_not_called()


@pytest.mark.parametrize("auth_time", [None, "now", True])
def test_missing_or_invalid_authentication_time_is_rejected(firebase, auth_time):
    _, _, provider, _ = firebase
    provider.verify_id_token.return_value["auth_time"] = auth_time
    with pytest.raises(HTTPException) as error:
        auth.exchange_id_token("id-token")
    assert error.value.status_code == 401
    provider.create_session_cookie.assert_not_called()


def test_revoked_or_invalid_token_never_leaks_provider_error(firebase):
    _, _, provider, _ = firebase
    provider.verify_id_token.side_effect = ValueError("private-service-account-key revoked")
    with pytest.raises(HTTPException) as error:
        auth.exchange_id_token("bad-id-token")
    assert error.value.status_code == 401
    assert "private-service-account-key" not in error.value.detail
    provider.create_session_cookie.assert_not_called()


def test_session_verification_checks_revocation(firebase):
    _, _, provider, app = firebase
    assert auth.verify_session("signed-session-cookie")["uid"] == "verified-user"
    provider.verify_session_cookie.assert_called_once_with("signed-session-cookie", check_revoked=True, app=app)
    provider.verify_session_cookie.side_effect = ValueError("revoked-token")
    assert auth.verify_session("revoked-session") is None


def test_invalid_session_claims_do_not_create_identity(firebase):
    _, _, provider, _ = firebase
    provider.verify_session_cookie.return_value = {"email": "attacker@example.com"}
    assert auth.verify_session("signed-but-invalid-subject") is None
    assert auth.verify_session("") is None
    assert auth.verify_session("x" * 12001) is None


def test_missing_server_configuration_fails_closed(monkeypatch):
    monkeypatch.delenv("FIREBASE_PROJECT_ID", raising=False)
    monkeypatch.delenv("FIREBASE_SERVICE_ACCOUNT_PATH", raising=False)
    assert not auth.auth_configured()
    assert auth.verify_session("some-cookie") is None
    with pytest.raises(HTTPException) as error:
        auth.exchange_id_token("some-token")
    assert error.value.status_code == 503


def test_relative_service_account_path_is_source_relative(monkeypatch, tmp_path):
    monkeypatch.setenv("FIREBASE_SERVICE_ACCOUNT_PATH", "secrets/service-account.json")
    monkeypatch.chdir(tmp_path)
    assert auth._credential_path() == auth.BASE_DIR / "secrets/service-account.json"


def test_named_sdk_initialization_uses_configured_project(firebase):
    sdk, credentials, provider, app = firebase
    sdk.get_app.side_effect = ValueError("missing app")
    auth.verify_session("signed-session-cookie")
    sdk.initialize_app.assert_called_once_with("private-credential", {"projectId": "vacanes-test"}, name="vacanes-auth")
    credentials.Certificate.assert_called_once()
    provider.verify_session_cookie.assert_called_once_with("signed-session-cookie", check_revoked=True, app=app)


def test_project_mismatch_fails_closed(firebase):
    _, _, provider, app = firebase
    app.project_id = "different-project"
    assert auth.verify_session("signed-session-cookie") is None
    provider.verify_session_cookie.assert_not_called()
