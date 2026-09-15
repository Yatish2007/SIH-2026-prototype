from contextlib import asynccontextmanager

from fastapi import FastAPI

from .database import Base, engine
from .routers import auth, users


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)

    yield


app = FastAPI(
    title="CAPACITY CONNECT API",
    description=(
        "Digital Capacity Building and "
        "Learning Management Portal"
    ),
    version="1.0.0",
    lifespan=lifespan
)


app.include_router(auth.router)
app.include_router(users.router)


@app.get("/")
def root():
    return {
        "message": "CAPACITY CONNECT Backend",
        "status": "running"
    }


@app.get("/health")
def health():
    return {
        "status": "healthy"
    }