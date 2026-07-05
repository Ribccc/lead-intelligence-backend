import asyncio
from sqlalchemy import select
from app.core.database import engine
from app.models.user import User
from app.core.security import verify_password
import bcrypt

async def check_hash():
    async with engine.connect() as conn:
        result = await conn.execute(select(User).where(User.email == "admin@deuglo.ai"))
        row = result.first()
        if not row:
            print("Admin user not found in database!")
            return
        
        print(f"Row data: {row}")
        email = row[1]
        password_hash = row[2]
        print(f"User email: {email}")
        print(f"Stored password hash: {password_hash}")
        
        pw_admin = "Admin@2024!"
        pw_pass123 = "password123"
        
        # Verify using our verify_password
        ok_admin_custom = verify_password(pw_admin, password_hash)
        ok_pass123_custom = verify_password(pw_pass123, password_hash)
        
        # Verify using direct bcrypt
        h_bytes = password_hash.encode('utf-8')
        ok_admin_direct = bcrypt.checkpw(pw_admin.encode('utf-8'), h_bytes)
        ok_pass123_direct = bcrypt.checkpw(pw_pass123.encode('utf-8'), h_bytes)
        
        print("\nVerification Results:")
        print(f"Against '{pw_admin}':")
        print(f"  - Custom verify_password: {ok_admin_custom}")
        print(f"  - Direct bcrypt.checkpw: {ok_admin_direct}")
        print(f"Against '{pw_pass123}':")
        print(f"  - Custom verify_password: {ok_pass123_custom}")
        print(f"  - Direct bcrypt.checkpw: {ok_pass123_direct}")

if __name__ == "__main__":
    asyncio.run(check_hash())
