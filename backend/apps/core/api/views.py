import logging
from datetime import UTC, datetime

from django.core.cache import cache
from django.db import DatabaseError, connection
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

logger = logging.getLogger("eventops")


class HealthCheckView(APIView):
    """
    Health check endpoint to verify backend operational readiness.
    Checks database connection and cache responsiveness.
    """

    permission_classes = (AllowAny,)
    authentication_classes = ()

    def get(self, request):
        logger.info("Health check endpoint invoked")
        health_status = {
            "status": "healthy",
            "service": "eventops-backend",
            "timestamp": datetime.now(UTC).isoformat(),
            "database": "unknown",
            "cache": "unknown",
        }

        # Check database
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                cursor.fetchone()
            health_status["database"] = "connected"
        except (DatabaseError, Exception) as e:  # noqa: BLE001
            logger.warning(f"Database health check failed: {e}")
            health_status["database"] = "disconnected"
            health_status["status"] = "degraded"

        # Check cache / Redis
        try:
            cache.set("health_check_ping", "pong", timeout=10)
            if cache.get("health_check_ping") == "pong":
                health_status["cache"] = "connected"
            else:
                health_status["cache"] = "unavailable"
        except Exception as e:  # noqa: BLE001
            logger.warning(f"Cache health check failed: {e}")
            health_status["cache"] = "disconnected"

        http_status = (
            status.HTTP_200_OK
            if health_status["status"] == "healthy"
            else status.HTTP_503_SERVICE_UNAVAILABLE
        )
        return Response(health_status, status=http_status)
