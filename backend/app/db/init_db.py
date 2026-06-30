"""Run: python -m app.db.init_db"""
import asyncio
from app.db.database import engine, Base

async def init():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("✅ All tables created successfully.")

if __name__ == "__main__":
    asyncio.run(init())
