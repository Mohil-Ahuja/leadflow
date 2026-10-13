from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient


def future(**delta) -> str:
    return (datetime.now(timezone.utc) + timedelta(**delta)).isoformat()


class TestCreateLead:
    def test_defaults_status_to_new_and_trims_input(self, client: TestClient):
        response = client.post("/api/leads", json={"name": "  Rohan Mehta ", "company": "  ", "phone": ""})

        assert response.status_code == 201
        body = response.json()
        assert body["name"] == "Rohan Mehta"
        assert body["status"] == "new"
        assert body["company"] is None and body["phone"] is None
        assert response.headers["location"] == f"/api/leads/{body['id']}"

    def test_name_is_required(self, client: TestClient):
        response = client.post("/api/leads", json={"name": "   "})

        assert response.status_code == 422
        error = response.json()["error"]
        assert error["code"] == "validation_error"
        assert error["details"][0]["field"] == "name"

    def test_rejects_unknown_status(self, client: TestClient):
        response = client.post("/api/leads", json={"name": "X", "status": "maybe"})
        assert response.status_code == 422


class TestListLeads:
    def test_includes_last_note_and_counts(self, client: TestClient, lead: dict):
        client.post(f"/api/leads/{lead['id']}/discussions", json={"note": "First call"})
        client.post(f"/api/leads/{lead['id']}/discussions", json={"note": "Sent proposal"})

        body = client.get("/api/leads").json()

        assert body["total"] == 1
        item = body["items"][0]
        assert item["last_note"]["note"] == "Sent proposal"
        # two notes plus the automatic "lead added" entry
        assert item["discussion_count"] == 3
        assert body["status_counts"]["new"] == 1
        assert body["status_counts"]["won"] == 0

    def test_last_note_ignores_system_entries(self, client: TestClient, lead: dict):
        client.post(f"/api/leads/{lead['id']}/discussions", json={"note": "Discovery call"})
        client.patch(f"/api/leads/{lead['id']}", json={"status": "qualified"})

        item = client.get("/api/leads").json()["items"][0]
        assert item["last_note"]["note"] == "Discovery call"

    def test_filters_by_status_but_counts_every_stage(self, client: TestClient):
        client.post("/api/leads", json={"name": "A", "status": "won"})
        client.post("/api/leads", json={"name": "B"})

        body = client.get("/api/leads", params={"status": "won"}).json()

        assert [item["name"] for item in body["items"]] == ["A"]
        assert body["status_counts"]["won"] == 1
        assert body["status_counts"]["new"] == 1

    def test_searches_name_and_company_case_insensitively(self, client: TestClient):
        client.post("/api/leads", json={"name": "Priya Nair", "company": "Northstar"})
        client.post("/api/leads", json={"name": "Arjun Bose", "company": "Polaris"})

        assert [i["name"] for i in client.get("/api/leads", params={"q": "PRIYA"}).json()["items"]] == ["Priya Nair"]
        assert [i["name"] for i in client.get("/api/leads", params={"q": "polar"}).json()["items"]] == ["Arjun Bose"]

    def test_most_recently_active_first(self, client: TestClient):
        older = client.post("/api/leads", json={"name": "Older"}).json()
        client.post("/api/leads", json={"name": "Newer"})
        client.post(f"/api/leads/{older['id']}/discussions", json={"note": "Just spoke"})

        names = [item["name"] for item in client.get("/api/leads").json()["items"]]
        assert names == ["Older", "Newer"]


class TestUpdateLead:
    def test_status_change_persists_and_is_logged(self, client: TestClient, lead: dict):
        response = client.patch(f"/api/leads/{lead['id']}", json={"status": "proposal_sent"})

        assert response.status_code == 200
        assert client.get(f"/api/leads/{lead['id']}").json()["status"] == "proposal_sent"
        latest = client.get(f"/api/leads/{lead['id']}/discussions").json()[0]
        assert latest["kind"] == "system"
        assert latest["note"] == "Status changed from New to Proposal sent"

    def test_same_status_is_not_logged_twice(self, client: TestClient, lead: dict):
        client.patch(f"/api/leads/{lead['id']}", json={"status": "new"})
        assert len(client.get(f"/api/leads/{lead['id']}/discussions").json()) == 1

    def test_explicit_null_clears_follow_up(self, client: TestClient, lead: dict):
        client.patch(f"/api/leads/{lead['id']}", json={"follow_up_at": future(days=1)})
        response = client.patch(f"/api/leads/{lead['id']}", json={"follow_up_at": None})

        assert response.status_code == 200
        assert response.json()["follow_up_at"] is None

    def test_name_cannot_be_nulled(self, client: TestClient, lead: dict):
        response = client.patch(f"/api/leads/{lead['id']}", json={"name": None})
        assert response.status_code == 422

    def test_unknown_lead_is_404(self, client: TestClient):
        response = client.patch("/api/leads/999", json={"status": "won"})

        assert response.status_code == 404
        assert response.json()["error"] == {"code": "not_found", "message": "Lead 999 not found", "details": None}


class TestDeleteLead:
    def test_removes_lead_and_history(self, client: TestClient, lead: dict):
        assert client.delete(f"/api/leads/{lead['id']}").status_code == 204
        assert client.get(f"/api/leads/{lead['id']}").status_code == 404
        assert client.get(f"/api/leads/{lead['id']}/discussions").status_code == 404
