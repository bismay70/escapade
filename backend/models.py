from datetime import date
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class Preferences(BaseModel):
    model_config = ConfigDict(extra="forbid")
    travel_style: Literal["solo", "couple", "family", "friends"] = "solo"
    budget: int = Field(default=35000, ge=3000, le=1000000)
    interests: list[Literal["beaches", "nature", "culture", "adventure", "food", "wellness"]] = Field(default_factory=lambda: ["nature", "culture"], max_length=6)
    dietary: Literal["any", "vegetarian", "vegan", "halal"] = "any"
    pace: Literal["relaxed", "balanced", "packed"] = "balanced"
    hotel_type: Literal["budget", "boutique", "luxury"] = "boutique"
    transport: Literal["any", "train", "flight", "road"] = "any"
    language: Literal["English", "Hindi", "French", "Spanish", "Arabic", "German"] = "English"
    accessibility: bool = False
    origin: str = Field(default="", max_length=100)
    destination: str = Field(default="", max_length=100)
    days: int = Field(default=5, ge=1, le=30)
    travelers: int = Field(default=1, ge=1, le=20)
    departure_date: date | None = None
    return_date: date | None = None

    @field_validator("origin", "destination")
    @classmethod
    def trim(cls, value):
        return value.strip()

    @model_validator(mode="after")
    def valid_dates(self):
        if self.return_date and not self.departure_date:
            raise ValueError("Choose a departure date before a return date.")
        if self.return_date and self.return_date < self.departure_date:
            raise ValueError("Return date must follow departure date.")
        if self.departure_date and self.return_date:
            duration = (self.return_date - self.departure_date).days + 1
            if duration > 30:
                raise ValueError("The planner supports trips of up to 30 days.")
            self.days = duration
        return self


class ChatRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    message: str = Field(min_length=1, max_length=4000)

    @field_validator("message")
    @classmethod
    def non_empty(cls, value):
        if not value.strip():
            raise ValueError("Enter a message.")
        return value.strip()


class TripIntent(BaseModel):
    destination: str = Field(default="", max_length=100)
    origin: str = Field(default="", max_length=100)
    days: int | None = Field(default=None, ge=1, le=30)
    travelers: int | None = Field(default=None, ge=1, le=20)
    budget: int | None = Field(default=None, ge=3000, le=1000000)
    task: Literal["recommend", "plan", "hotels", "flights", "weather", "conversation"] = "plan"
    departure_date: date | None = None
    return_date: date | None = None


class PlanDay(BaseModel):
    day: int = Field(ge=1, le=30)
    title: str = Field(min_length=1, max_length=120)
    activities: list[str] = Field(min_length=1, max_length=6)
    meals: str = Field(max_length=500)


class TripOutline(BaseModel):
    days: list[PlanDay] = Field(min_length=1, max_length=30)


class AuthSessionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id_token: str = Field(min_length=20, max_length=20000)


class QuoteRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    offer_id: str = Field(min_length=1, max_length=100)


class DraftRequest(QuoteRequest):
    confirmed: Literal[True]
    idempotency_key: str = Field(min_length=8, max_length=100, pattern=r"^[A-Za-z0-9_-]+$")


class CheckoutRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    confirmed: Literal[True]
    success_url: str = Field(max_length=2000)
    cancel_url: str = Field(max_length=2000)


class Traveler(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str = Field(pattern=r"^[0-9]{1,2}$")
    date_of_birth: date
    first_name: str = Field(min_length=1, max_length=70, pattern=r"^[A-Za-z][A-Za-z '\-]*$")
    last_name: str = Field(min_length=1, max_length=70, pattern=r"^[A-Za-z][A-Za-z '\-]*$")
    email: str = Field(max_length=254, pattern=r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
    phone: str = Field(min_length=6, max_length=15, pattern=r"^[0-9]+$")
    country_code: str = Field(min_length=1, max_length=4, pattern=r"^[0-9]+$")


class ReservationRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    confirmed: Literal[True]
    travelers: list[Traveler] = Field(min_length=1, max_length=9)


# ── Memory & orchestration models ──────────────────────────────────────────────

class MemoryItemRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    key: str = Field(min_length=1, max_length=200)
    value: str = Field(min_length=1, max_length=2000)
    kind: Literal["fact", "preference", "decision", "note"] = "fact"
    source: Literal["user", "agent"] = "user"


class ApprovalDecisionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    decision: Literal["approve", "reject", "edit"]
    feedback: str = Field(default="", max_length=2000)


class WorkflowRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str = Field(min_length=1, max_length=200)
    kind: Literal["travel_plan", "hotel_search", "flight_search", "destination_compare", "custom"] = "travel_plan"
    payload: dict = Field(default_factory=dict)
