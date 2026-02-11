from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (
    Column,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    name = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    wishlists = relationship("Wishlist", back_populates="owner", cascade="all, delete-orphan")


class Wishlist(Base):
    __tablename__ = "wishlists"

    id = Column(Integer, primary_key=True, index=True)
    public_id = Column(String(64), unique=True, index=True, nullable=False)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    event_date = Column(Date, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    owner = relationship("User", back_populates="wishlists")
    items = relationship("WishlistItem", back_populates="wishlist", cascade="all, delete-orphan")


class WishlistItem(Base):
    __tablename__ = "wishlist_items"

    id = Column(Integer, primary_key=True, index=True)
    wishlist_id = Column(Integer, ForeignKey("wishlists.id"), nullable=False)
    name = Column(String(255), nullable=False)
    url = Column(String(1024), nullable=True)
    price = Column(Numeric(10, 2), nullable=False, default=Decimal("0.00"))
    image_url = Column(String(1024), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    wishlist = relationship("Wishlist", back_populates="items")
    reservations = relationship(
        "Reservation", back_populates="item", cascade="all, delete-orphan"
    )
    contributions = relationship(
        "Contribution", back_populates="item", cascade="all, delete-orphan"
    )


class Reservation(Base):
    """
    Резервация подарка (один человек берёт подарок целиком).
    Один подарок может быть зарезервирован только одним пользователем.
    """

    __tablename__ = "reservations"
    __table_args__ = (
        UniqueConstraint("item_id", name="uq_reservation_item"),
    )

    id = Column(Integer, primary_key=True, index=True)
    item_id = Column(Integer, ForeignKey("wishlist_items.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    item = relationship("WishlistItem", back_populates="reservations")
    user = relationship("User")


class Contribution(Base):
    """
    Вклад в дорогой подарок.
    Несколько друзей могут скидываться, у каждого свой amount.
    """

    __tablename__ = "contributions"

    id = Column(Integer, primary_key=True, index=True)
    item_id = Column(Integer, ForeignKey("wishlist_items.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    amount = Column(Numeric(10, 2), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    item = relationship("WishlistItem", back_populates="contributions")
    user = relationship("User")

