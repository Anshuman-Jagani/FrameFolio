import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class MessageCreate(BaseModel):
    receiver_id: uuid.UUID
    message: str

class MessageRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    sender_id: uuid.UUID
    receiver_id: uuid.UUID
    message: str
    timestamp: datetime

class ChatOverview(BaseModel):
    other_user_id: uuid.UUID
    last_message: str
    timestamp: datetime
