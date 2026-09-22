# Ensure Celery app is always imported when Django starts so shared tasks use it.
from .celery import app as celery_app

__all__ = ("celery_app",)
