import smtplib
import asyncio
from email.message import EmailMessage
import logging
from datetime import datetime
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
    def _wrap_html(cls, title: str, body: str) -> str:
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body {{ 
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                    line-height: 1.7; 
                    color: #1f2937; 
                    background-color: #f9fafb;
                    margin: 0; 
                    padding: 40px 10px; 
                }}
                .container {{
                    max-width: 600px; 
                    margin: 0 auto; 
                    background-color: #ffffff;
                    border-radius: 16px;
                    overflow: hidden;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
                }}
                .header {{ 
                    background: linear-gradient(135deg, #111827 0%, #374151 100%); 
                    padding: 40px 20px; 
                    text-align: center; 
                }}
                .header h2 {{ 
                    color: #ffffff; 
                    margin: 0; 
                    font-weight: 700; 
                    letter-spacing: -0.025em;
                    text-transform: uppercase;
                    font-size: 24px;
                }}
                .content {{ 
                    padding: 40px; 
                }}
                .content h3 {{
                    color: #111827;
                    font-size: 20px;
                    margin-top: 0;
                    margin-bottom: 24px;
                }}
                .footer {{ 
                    padding: 30px;
                    background-color: #f3f4f6;
                    font-size: 13px; 
                    color: #6b7280; 
                    text-align: center; 
                }}
                .button {{
                    display: inline-block;
                    background-color: #111827;
                    color: #ffffff;
                    padding: 12px 24px;
                    border-radius: 8px;
                    text-decoration: none;
                    font-weight: 600;
                    margin-top: 24px;
                }}
                p {{ margin-bottom: 16px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2>FrameFolio UAE</h2>
                </div>
                <div class="content">
                    <h3>{title}</h3>
                    {body}
                </div>
                <div class="footer">
                    &copy; {datetime.now().year} FrameFolio UAE.<br>
                    The Premium Choice for Professional Photographers.<br>
                    UAE's Leading Photography Marketplace.
                </div>
            </div>
        </body>
        </html>
        """

    @classmethod
    async def send_booking_request_email(cls, photographer_email: str, client_name: str, date: str):
        subject = f"New Booking Request from {client_name}"
        body = f"""
        <p><strong>{client_name}</strong> has just requested to book you on <strong>{date}</strong>.</p>
        <p>Please log in to your FrameFolio dashboard to review and accept or reject the booking.</p>
        """
        html = cls._wrap_html("You have a new booking request!", body)
        await cls.send_email(photographer_email, subject, html)

    @classmethod
    async def send_booking_accepted_email(cls, client_email: str, photographer_name: str, date: str):
        subject = f"Your Booking on {date} has been Accepted!"
        body = f"""
        <p>Great news! Your booking request for <strong>{date}</strong> has been officially accepted by <strong>{photographer_name}</strong>.</p>
        <p>You can view the full details in your FrameFolio dashboard.</p>
        """
        html = cls._wrap_html("Booking Confirmed!", body)
        await cls.send_email(client_email, subject, html)

    @classmethod
    async def send_booking_completed_email(cls, client_email: str, photographer_name: str):
        subject = f"How was your session with {photographer_name}?"
        body = f"""
        <p>We hope you had a fantastic experience with <strong>{photographer_name}</strong>.</p>
        <p>Please log in to FrameFolio to leave a review and finalize the booking!</p>
        """
        html = cls._wrap_html("Session Completed!", body)
        await cls.send_email(client_email, subject, html)
