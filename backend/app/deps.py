from typing import Optional

from fastapi import Cookie, Depends, HTTPException, status
from sqlalchemy.orm import Session

from . import auth
from .database import get_db
from .models import User


def get_current_user_optional(
    db: Session = Depends(get_db),
    access_token: Optional[str] = Cookie(default=None, alias=auth.AUTH_COOKIE_NAME),
) -> Optional[User]:
    """
    Текущий пользователь, если авторизован.
    Для публичных страниц можем не требовать авторизацию.
    """
    if not access_token:
        return None
    payload = auth.decode_access_token(access_token)
    if not payload or "sub" not in payload:
        return None
    user_id = int(payload["sub"])
    user = db.query(User).filter(User.id == user_id).first()
    return user


def get_current_user(
    user: Optional[User] = Depends(get_current_user_optional),
) -> User:
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Требуется авторизация",
        )
    return user

