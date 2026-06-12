"""Quick DB sanity check — run once to verify all tables create correctly."""
import asyncio
import sys
sys.path.insert(0, ".")
import sqlalchemy as sa
from server import Base, engine, UserRow


async def main():
    # Create all tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("OK: All tables created")

    # List tables
    async with engine.connect() as conn:
        q = sa.text("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
        result = await conn.execute(q)
        tables = [r[0] for r in result]

    print("Tables in farmdirect.db:")
    for t in tables:
        print("  -", t)

    # Insert + read a test user
    from server import AsyncSessionLocal, new_id, now_str, hash_password
    async with AsyncSessionLocal() as session:
        user = UserRow(
            id=new_id(),
            name="Test User",
            email="sanitycheck@farmdirect.in",
            mobile="8888888888",
            password_hash=hash_password("pass123"),
            user_type="consumer",
            created_at=now_str(),
        )
        session.add(user)
        await session.commit()
        uid = user.id
        print("OK: Inserted test user id=" + uid)

        result = await session.execute(
            sa.select(UserRow).where(UserRow.id == uid)
        )
        fetched = result.scalar_one()
        print("OK: Fetched back name=" + fetched.name + ", email=" + fetched.email)

        # Cleanup
        await session.delete(fetched)
        await session.commit()
        print("OK: Cleanup done")

    print("\nSQLite backend DB check PASSED")


asyncio.run(main())
