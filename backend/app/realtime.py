from typing import Dict, List

from fastapi import WebSocket


class WishlistConnectionManager:
    """
    Простой in-memory менеджер WebSocket-подключений по public_id вишлиста.
    Подходит для одного инстанса приложения (демо / тестовое задание).
    """

    def __init__(self) -> None:
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, wishlist_public_id: str, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active_connections.setdefault(wishlist_public_id, []).append(websocket)

    def disconnect(self, wishlist_public_id: str, websocket: WebSocket) -> None:
        if wishlist_public_id in self.active_connections:
            self.active_connections[wishlist_public_id] = [
                ws for ws in self.active_connections[wishlist_public_id] if ws is not websocket
            ]
            if not self.active_connections[wishlist_public_id]:
                self.active_connections.pop(wishlist_public_id, None)

    async def broadcast(self, wishlist_public_id: str, message: dict) -> None:
        connections = self.active_connections.get(wishlist_public_id, [])
        stale: List[WebSocket] = []
        for websocket in connections:
            try:
                await websocket.send_json(message)
            except Exception:
                stale.append(websocket)
        for websocket in stale:
            self.disconnect(wishlist_public_id, websocket)


manager = WishlistConnectionManager()

