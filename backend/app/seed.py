"""Demo data: wealth-advisory firms in a sales pipeline.

All times are relative to *now*, so the demo always has follow-ups due today,
a couple that are overdue, and some coming up later in the week.

    python -m app.seed           # seed only if the database is empty
    python -m app.seed --reset   # wipe everything and seed again
"""

import argparse
from dataclasses import dataclass, field
from datetime import datetime, time, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import Base, SessionLocal, engine
from app.models import Discussion, DiscussionKind, Lead, LeadStatus


@dataclass
class SeedLead:
    name: str
    company: str | None
    phone: str | None
    status: LeadStatus
    created_days_ago: float
    # (days ago, note, whether this note scheduled the lead's current follow-up)
    notes: list[tuple[float, str, bool]] = field(default_factory=list)
    follow_up: datetime | None = None


def _today_at(hour: int, minute: int = 0) -> datetime:
    """A time today in the server's local timezone, kept inside today's date."""
    local_now = datetime.now().astimezone()
    return datetime.combine(local_now.date(), time(hour, minute), tzinfo=local_now.tzinfo).astimezone(timezone.utc)


def _later_today(preferred_hour: int) -> datetime:
    """A follow-up still ahead of us today, if there is any of today left."""
    now = datetime.now(timezone.utc)
    candidate = _today_at(preferred_hour)
    if candidate > now:
        return candidate
    end_of_day = _today_at(23, 45)
    return min(now + timedelta(minutes=45), end_of_day) if end_of_day > now else end_of_day


def _earlier_today() -> datetime:
    now = datetime.now(timezone.utc)
    start = _today_at(0, 30)
    return max(start, now - timedelta(hours=2))


def build_leads() -> list[SeedLead]:
    now = datetime.now(timezone.utc)
    return [
        SeedLead(
            "Ananya Iyer", "Kestrel Wealth Partners", "+91 98200 41123", LeadStatus.PROPOSAL_SENT, 12,
            notes=[
                (11, "Discovery call. 14 advisors, ~₹1,800 Cr AUM. Reviews happen in spreadsheets "
                     "once a quarter, so clients slip through the cracks.", False),
                (6, "Ran the demo for Ananya and her ops lead. They loved the portfolio drift alerts; "
                    "asked about SEBI RIA audit trails.", False),
                (2, "Sent the Growth plan proposal with the audit-trail add-on. She will review it "
                    "with the partners and call back.", True),
            ],
            follow_up=_later_today(16),
        ),
        SeedLead(
            "Rohan Mehta", "Banyan Family Office", "+91 99300 77810", LeadStatus.QUALIFIED, 20,
            notes=[
                (19, "Intro via Kestrel. Single family office, very particular about data residency.", False),
                (4, "Shared our India data-residency note. Rohan wants a call with our CTO before "
                    "going further.", True),
            ],
            follow_up=_earlier_today(),
        ),
        SeedLead(
            "Priya Nair", "Northstar Advisors", "+91 98450 12900", LeadStatus.CONTACTED, 9,
            notes=[
                (8, "Cold outreach on LinkedIn, she replied asking for a short deck.", False),
                (5, "Sent the deck. Promised to follow up on Tuesday.", True),
            ],
            follow_up=now - timedelta(days=2, hours=3),
        ),
        SeedLead(
            "Emily Chen", "Harbor & Pine Wealth", "+65 8123 4471", LeadStatus.PROPOSAL_SENT, 16,
            notes=[
                (15, "Met at the Singapore wealth-tech meetup. Team of 30 advisors across two offices.", False),
                (7, "Second demo with their head of advice. Main concern is migrating 6 years of client notes.", False),
                (1, "Sent revised pricing with a free migration sprint. Decision expected this week.", True),
            ],
            follow_up=_later_today(11),
        ),
        SeedLead(
            "David Okafor", "Meridian Private Wealth", None, LeadStatus.NEW, 0.1,
            notes=[(0.08, "Inbound from the website demo form: \"Looking to scale personalised reviews "
                          "without hiring three more advisors.\"", False)],
        ),
        SeedLead(
            "Karthik Rao", "Indus Ridge Advisory", "+91 90080 55621", LeadStatus.QUALIFIED, 25,
            notes=[
                (24, "Webinar attendee, booked a call straight after.", False),
                (10, "Needs approval from the compliance head before a pilot.", False),
                (3, "Compliance head is on leave. Agreed to reconnect once she is back.", True),
            ],
            follow_up=now + timedelta(days=3),
        ),
        SeedLead(
            "Arjun Bose", None, "+91 98110 23457", LeadStatus.CONTACTED, 6,
            notes=[
                (5, "Independent advisor, ~120 client families. Left a voicemail.", False),
                (1, "Picked up this time. Wants to see the mobile app before committing to a demo.", True),
            ],
            follow_up=now + timedelta(days=1),
        ),
        SeedLead(
            "Sofia Alvarez", "Lumen Capital", "+971 50 118 2290", LeadStatus.WON, 45,
            notes=[
                (44, "Referral from an existing customer.", False),
                (30, "Pilot with 5 advisors went live.", False),
                (21, "Contract signed for all 18 advisors. Handed over to onboarding.", False),
            ],
        ),
        SeedLead(
            "Meera Kapoor", "Saffron Financial Planners", "+91 97690 44012", LeadStatus.LOST, 40,
            notes=[
                (39, "Discovery call. Strong fit on paper.", False),
                (18, "They decided to build in-house. Worth checking back next financial year.", False),
            ],
        ),
        SeedLead("Vikram Shah", "Polaris Wealth Desk", "+91 98670 33018", LeadStatus.NEW, 0.02),
    ]


def seed(db: Session) -> int:
    now = datetime.now(timezone.utc)
    for spec in build_leads():
        created_at = now - timedelta(days=spec.created_days_ago)
        lead = Lead(
            name=spec.name,
            company=spec.company,
            phone=spec.phone,
            status=spec.status,
            follow_up_at=spec.follow_up,
            created_at=created_at,
            updated_at=created_at,
        )
        db.add(lead)
        db.flush()
        db.add(Discussion(lead_id=lead.id, kind=DiscussionKind.SYSTEM, note="Lead added to LeadFlow",
                          created_at=created_at))
        for days_ago, note, scheduled_follow_up in spec.notes:
            db.add(Discussion(
                lead_id=lead.id,
                note=note,
                created_at=now - timedelta(days=days_ago),
                follow_up_at=spec.follow_up if scheduled_follow_up else None,
            ))
    db.commit()
    return len(build_leads())


def seed_if_empty(db: Session) -> int:
    if db.scalar(select(func.count(Lead.id))):
        return 0
    return seed(db)


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed LeadFlow with demo leads.")
    parser.add_argument("--reset", action="store_true", help="drop all data before seeding")
    args = parser.parse_args()

    if args.reset:
        Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    with SessionLocal() as db:
        created = seed(db) if args.reset else seed_if_empty(db)
    print(f"Seeded {created} leads." if created else "Database already has leads; use --reset to start over.")


if __name__ == "__main__":
    main()
