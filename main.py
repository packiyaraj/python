"""FastAPI application entry point."""

from contextlib import asynccontextmanager

from fastapi import FastAPI

from database import close_mongo_connection
from routes import router as items_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    close_mongo_connection()


app = FastAPI(
    title="Beginner FastAPI CRUD API",
    description="A small items API backed by MongoDB Atlas.",
    lifespan=lifespan,
)

app.include_router(items_router)


@app.get("/", tags=["health"])
def health_check() -> dict[str, str]:
    return {"status": "ok"}
