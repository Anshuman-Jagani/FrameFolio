import uuid
from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, model_validator


class AvailabilityBase(BaseModel):
    date: date
    is_booked: bool = False


class AvailabilityCreate(BaseModel):
    dates: List[date]
    is_booked: bool = False

    @model_validator(mode='after')
    def check_dates_not_in_past(self) -> 'AvailabilityCreate':
        from datetime import date as dt_date
        today = dt_date.today()
        for d in self.dates:
            if d < today:
                raise ValueError(f"Date {d} cannot be in the past")
        return self

class AvailabilityUpdate(BaseModel):
    is_booked: bool


class AvailabilityRead(AvailabilityBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    photographer_id: uuid.UUID
    created_at: datetime
