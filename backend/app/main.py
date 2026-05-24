from fastapi import FastAPI

from app.api.auth import router as auth_router
from app.api.communications import router as communications_router
from app.api.markets import router as markets_router
from app.api.orders import router as orders_router
from app.api.plans import router as plans_router
from app.api.profiles import router as profiles_router
from app.api.system import router as system_router
from app.api.users import router as users_router
from app.core.config import settings
from app.core.errors import register_exception_handlers
from app.core.middleware import TraceIdMiddleware


def create_app() -> FastAPI:
    app = FastAPI(title=settings.app_name, version=settings.app_version)
    app.add_middleware(TraceIdMiddleware)
    register_exception_handlers(app)
    app.include_router(auth_router)
    app.include_router(communications_router)
    app.include_router(markets_router)
    app.include_router(orders_router)
    app.include_router(plans_router)
    app.include_router(profiles_router)
    app.include_router(system_router)
    app.include_router(users_router)
    return app


app = create_app()
