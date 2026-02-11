from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional

from pydantic import BaseModel, EmailStr, HttpUrl


class UserBase(BaseModel):
    email: EmailStr
    name: str


class UserCreate(UserBase):
    password: str


class UserOut(UserBase):
    id: int
    created_at: datetime

    class Config:
        orm_mode = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class WishlistItemBase(BaseModel):
    name: str
    url: Optional[HttpUrl] = None
    price: Decimal
    image_url: Optional[HttpUrl] = None


class WishlistItemCreate(WishlistItemBase):
    pass


class WishlistItemPublic(BaseModel):
    """
    DTO для отдачи карточки подарка в публичном и приватном списке.
    Здесь уже есть агрегированные поля по резервациям и взносам.
    """

    id: int
    name: str
    url: Optional[HttpUrl] = None
    price: Decimal
    image_url: Optional[HttpUrl] = None

    total_contributed: Decimal
    is_fully_funded: bool
    has_reservation: bool
    you_reserved: bool
    your_contribution: Decimal

    class Config:
        orm_mode = True


class WishlistBase(BaseModel):
    title: str
    description: Optional[str] = None
    event_date: Optional[date] = None


class WishlistCreate(WishlistBase):
    pass


class WishlistSummary(BaseModel):
    id: int
    public_id: str
    title: str
    description: Optional[str] = None
    event_date: Optional[date] = None
    created_at: datetime

    class Config:
        orm_mode = True


class WishlistPublicOut(BaseModel):
    """
    Публичное (и приватное) представление вишлиста с карточками подарков.
    """

    id: int
    public_id: str
    title: str
    description: Optional[str] = None
    event_date: Optional[date] = None
    created_at: datetime
    is_owner: bool
    items: List[WishlistItemPublic]


class ContributionCreate(BaseModel):
    amount: Decimal

