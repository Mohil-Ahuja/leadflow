from typing import Annotated

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app import services
from app.database import get_db
from app.models import LeadStatus
from app.schemas import (
    DiscussionCreate,
    DiscussionCreated,
    DiscussionOut,
    ErrorResponse,
    LeadCreate,
    LeadList,
    LeadOut,
    LeadUpdate,
)

router = APIRouter(prefix="/api/leads", tags=["leads"])

DB = Annotated[Session, Depends(get_db)]
NOT_FOUND = {404: {"model": ErrorResponse, "description": "Lead not found"}}
INVALID = {422: {"model": ErrorResponse, "description": "Invalid input"}}


@router.get("", response_model=LeadList, summary="List leads")
def list_leads(
    db: DB,
    status_filter: Annotated[LeadStatus | None, Query(alias="status")] = None,
    q: Annotated[str | None, Query(max_length=120, description="Search by name or company")] = None,
) -> LeadList:
    items, counts = services.list_leads(db, status=status_filter, q=q)
    return LeadList(items=items, total=len(items), status_counts=counts)


@router.post(
    "", response_model=LeadOut, status_code=status.HTTP_201_CREATED, responses=INVALID, summary="Add a lead"
)
def create_lead(payload: LeadCreate, db: DB, response: Response) -> LeadOut:
    lead = services.create_lead(db, payload)
    response.headers["Location"] = f"/api/leads/{lead.id}"
    return services.lead_out(db, lead)


@router.get("/{lead_id}", response_model=LeadOut, responses=NOT_FOUND, summary="Get a lead")
def get_lead(lead_id: int, db: DB) -> LeadOut:
    return services.lead_out(db, services.get_lead(db, lead_id))


@router.patch(
    "/{lead_id}", response_model=LeadOut, responses={**NOT_FOUND, **INVALID}, summary="Update a lead"
)
def update_lead(lead_id: int, payload: LeadUpdate, db: DB) -> LeadOut:
    return services.lead_out(db, services.update_lead(db, lead_id, payload))


@router.delete(
    "/{lead_id}", status_code=status.HTTP_204_NO_CONTENT, responses=NOT_FOUND, summary="Delete a lead"
)
def delete_lead(lead_id: int, db: DB) -> Response:
    services.delete_lead(db, lead_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get(
    "/{lead_id}/discussions",
    response_model=list[DiscussionOut],
    responses=NOT_FOUND,
    summary="Discussion history, newest first",
)
def list_discussions(lead_id: int, db: DB) -> list[DiscussionOut]:
    return [DiscussionOut.model_validate(d) for d in services.list_discussions(db, lead_id)]


@router.post(
    "/{lead_id}/discussions",
    response_model=DiscussionCreated,
    status_code=status.HTTP_201_CREATED,
    responses={**NOT_FOUND, **INVALID},
    summary="Log a discussion",
)
def add_discussion(lead_id: int, payload: DiscussionCreate, db: DB) -> DiscussionCreated:
    discussion, lead = services.add_discussion(db, lead_id, payload)
    return DiscussionCreated(discussion=DiscussionOut.model_validate(discussion), lead=services.lead_out(db, lead))
