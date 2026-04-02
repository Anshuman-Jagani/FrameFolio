import uuid
from fastapi import APIRouter

from app.api.deps import DBSession, CurrentUser
from app.schemas.message import MessageCreate, MessageRead, ChatOverview
from app.services.message_service import MessageService

router = APIRouter()

@router.get("/chats", response_model=list[ChatOverview], summary="Get all chats for a user")
async def get_user_chats(db: DBSession, current_user: CurrentUser):
    service = MessageService(db)
    return await service.get_user_chats(current_user)

@router.post("", response_model=MessageRead, status_code=201, summary="Send a direct message")
async def send_message(
    data: MessageCreate, db: DBSession, current_user: CurrentUser
):
    service = MessageService(db)
    return await service.send_message(current_user, data)

@router.get("/conversation/{other_user_id}", response_model=list[MessageRead], summary="Get direct message conversation")
async def get_conversation(
    other_user_id: uuid.UUID, db: DBSession, current_user: CurrentUser
):
    service = MessageService(db)
    return await service.get_conversation(current_user, other_user_id)
