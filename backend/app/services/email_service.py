import smtplib
import asyncio
from email.message import EmailMessage
import logging
from typing import Optional

from app.core.config import settings

logger = logging.getLogger(__name__)

class EmailService:
    @staticmethod
    def _send_email_sync(to_email: str, subject: str, html_content: str):
        if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
            logger.warning("SMTP credentials not set. Mocking email send.")
            logger.info(f"MOCK EMAIL to {to_email}: {subject}")
            return
            
        msg = EmailMessage()
        msg["Subject"] = subject
        msg["From"] = f"{settings.EMAILS_FROM_NAME} <{settings.EMAILS_FROM_EMAIL}>"
        msg["To"] = to_email
        msg.set_content("Please enable HTML to view this email.")
        msg.add_alternative(html_content, subtype="html")

        try:
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
                server.starttls()
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.send_message(msg)
                logger.info(f"Successfully sent email to {to_email}")
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {e}")

    @classmethod
    async def send_email(cls, to_email: str, subject: str, html_content: str):
        await asyncio.to_thread(cls._send_email_sync, to_email, subject, html_content)
        
    @classmethod
    async def send_booking_request_email(cls, photographer_email: str, client_name: str, date: str):
        subject = f"New Booking Request from {client_name}"
        html = f"""
        <h3>You have a new booking request!</h3>
        <p><strong>{client_name}</strong> has just requested to book you on <strong>{date}</strong>.</p>
        <p>Please log in to your FrameFolio dashboard to review and accept or reject the booking.</p>
        """
        await cls.send_email(photographer_email, subject, html)

    @classmethod
    async def send_booking_accepted_email(cls, client_email: str, photographer_name: str, date: str):
        subject = f"Your Booking on {date} has been Accepted!"
        html = f"""
        <h3>Great news!</h3>
        <p>Your booking request for <strong>{date}</strong> has been officially accepted by <strong>{photographer_name}</strong>.</p>
        <p>You can view the full details in your FrameFolio dashboard.</p>
        """
        await cls.send_email(client_email, subject, html)

    @classmethod
    async def send_booking_completed_email(cls, client_email: str, photographer_name: str):
        subject = f"How was your session with {photographer_name}?"
        html = f"""
        <h3>Your session is marked as completed!</h3>
        <p>We hope you had a fantastic experience with <strong>{photographer_name}</strong>.</p>
        <p>Please log in to FrameFolio to leave a review and finalize the booking!</p>
        """
        await cls.send_email(client_email, subject, html)
