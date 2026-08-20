from app.core.config import get_settings
from app.core.security import (
    create_access_token,
    decode_token,
    hash_password,
    issue_csrf_token,
    verify_csrf_token,
    verify_password,
)


def test_hash_and_verify_password():
    hashed = hash_password("secret123")
    assert hashed.startswith("$2b$12$")
    assert verify_password("secret123", hashed)
    assert not verify_password("wrong", hashed)


def test_access_token_roundtrip():
    import uuid

    uid = uuid.uuid4()
    token = create_access_token(uid)
    payload = decode_token(token)
    assert payload["sub"] == str(uid)
    assert payload["type"] == "access"


def test_verify_password_invalid_hash_returns_false():
    assert not verify_password("x", "not-a-bcrypt-hash")


def test_csrf_token_binding():
    access = create_access_token(__import__("uuid").uuid4())
    t1 = issue_csrf_token(access)
    t2 = issue_csrf_token(access)
    assert t1 == t2
    assert verify_csrf_token(access, t1)
    assert not verify_csrf_token(access, "bogus")
    assert not verify_csrf_token(access, "")
    other_access = create_access_token(__import__("uuid").uuid4())
    assert not verify_csrf_token(other_access, t1)


def test_rate_limit_parser():
    s = get_settings()
    assert s.rate_limit_tuple == (5, 300)
