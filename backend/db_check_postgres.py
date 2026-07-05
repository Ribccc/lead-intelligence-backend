import asyncio
import os
import sys
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

# Add backend directory to path so app can be imported properly
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from app.core.config import settings

async def main():
    # Make sure we use the localhost address in local diagnostic run
    db_url = settings.DATABASE_URL
    if "@postgres:" in db_url:
        db_url = db_url.replace("@postgres:", "@localhost:")
    
    print(f"Connecting to Postgres at: {db_url}")
    
    engine = create_async_engine(
        db_url,
        future=True,
    )
    
    try:
        async with engine.connect() as conn:
            print("Successfully connected to Postgres!")
            
            # Query total leads
            res_total = await conn.execute(text("SELECT COUNT(*) FROM leads;"))
            total_leads = res_total.scalar()
            print(f"Total leads: {total_leads}")
            
            # Query leads by status
            res_group = await conn.execute(text("SELECT status, COUNT(*) FROM leads GROUP BY status ORDER BY count DESC;"))
            print("Leads by status:")
            for row in res_group.all():
                print(f"  {row[0]}: {row[1]}")
                
            # Let's inspect where the 70 new company profiles went
            # Discovered leads have discovery_source = 'YC companies' or similar, or let's check unique discovery_sources
            res_sources = await conn.execute(text("SELECT discovery_source, COUNT(*) FROM leads GROUP BY discovery_source;"))
            print("\nLeads by discovery source:")
            for row in res_sources.all():
                print(f"  {row[0]}: {row[1]}")
                
            # Audit the exact lifecycle of the 70 companies
            # Let's select companies from the discovery run (where discovery_source = 'YC companies' or created recently)
            # Find the most recent ingestion of 70 leads
            res_recent = await conn.execute(text(
                "SELECT id, company_name, status, created_at, updated_at "
                "FROM leads "
                "WHERE discovery_source = 'YC companies' "
                "ORDER BY created_at DESC;"
            ))
            recent_leads = res_recent.all()
            print(f"\nNumber of 'YC companies' source records found: {len(recent_leads)}")
            
            if recent_leads:
                # 1. Total records inserted
                print(f"1. How many records were inserted: {len(recent_leads)}")
                
                # 2. Initial status: Let's check how the discovery engine initializes them (it initializes status='DISCOVERED')
                print("2. Their initial status: DISCOVERED")
                
                # 3/4. Current status count grouped by status
                status_counts = {}
                for l in recent_leads:
                    status_counts[l[2]] = status_counts.get(l[2], 0) + 1
                
                print("3. Their current status counts:")
                for status, count in status_counts.items():
                    print(f"  {status}: {count}")
                
                print("\n4. Count grouped by status (requested list):")
                for status in ["DISCOVERED", "ENRICHED", "QUALIFIED", "NURTURE"]:
                    print(f"  {status}: {status_counts.get(status, 0)}")
                    
                # Let's list a few examples to show as evidence
                print("\nSample records for proof:")
                for l in recent_leads[:5]:
                    print(f"  ID: {l[0]} | Name: {l[1]} | Status: {l[2]} | Created: {l[3]} | Updated: {l[4]}")
            else:
                print("No leads with discovery_source = 'YC companies' found.")
                
    except Exception as e:
        print(f"Error: {e}")
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(main())
