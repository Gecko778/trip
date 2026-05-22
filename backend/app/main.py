from fastapi import FastAPI

from app.api.system import router as system_router
from app.core.config import settings
from app.core.errors import register_exception_handlers
from app.core.middleware import TraceIdMiddleware


def create_app() -> FastAPI:
    app = FastAPI(title=settings.app_name, version=settings.app_version)
    app.add_middleware(TraceIdMiddleware)
    register_exception_handlers(app)
    app.include_router(system_router)
    return app


app = create_app()
