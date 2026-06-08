from contextlib import asynccontextmanager
import logging

from apscheduler.schedulers.background import BackgroundScheduler
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import Base, SessionLocal, engine
from app.routers import auth, subscriptions
from app.services.renewal import process_renewals

logger = logging.getLogger(__name__)

scheduler = BackgroundScheduler()


def _run_renewals() -> None:
    db = SessionLocal()
    try:
        count = process_renewals(db)
        if count > 0:
            logger.info("Auto-renewed %d subscription(s)", count)
    except Exception:
        logger.exception("Error during auto-renewal processing")
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    scheduler.add_job(_run_renewals, "interval", days=1, id="auto_renewal")
    scheduler.start()
    yield
    scheduler.shutdown(wait=False)


app = FastAPI(title="SubPilot", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(subscriptions.router)
