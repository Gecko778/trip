from collections.abc import Callable
from uuid import UUID

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.security import decode_token
from app.db.deps import get_db_session
from app.repositories import auth as auth_repository

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    session: Session = Depends(get_db_session),
) -> dict:
    if credentials is None:
        raise HTTPException(status_code=401, detail="Missing bearer token")
    payload = decode_token(credentials.credentials, expected_type="access")
    if payload is None:
        raise HTTPException(status_code=401, detail="Invalid bearer token")
    try:
        user_id = UUID(payload["sub"])
    except (KeyError, ValueError, TypeError):
        raise HTTPException(status_code=401, detail="Invalid bearer token") from None
    user = auth_repository.get_user(session, user_id)
    if user is None or user["status"] != "active":
        raise HTTPException(status_code=401, detail="Inactive user")
    user["roles"] = auth_repository.list_user_roles(session, user_id)
    user["permissions"] = auth_repository.list_user_permissions(session, user_id)
    return user


def require_permission(permission_code: str) -> Callable[[dict], dict]:
    def dependency(current_user: dict = Depends(get_current_user)) -> dict:
        if permission_code not in current_user["permissions"]:
            raise HTTPException(status_code=403, detail="Permission denied")
        return current_user

    return dependency
