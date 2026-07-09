import os
from contextlib import asynccontextmanager
import logging

from apscheduler.schedulers.background import BackgroundScheduler
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.database import Base, SessionLocal, engine
from app.routers import auth, categories, subscriptions, payment_methods
from app.services.exchange_rate import fetch_exchange_rates
from app.services.notifications import process_reminders
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


def _run_reminders() -> None:
    db = SessionLocal()
    try:
        count = process_reminders(db)
        if count > 0:
            logger.info("Sent %d reminder message(s)", count)
    except Exception:
        logger.exception("Error during reminder processing")
    finally:
        db.close()


def _run_exchange_rates() -> None:
    db = SessionLocal()
    try:
        fetch_exchange_rates(db)
    except Exception:
        logger.exception("Error during exchange rate fetch")
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    scheduler.add_job(_run_renewals, "interval", days=1, id="auto_renewal")
    scheduler.add_job(_run_exchange_rates, "interval", days=1, id="fetch_exchange_rates")
    scheduler.add_job(_run_reminders, "interval", minutes=1, id="send_reminders")
    _run_renewals()
    _run_exchange_rates()
    _run_reminders()  # catch-up after restart (safe: per-user time + idempotency gates)
    scheduler.start()
    os.makedirs("static/logos", exist_ok=True)
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
app.include_router(categories.router)
app.include_router(payment_methods.router)

app.mount("/static", StaticFiles(directory="static"), name="static")
