import asyncio
import logging
import uuid
from app.db.session import engine, AsyncSessionLocal
from app.db.base import Base
from app.models.user import User, UserRole, UserStatus
from app.models.photographer import PhotographerProfile, PortfolioItem
from app.models.booking import Booking

# Import other models to ensure they are registered
from app.models.availability import Availability
from app.models.message import Message

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def seed_data():
    logger.info("Initializing SQLite database tables...")
    
    async with engine.begin() as conn:
        # Create all tables defined in metadata
        await conn.run_sync(Base.metadata.create_all)
    
    async with AsyncSessionLocal() as session:
        logger.info("Checking for existing data...")
        
        # 1. Create a Photographer User
        pro_user = User(
            id=uuid.uuid4(),
            email="ahmed@example.com",
            full_name="Ahmed Al Mansoori",
            role=UserRole.photographer,
            status=UserStatus.active,
            profile_picture_url="https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=200&auto=format&fit=crop"
        )
        
        # 2. Create a Client User
        client_user = User(
            id=uuid.uuid4(),
            email="client@example.com",
            full_name="Fatima Rashid",
            role=UserRole.client,
            status=UserStatus.active
        )
        
        session.add_all([pro_user, client_user])
        await session.flush() # Get IDs

        # 3. Create Photographer Profile
        pro_profile = PhotographerProfile(
            user_id=pro_user.id,
            description="Capturing the soul of the UAE through my lens. Specialist in Wedding and Event photography with 10+ years of local experience.",
            price_per_day=2500.0,
            location="Dubai Marina",
            years_of_experience=10,
            verified=True,
            rating=4.9,
            specializations="Wedding,Portrait,Event",
            is_featured=True
        )
        
        session.add(pro_profile)
        await session.flush()

        # 4. Add Portfolio Items
        portfolio = [
            PortfolioItem(
                photographer_id=pro_profile.id,
                media_url="https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=800&auto=format&fit=crop",
                media_type="image",
                category="Wedding"
            ),
            PortfolioItem(
                photographer_id=pro_profile.id,
                media_url="https://images.unsplash.com/photo-1492724441997-5dc865305da7?q=80&w=800&auto=format&fit=crop",
                media_type="image",
                category="Portrait"
            )
        ]
        session.add_all(portfolio)
        
        await session.commit()
        logger.info("Seed completed successfully! 🚀")

if __name__ == "__main__":
    asyncio.run(seed_data())
