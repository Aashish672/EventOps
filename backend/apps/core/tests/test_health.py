import pytest
from django.urls import reverse
from rest_framework.test import APIClient


@pytest.mark.django_db
def test_health_check_endpoint():
    """Verify that the health check endpoint returns 200 and expected schema."""
    client = APIClient()
    url = reverse("health_check")
    response = client.get(url)

    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert data["service"] == "eventops-backend"
    assert "timestamp" in data
    assert "database" in data
    assert "cache" in data
