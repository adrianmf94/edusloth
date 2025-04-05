from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import logging
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
from typing import Callable, Awaitable

from app.api.api import api_router
from app.core.config import settings

# Configure logging
logging.basicConfig(
    level=logging.DEBUG, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)

logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.PROJECT_NAME, openapi_url=f"{settings.API_V1_STR}/openapi.json"
)


# Custom logging middleware that doesn't consume the request body
class LoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(
        self, request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        logger.debug(f"Request path: {request.url.path}")
        logger.debug(f"Request method: {request.method}")
        logger.debug(f"Request headers: {request.headers}")

        # Don't try to read the body, let FastAPI/Starlette handle that
        response = await call_next(request)

        logger.debug(f"Response status: {response.status_code}")
        return response


# CORS middleware must be at the top of the middleware stack
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Add logging middleware after CORS
app.add_middleware(LoggingMiddleware)

# Include the API router
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/", include_in_schema=False)
def root() -> dict:
    return {"message": "Welcome to EduSloth API. Go to /docs for documentation."}
