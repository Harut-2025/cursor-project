from fastapi import Depends, FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from . import auth, deps
from .config import settings
from .database import init_db
from .models import User
from .realtime import manager
from .routers import wishlists
from .schemas import UserOut


def create_app() -> FastAPI:
    app = FastAPI(title="Social Wishlist API")

    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(o) for o in settings.BACKEND_CORS_ORIGINS],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Инициализация БД при старте
    @app.on_event("startup")
    def on_startup() -> None:
        init_db()

    # Роуты аутентификации
    @app.get("/auth/me", response_model=UserOut)
    def read_me(current_user: User = Depends(deps.get_current_user)):
        return current_user

    app.include_router(auth.router)

    # Роуты вишлистов
    app.include_router(wishlists.router)

    # WebSocket для realtime-обновлений по public_id списка
    @app.websocket("/ws/wishlists/{public_id}")
    async def wishlist_ws(websocket: WebSocket, public_id: str):
        await manager.connect(public_id, websocket)
        try:
            while True:
                # держим соединение открытым; клиент может посылать pings/noop
                await websocket.receive_text()
        except WebSocketDisconnect:
            manager.disconnect(public_id, websocket)

    return app


app = create_app()

