import pytest
from httpx import AsyncClient

from app.main import app


@pytest.mark.asyncio
async def test_coaching_endpoint_dry_run(sample_coaching_payload):
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.post(
            "/api/v1/coaching/squad?dry_run=true",
            json=sample_coaching_payload,
        )

    assert response.status_code == 200
    data = response.json()
    assert data["team_summary"]["headline"]
    assert len(data["reps"]) > 0


@pytest.mark.asyncio
async def test_coaching_endpoint_validation_error():
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.post("/api/v1/coaching/squad", json={"invalid": "data"})

    assert response.status_code == 422


@pytest.mark.asyncio
async def test_health_check():
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/health")

    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


