"""Business logic for leads and their discussion history.

Routers stay thin: they parse the request, call into here, and shape the response.
"""

from datetime import datetime, timedelta

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.database import utcnow
from app.errors import FieldError, NotFoundError
from app.models import Discussion, DiscussionKind, Lead, LeadStatus
from app.schemas import DiscussionCreate, LeadCreate, LeadOut, LeadUpdate, NotePreview

# Follow-ups a few minutes in the past are allowed, so a rep who picks
# "now" and takes a moment to type the note is not rejected.
FOLLOW_UP_GRACE = timedelta(minutes=5)


# ---------------------------------------------------------------- helpers


def _search_clause(q: str | None):
    if not q or not q.strip():
        return None
    pattern = f"%{q.strip()}%"
    return or_(Lead.name.ilike(pattern), Lead.company.ilike(pattern))


def _ensure_future(field: str, value: datetime | None) -> None:
    if value is not None and value < utcnow() - FOLLOW_UP_GRACE:
        raise FieldError(field, "Pick a follow-up time in the future")


def _note_stats(db: Session, lead_ids: list[int]) -> tuple[dict[int, Discussion], dict[int, int]]:
    """Latest rep-written note and discussion count for each lead, in two queries."""
    if not lead_ids:
        return {}, {}

    ranked = (
        select(
            Discussion.id,
            func.row_number()
            .over(
                partition_by=Discussion.lead_id,
                order_by=(Discussion.created_at.desc(), Discussion.id.desc()),
            )
            .label("rank"),
        )
        .where(Discussion.lead_id.in_(lead_ids), Discussion.kind == DiscussionKind.NOTE)
        .subquery()
    )
    latest = db.scalars(
        select(Discussion).join(ranked, ranked.c.id == Discussion.id).where(ranked.c.rank == 1)
    ).all()

    counts = db.execute(
        select(Discussion.lead_id, func.count(Discussion.id))
        .where(Discussion.lead_id.in_(lead_ids))
        .group_by(Discussion.lead_id)
    ).all()

    return {d.lead_id: d for d in latest}, {lead_id: count for lead_id, count in counts}


def to_lead_out(lead: Lead, last_note: Discussion | None, count: int) -> LeadOut:
    out = LeadOut.model_validate(lead)
    out.last_note = NotePreview.model_validate(last_note) if last_note else None
    out.discussion_count = count
    return out


def lead_out(db: Session, lead: Lead) -> LeadOut:
    latest, counts = _note_stats(db, [lead.id])
    return to_lead_out(lead, latest.get(lead.id), counts.get(lead.id, 0))


# ------------------------------------------------------------------ leads


def list_leads(
    db: Session, status: LeadStatus | None = None, q: str | None = None
) -> tuple[list[LeadOut], dict[LeadStatus, int]]:
    """Leads matching the filters, most recently active first, plus per-status counts."""
    search = _search_clause(q)

    stmt = select(Lead)
    if search is not None:
        stmt = stmt.where(search)
    if status is not None:
        stmt = stmt.where(Lead.status == status)
    leads = db.scalars(stmt).all()

    latest, counts = _note_stats(db, [lead.id for lead in leads])
    items = [to_lead_out(lead, latest.get(lead.id), counts.get(lead.id, 0)) for lead in leads]
    items.sort(key=lambda item: item.last_note.created_at if item.last_note else item.created_at, reverse=True)

    count_stmt = select(Lead.status, func.count(Lead.id)).group_by(Lead.status)
    if search is not None:
        count_stmt = count_stmt.where(search)
    status_counts = {s: 0 for s in LeadStatus}
    status_counts.update({s: n for s, n in db.execute(count_stmt).all()})

    return items, status_counts


def get_lead(db: Session, lead_id: int) -> Lead:
    lead = db.get(Lead, lead_id)
    if lead is None:
        raise NotFoundError("Lead", lead_id)
    return lead


def create_lead(db: Session, data: LeadCreate) -> Lead:
    lead = Lead(**data.model_dump())
    db.add(lead)
    db.flush()
    db.add(Discussion(lead_id=lead.id, kind=DiscussionKind.SYSTEM, note="Lead added to LeadFlow"))
    db.commit()
    db.refresh(lead)
    return lead


def update_lead(db: Session, lead_id: int, data: LeadUpdate) -> Lead:
    lead = get_lead(db, lead_id)
    changes = data.model_dump(exclude_unset=True)

    if "follow_up_at" in changes:
        _ensure_future("follow_up_at", changes["follow_up_at"])

    new_status = changes.pop("status", None)
    if new_status is not None and new_status != lead.status:
        db.add(
            Discussion(
                lead_id=lead.id,
                kind=DiscussionKind.SYSTEM,
                note=f"Status changed from {lead.status.label} to {new_status.label}",
            )
        )
        lead.status = new_status

    for field, value in changes.items():
        setattr(lead, field, value)

    db.commit()
    db.refresh(lead)
    return lead


def delete_lead(db: Session, lead_id: int) -> None:
    lead = get_lead(db, lead_id)
    db.delete(lead)
    db.commit()


# ------------------------------------------------------------ discussions


def list_discussions(db: Session, lead_id: int) -> list[Discussion]:
    get_lead(db, lead_id)
    return list(
        db.scalars(
            select(Discussion)
            .where(Discussion.lead_id == lead_id)
            .order_by(Discussion.created_at.desc(), Discussion.id.desc())
        )
    )


def add_discussion(db: Session, lead_id: int, data: DiscussionCreate) -> tuple[Discussion, Lead]:
    """Log a discussion. A follow-up on the note becomes the lead's next follow-up;
    a note without one leaves the existing follow-up untouched."""
    lead = get_lead(db, lead_id)
    _ensure_future("follow_up_at", data.follow_up_at)

    discussion = Discussion(lead_id=lead.id, note=data.note, follow_up_at=data.follow_up_at)
    db.add(discussion)
    if data.follow_up_at is not None:
        lead.follow_up_at = data.follow_up_at
    lead.updated_at = utcnow()

    db.commit()
    db.refresh(discussion)
    db.refresh(lead)
    return discussion, lead
