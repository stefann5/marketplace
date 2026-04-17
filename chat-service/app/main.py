import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app import db
from app.catalog_client import catalog_client
from app.category_cache import category_cache
from app.reranker import reranker
from app.routes import router

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s - %(message)s")


@asynccontextmanager
async def lifespan(app: FastAPI):
    await db.connect()
    await category_cache.start_refresh_loop()
    warm_task = asyncio.create_task(reranker.warm())
    yield
    warm_task.cancel()
    await category_cache.stop()
    await catalog_client.aclose()
    await db.disconnect()


app = FastAPI(title="chat-service", lifespan=lifespan)
app.include_router(router)


@app.get("/health")
async def health():
    return {"status": "ok"}
