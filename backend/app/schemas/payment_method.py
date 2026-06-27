from datetime import datetime

from pydantic import BaseModel, Field


class PaymentMethodCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)


class PaymentMethodUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=100)


class PaymentMethodResponse(BaseModel):
    id: int
    user_id: int
    name: str
    created_at: datetime

    model_config = {"from_attributes": True}


class PaymentMethodBrief(BaseModel):
    id: int
    name: str

    model_config = {"from_attributes": True}
