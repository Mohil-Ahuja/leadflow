from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db, make_engine
from app.main import create_app


@pytest.fixture
def client() -> Iterator[TestClient]:
    """A client backed by a fresh in-memory database for every test."""
    # StaticPool shares one connection, which keeps the in-memory database alive.
    engine = make_engine("sqlite://", poolclass=StaticPool)
    Base.metadata.create_all(bind=engine)
    TestSession = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)

    def override_get_db():
        with TestSession() as db:
            yield db

    app = create_app()
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    engine.dispose()


@pytest.fixture
def lead(client: TestClient) -> dict:
    response = client.post("/api/leads", json={"name": "Ananya Iyer", "company": "Kestrel Wealth"})
    assert response.status_code == 201
    return response.json()
