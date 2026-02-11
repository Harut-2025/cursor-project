from decimal import Decimal
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from .. import deps
from ..database import get_db
from ..models import Contribution, Reservation, User, Wishlist, WishlistItem
from ..realtime import manager
from ..schemas import (
    ContributionCreate,
    WishlistCreate,
    WishlistItemCreate,
    WishlistItemPublic,
    WishlistPublicOut,
    WishlistSummary,
)

router = APIRouter(prefix="/wishlists", tags=["wishlists"])


def _build_item_public_dto(
    item: WishlistItem,
    *,
    current_user: Optional[User],
) -> WishlistItemPublic:
    total_contributed = sum((c.amount for c in item.contributions), Decimal("0.00"))
    has_reservation = bool(item.reservations)

    you_reserved = False
    your_contribution = Decimal("0.00")

    if current_user:
        for r in item.reservations:
            if r.user_id == current_user.id:
                you_reserved = True
                break
        your_contribution = sum(
            (c.amount for c in item.contributions if c.user_id == current_user.id),
            Decimal("0.00"),
        )

    is_fully_funded = total_contributed >= item.price

    return WishlistItemPublic(
        id=item.id,
        name=item.name,
        url=item.url,
        price=item.price,
        image_url=item.image_url,
        total_contributed=total_contributed,
        is_fully_funded=is_fully_funded,
        has_reservation=has_reservation,
        you_reserved=you_reserved,
        your_contribution=your_contribution,
    )


def _wishlist_to_public_out(
    wishlist: Wishlist,
    *,
    current_user: Optional[User],
) -> WishlistPublicOut:
    items = [
        _build_item_public_dto(item, current_user=current_user)
        for item in sorted(wishlist.items, key=lambda i: i.id)
    ]
    is_owner = current_user is not None and wishlist.owner_id == current_user.id
    return WishlistPublicOut(
        id=wishlist.id,
        public_id=wishlist.public_id,
        title=wishlist.title,
        description=wishlist.description,
        event_date=wishlist.event_date,
        created_at=wishlist.created_at,
        is_owner=is_owner,
        items=items,
    )


def _generate_public_id(db: Session) -> str:
    import secrets

    while True:
        token = secrets.token_urlsafe(10)
        exists = db.query(Wishlist).filter(Wishlist.public_id == token).first()
        if not exists:
            return token


def _load_wishlist_with_items(db: Session, wishlist_id: int) -> Wishlist:
    wishlist = (
        db.query(Wishlist)
        .options(
            joinedload(Wishlist.items)
            .joinedload(WishlistItem.contributions),
            joinedload(Wishlist.items)
            .joinedload(WishlistItem.reservations),
        )
        .filter(Wishlist.id == wishlist_id)
        .first()
    )
    if not wishlist:
        raise HTTPException(status_code=404, detail="Вишлист не найден")
    return wishlist


async def _broadcast_wishlist(db_wishlist: Wishlist) -> None:
    # В websocket-сообщение отправляем обезличенное представление (без you_*),
    # чтобы не раскрывать индивидуальную информацию. Клиент может обновить себя по HTTP.
    public = _wishlist_to_public_out(db_wishlist, current_user=None)
    await manager.broadcast(
        db_wishlist.public_id,
        {"type": "wishlist_updated", "wishlist": public.dict()},
    )


@router.get("", response_model=List[WishlistSummary])
def list_my_wishlists(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
) -> List[WishlistSummary]:
    wishlists = (
        db.query(Wishlist)
        .filter(Wishlist.owner_id == current_user.id)
        .order_by(Wishlist.created_at.desc())
        .all()
    )
    return wishlists


@router.post("", response_model=WishlistSummary, status_code=status.HTTP_201_CREATED)
def create_wishlist(
    wishlist_in: WishlistCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
) -> WishlistSummary:
    public_id = _generate_public_id(db)
    wishlist = Wishlist(
        owner_id=current_user.id,
        public_id=public_id,
        title=wishlist_in.title,
        description=wishlist_in.description,
        event_date=wishlist_in.event_date,
    )
    db.add(wishlist)
    db.commit()
    db.refresh(wishlist)
    return wishlist


@router.get("/public/{public_id}", response_model=WishlistPublicOut)
async def get_public_wishlist(
    public_id: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(deps.get_current_user_optional),
) -> WishlistPublicOut:
    wishlist = (
        db.query(Wishlist)
        .options(
            joinedload(Wishlist.items)
            .joinedload(WishlistItem.contributions),
            joinedload(Wishlist.items)
            .joinedload(WishlistItem.reservations),
        )
        .filter(Wishlist.public_id == public_id)
        .first()
    )
    if not wishlist:
        raise HTTPException(status_code=404, detail="Вишлист не найден")
    return _wishlist_to_public_out(wishlist, current_user=current_user)


@router.post("/{wishlist_id}/items", response_model=WishlistPublicOut)
async def add_item(
    wishlist_id: int,
    item_in: WishlistItemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
) -> WishlistPublicOut:
    wishlist = _load_wishlist_with_items(db, wishlist_id)
    if wishlist.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Можно редактировать только свои списки")

    item = WishlistItem(
        wishlist_id=wishlist.id,
        name=item_in.name,
        url=str(item_in.url) if item_in.url else None,
        price=item_in.price,
        image_url=str(item_in.image_url) if item_in.image_url else None,
    )
    db.add(item)
    db.commit()

    wishlist = _load_wishlist_with_items(db, wishlist.id)
    await _broadcast_wishlist(wishlist)
    return _wishlist_to_public_out(wishlist, current_user=current_user)


@router.post("/items/{item_id}/reserve", response_model=WishlistPublicOut)
async def toggle_reservation(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
) -> WishlistPublicOut:
    item = (
        db.query(WishlistItem)
        .options(
            joinedload(WishlistItem.wishlist),
            joinedload(WishlistItem.contributions),
            joinedload(WishlistItem.reservations),
        )
        .filter(WishlistItem.id == item_id)
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Подарок не найден")

    wishlist = item.wishlist
    if wishlist.owner_id == current_user.id:
        raise HTTPException(
            status_code=400, detail="Владелец списка не может резервировать свои подарки"
        )

    existing = db.query(Reservation).filter(Reservation.item_id == item_id).first()
    if existing:
        if existing.user_id != current_user.id:
            raise HTTPException(
                status_code=400, detail="Подарок уже зарезервирован другим пользователем"
            )
        # текущий пользователь снимает резерв
        db.delete(existing)
    else:
        reservation = Reservation(item_id=item_id, user_id=current_user.id)
        db.add(reservation)

    db.commit()

    wishlist = _load_wishlist_with_items(db, wishlist.id)
    await _broadcast_wishlist(wishlist)
    return _wishlist_to_public_out(wishlist, current_user=current_user)


@router.post("/items/{item_id}/contribute", response_model=WishlistPublicOut)
async def contribute(
    item_id: int,
    contribution_in: ContributionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
) -> WishlistPublicOut:
    if contribution_in.amount <= 0:
        raise HTTPException(status_code=400, detail="Сумма взноса должна быть больше нуля")

    item = (
        db.query(WishlistItem)
        .options(
            joinedload(WishlistItem.wishlist),
            joinedload(WishlistItem.contributions),
            joinedload(WishlistItem.reservations),
        )
        .filter(WishlistItem.id == item_id)
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Подарок не найден")

    wishlist = item.wishlist
    if wishlist.owner_id == current_user.id:
        raise HTTPException(
            status_code=400, detail="Владелец списка не может вносить взносы в свои подарки"
        )

    contribution = Contribution(
        item_id=item_id,
        user_id=current_user.id,
        amount=contribution_in.amount,
    )
    db.add(contribution)
    db.commit()

    wishlist = _load_wishlist_with_items(db, wishlist.id)
    await _broadcast_wishlist(wishlist)
    return _wishlist_to_public_out(wishlist, current_user=current_user)

