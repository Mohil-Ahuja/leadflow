from datetime import datetime

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field, field_validator, model_validator

from app.models import DiscussionKind, LeadStatus


class _LeadFields(BaseModel):
    """Shared input cleaning: names are trimmed, blank optional fields become None."""

    @field_validator("name", mode="before", check_fields=False)
    @classmethod
    def _strip_name(cls, value: object) -> object:
        return value.strip() if isinstance(value, str) else value

    @field_validator("company", "phone", mode="before", check_fields=False)
    @classmethod
    def _blank_to_none(cls, value: object) -> object:
        if isinstance(value, str):
            return value.strip() or None
        return value


class LeadCreate(_LeadFields):
    name: str = Field(min_length=1, max_length=120)
    company: str | None = Field(default=None, max_length=120)
    phone: str | None = Field(default=None, max_length=40)
    status: LeadStatus = LeadStatus.NEW


class LeadUpdate(_LeadFields):
    """Partial update. Only fields present in the request body are applied;
    sending `"follow_up_at": null` explicitly clears the follow-up."""

    name: str | None = Field(default=None, min_length=1, max_length=120)
    company: str | None = Field(default=None, max_length=120)
    phone: str | None = Field(default=None, max_length=40)
    status: LeadStatus | None = None
    follow_up_at: AwareDatetime | None = None

    @model_validator(mode="after")
    def _reject_null_required(self) -> "LeadUpdate":
        for field in ("name", "status"):
            if field in self.model_fields_set and getattr(self, field) is None:
                raise ValueError(f"{field} cannot be null")
        return self


class NotePreview(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    note: str
    created_at: datetime


class LeadOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    company: str | None
    phone: str | None
    status: LeadStatus
    follow_up_at: datetime | None
    created_at: datetime
    updated_at: datetime
    last_note: NotePreview | None = None
    discussion_count: int = 0


class LeadList(BaseModel):
    items: list[LeadOut]
    total: int
    # Counts per status for the current search, ignoring the status filter,
    # so the pipeline bar can show how many leads sit in each stage.
    status_counts: dict[LeadStatus, int]


class DiscussionCreate(BaseModel):
    note: str = Field(min_length=1, max_length=5000)
    follow_up_at: AwareDatetime | None = None

    @field_validator("note", mode="before")
    @classmethod
    def _strip_note(cls, value: object) -> object:
        return value.strip() if isinstance(value, str) else value


class DiscussionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    lead_id: int
    note: str
    kind: DiscussionKind
    follow_up_at: datetime | None
    created_at: datetime


class DiscussionCreated(BaseModel):
    """Returned after logging a discussion: the new entry plus the lead as it
    now stands, so the client can update the list without a second request."""

    discussion: DiscussionOut
    lead: LeadOut


class ErrorBody(BaseModel):
    code: str
    message: str
    details: list[dict] | None = None


class ErrorResponse(BaseModel):
    error: ErrorBody
