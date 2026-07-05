import asyncio
from app.core.config import settings
from app.core.database import engine
from sqlmodel import select
from app.models.lead import Lead

async def main():
    print(f"DATABASE_URL in settings: {settings.DATABASE_URL}")
    try:
        async with engine.connect() as conn:
            print("Successfully connected to the database!")
            
            # Query leads
            result = await conn.execute(select(Lead))
            leads = result.scalars().all()
            print(f"Total leads in database: {len(leads)}")
            
            # Count by status
            status_counts = {}
            for l in leads:
                status_counts[l.status] = status_counts.get(l.status, 0) + 1
            print("Leads grouped by status:")
            for status, count in status_counts.items():
                print(f"  {status}: {count}")
                
            # Audit details for the most recent 75 leads
            leads_sorted = sorted(leads, key=lambda l: l.created_at, reverse=True)
            print("\nRecent 10 leads:")
            for l in leads_sorted[:10]:
                print(f"  ID: {l.id} | Name: {l.company_name} | Status: {l.status} | Created At: {l.created_at}")
    except Exception as e:
        print(f"Database operation failed: {e}")

if __name__ == "__main__":
    asyncio.run(main())
