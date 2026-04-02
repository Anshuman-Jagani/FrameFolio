import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_

from app.core.exceptions import NotFoundException
from app.models.message import Message
from app.models.user import User
from app.schemas.message import MessageCreate

class MessageService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def send_message(self, sender: User, data: MessageCreate) -> Message:
        # Validate receiver exists
        result = await self.db.execute(select(User).where(User.id == data.receiver_id))
        receiver = result.scalar_one_or_none()
        if not receiver:
            raise NotFoundException("Receiver user")

        message = Message(
            sender_id=sender.id,
            receiver_id=data.receiver_id,
            message=data.message
        )
        self.db.add(message)
        await self.db.flush()
        await self.db.refresh(message)
        return message

    async def get_conversation(self, current_user: User, other_user_id: uuid.UUID) -> list[Message]:
        query = select(Message).where(
            or_(
                and_(Message.sender_id == current_user.id, Message.receiver_id == other_user_id),
                and_(Message.sender_id == other_user_id, Message.receiver_id == current_user.id)
            )
        ).order_by(Message.timestamp.asc())

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_user_chats(self, current_user: User) -> list[dict]:
        query = select(Message).where(
            or_(Message.sender_id == current_user.id, Message.receiver_id == current_user.id)
        ).order_by(Message.timestamp.desc())

        result = await self.db.execute(query)
        messages = result.scalars().all()

        chats = []
        seen = set()
        for msg in messages:
            other_user_id = msg.receiver_id if msg.sender_id == current_user.id else msg.sender_id
            if other_user_id not in seen:
                seen.add(other_user_id)
                chats.append({
                    "other_user_id": other_user_id,
                    "last_message": msg.message,
                    "timestamp": msg.timestamp
                })
        return chats
