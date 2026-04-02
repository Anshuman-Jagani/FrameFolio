import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health(client: AsyncClient):
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


@pytest.mark.asyncio
async def test_register_client(client: AsyncClient):
    response = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "client@test.com",
            "password": "Secret123",
            "full_name": "Test Client",
            "role": "client",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "client@test.com"
    assert data["role"] == "client"


@pytest.mark.asyncio
async def test_register_duplicate_email(client: AsyncClient):
    payload = {
        "email": "dupe@test.com",
        "password": "Secret123",
        "full_name": "Dupe User",
        "role": "client",
    }
    await client.post("/api/v1/auth/register", json=payload)
    response = await client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 409


@pytest.mark.asyncio
async def test_login_and_refresh(client: AsyncClient):
    # Register
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": "logintest@test.com",
            "password": "Secret123",
            "full_name": "Login Tester",
        },
    )
    # Login
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": "logintest@test.com", "password": "Secret123"},
    )
    assert response.status_code == 200
    tokens = response.json()
    assert "access_token" in tokens
    assert "refresh_token" in tokens

    # Refresh
    refresh_resp = await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": tokens["refresh_token"]},
    )
    assert refresh_resp.status_code == 200


@pytest.mark.asyncio
async def test_get_me_authenticated(client: AsyncClient):
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": "metest@test.com",
            "password": "Secret123",
            "full_name": "Me Tester",
        },
    )
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "metest@test.com", "password": "Secret123"},
    )
    token = login_resp.json()["access_token"]

    resp = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    assert resp.json()["email"] == "metest@test.com"


@pytest.mark.asyncio
async def test_get_me_unauthenticated(client: AsyncClient):
    resp = await client.get("/api/v1/auth/me")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_weak_password_rejected(client: AsyncClient):
    resp = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "weak@test.com",
            "password": "short",
            "full_name": "Weak User",
        },
    )
    assert resp.status_code == 422
