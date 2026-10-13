from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient


def iso(dt: datetime) -> str:
    return dt.isoformat()


def parse(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def test_history_is_newest_first(client: TestClient, lead: dict):
    for note in ("one", "two", "three"):
        assert client.post(f"/api/leads/{lead['id']}/discussions", json={"note": note}).status_code == 201

    notes = [d["note"] for d in client.get(f"/api/leads/{lead['id']}/discussions").json()]
    assert notes == ["three", "two", "one", "Lead added to LeadFlow"]


def test_follow_up_on_note_updates_lead(client: TestClient, lead: dict):
    follow_up = datetime.now(timezone.utc) + timedelta(hours=3)

    response = client.post(
        f"/api/leads/{lead['id']}/discussions",
        json={"note": "Call back after board meeting", "follow_up_at": iso(follow_up)},
    )

    assert response.status_code == 201
    body = response.json()
    assert parse(body["discussion"]["follow_up_at"]) == follow_up
    # The lead in the response is already up to date, so the list can refresh in place.
    assert parse(body["lead"]["follow_up_at"]) == follow_up
    assert body["lead"]["last_note"]["note"] == "Call back after board meeting"
    assert parse(client.get(f"/api/leads/{lead['id']}").json()["follow_up_at"]) == follow_up


def test_follow_up_keeps_timezone_offset_semantics(client: TestClient, lead: dict):
    ist = timezone(timedelta(hours=5, minutes=30))
    follow_up = (datetime.now(ist) + timedelta(days=1)).replace(microsecond=0)

    client.post(f"/api/leads/{lead['id']}/discussions", json={"note": "x", "follow_up_at": iso(follow_up)})

    stored = parse(client.get(f"/api/leads/{lead['id']}").json()["follow_up_at"])
    assert stored == follow_up
    assert stored.utcoffset() == timedelta(0)


def test_note_without_follow_up_keeps_existing_one(client: TestClient, lead: dict):
    follow_up = datetime.now(timezone.utc) + timedelta(days=2)
    client.post(f"/api/leads/{lead['id']}/discussions", json={"note": "a", "follow_up_at": iso(follow_up)})
    client.post(f"/api/leads/{lead['id']}/discussions", json={"note": "b"})

    assert parse(client.get(f"/api/leads/{lead['id']}").json()["follow_up_at"]) == follow_up


def test_rejects_follow_up_in_the_past(client: TestClient, lead: dict):
    past = datetime.now(timezone.utc) - timedelta(days=1)
    response = client.post(f"/api/leads/{lead['id']}/discussions", json={"note": "x", "follow_up_at": iso(past)})

    assert response.status_code == 422
    assert response.json()["error"]["details"] == [
        {"field": "follow_up_at", "message": "Pick a follow-up time in the future"}
    ]


def test_rejects_follow_up_without_timezone(client: TestClient, lead: dict):
    response = client.post(
        f"/api/leads/{lead['id']}/discussions", json={"note": "x", "follow_up_at": "2030-01-01T10:00:00"}
    )
    assert response.status_code == 422


def test_rejects_blank_note(client: TestClient, lead: dict):
    response = client.post(f"/api/leads/{lead['id']}/discussions", json={"note": "   "})
    assert response.status_code == 422


def test_unknown_lead_is_404(client: TestClient):
    assert client.post("/api/leads/42/discussions", json={"note": "x"}).status_code == 404
    assert client.get("/api/leads/42/discussions").status_code == 404


def test_health(client: TestClient):
    assert client.get("/api/health").json() == {"status": "ok"}
