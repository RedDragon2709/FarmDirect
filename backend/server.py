"""
FarmDirect API — full SQLite (SQLAlchemy async) backend.
All data: users, sessions, products, orders, reviews, saved_products, notification_prefs.
"""

from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timedelta
import bcrypt
import os
import secrets
import re
import uuid
from collections import defaultdict

# ── SQLAlchemy (SQLite) ───────────────────────────────────────────────────────
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy import (
    String, Integer, Float, Text, DateTime, Boolean,
    select, delete, func, ForeignKey
)
import sqlalchemy as sa

SQLITE_URL = os.environ.get("DATABASE_URL", "sqlite+aiosqlite:///./farmdirect.db")
engine = create_async_engine(SQLITE_URL, echo=False)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)


# ── ORM Models ────────────────────────────────────────────────────────────────

class Base(DeclarativeBase):
    pass


class UserRow(Base):
    __tablename__ = "users"
    id: Mapped[str]          = mapped_column(String(36), primary_key=True)  # uuid
    name: Mapped[str]        = mapped_column(String(200))
    email: Mapped[str]       = mapped_column(String(200), unique=True, index=True)
    mobile: Mapped[str]      = mapped_column(String(20),  unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(200))
    user_type: Mapped[str]   = mapped_column(String(20))   # "farmer" | "consumer"
    # Farmer-specific
    farm_name: Mapped[str]   = mapped_column(String(200), default="")
    farm_location: Mapped[str] = mapped_column(String(300), default="")
    farm_type: Mapped[str]   = mapped_column(String(100), default="")
    farm_size: Mapped[str]   = mapped_column(String(100), default="")
    # Consumer-specific (JSON-encoded list of addresses)
    addresses_json: Mapped[str] = mapped_column(Text, default="[]")
    created_at: Mapped[str]  = mapped_column(String(32))


class SessionRow(Base):
    __tablename__ = "sessions"
    id: Mapped[int]          = mapped_column(Integer, primary_key=True, autoincrement=True)
    token: Mapped[str]       = mapped_column(String(64), unique=True, index=True)
    user_id: Mapped[str]     = mapped_column(String(36), index=True)
    created_at: Mapped[str]  = mapped_column(String(32))


class ProductRow(Base):
    __tablename__ = "products"
    id: Mapped[str]          = mapped_column(String(36), primary_key=True)  # uuid
    farmer_id: Mapped[str]   = mapped_column(String(36), index=True)
    farmer_name: Mapped[str] = mapped_column(String(200))
    name: Mapped[str]        = mapped_column(String(200), index=True)
    category: Mapped[str]    = mapped_column(String(50),  index=True)
    price: Mapped[float]     = mapped_column(Float)
    stock: Mapped[int]       = mapped_column(Integer)
    unit: Mapped[str]        = mapped_column(String(50))
    description: Mapped[str] = mapped_column(Text, default="")
    image_base64: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[str]  = mapped_column(String(32))


class OrderRow(Base):
    __tablename__ = "orders"
    id: Mapped[str]            = mapped_column(String(36), primary_key=True)  # uuid
    consumer_id: Mapped[str]   = mapped_column(String(36), index=True)
    consumer_name: Mapped[str] = mapped_column(String(200))
    farmer_id: Mapped[str]     = mapped_column(String(36), index=True)
    product_id: Mapped[str]    = mapped_column(String(36), index=True)
    product_name: Mapped[str]  = mapped_column(String(200))
    quantity: Mapped[int]      = mapped_column(Integer)
    price: Mapped[float]       = mapped_column(Float)
    total: Mapped[float]       = mapped_column(Float)
    delivery_address: Mapped[str] = mapped_column(Text)
    status: Mapped[str]        = mapped_column(String(30), default="placed")
    payment_method: Mapped[str] = mapped_column(String(20), default="COD")
    payment_status: Mapped[str] = mapped_column(String(20), default="pending")
    transaction_id: Mapped[str] = mapped_column(String(100), default="")
    created_at: Mapped[str]    = mapped_column(String(32))


class ReviewRow(Base):
    __tablename__ = "reviews"
    id: Mapped[int]            = mapped_column(Integer, primary_key=True, autoincrement=True)
    order_id: Mapped[str]      = mapped_column(String(36), unique=True, index=True)
    product_id: Mapped[str]    = mapped_column(String(36), index=True)
    consumer_id: Mapped[str]   = mapped_column(String(36), index=True)
    consumer_name: Mapped[str] = mapped_column(String(200))
    rating: Mapped[int]        = mapped_column(Integer)
    comment: Mapped[str]       = mapped_column(Text, default="")
    created_at: Mapped[str]    = mapped_column(String(32))


class SavedProductRow(Base):
    __tablename__ = "saved_products"
    id: Mapped[int]            = mapped_column(Integer, primary_key=True, autoincrement=True)
    consumer_id: Mapped[str]   = mapped_column(String(36), index=True)
    product_id: Mapped[str]    = mapped_column(String(36))
    product_name: Mapped[str]  = mapped_column(String(200))
    price: Mapped[float]       = mapped_column(Float)
    unit: Mapped[str]          = mapped_column(String(32))
    farmer_name: Mapped[str]   = mapped_column(String(200))
    image_base64: Mapped[str]  = mapped_column(Text, default="")
    saved_at: Mapped[str]      = mapped_column(String(32))


class NotificationPrefRow(Base):
    __tablename__ = "notification_prefs"
    id: Mapped[int]            = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str]       = mapped_column(String(36), unique=True, index=True)
    order_updates: Mapped[bool] = mapped_column(Boolean, default=True)
    promotions: Mapped[bool]   = mapped_column(Boolean, default=True)
    new_produce: Mapped[bool]  = mapped_column(Boolean, default=True)
    price_alerts: Mapped[bool] = mapped_column(Boolean, default=False)


# ── App + Lifecycle ───────────────────────────────────────────────────────────

app = FastAPI(title="FarmDirect API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session


security = HTTPBearer()


# ── Pydantic Models ───────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    name: str
    email: str
    mobile: str
    password: str
    user_type: str   # "farmer" | "consumer"

class LoginRequest(BaseModel):
    identifier: str  # email OR mobile
    password: str

class ProductCreate(BaseModel):
    name: str
    category: str
    price: float
    stock: int
    unit: str
    description: Optional[str] = ""
    image_base64: Optional[str] = ""

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    price: Optional[float] = None
    stock: Optional[int] = None
    unit: Optional[str] = None
    description: Optional[str] = None
    image_base64: Optional[str] = None

class OrderCreate(BaseModel):
    product_id: str
    quantity: int
    delivery_address: str
    payment_method: Optional[str] = "COD"
    payment_status: Optional[str] = "pending"
    transaction_id: Optional[str] = None

class OrderStatusUpdate(BaseModel):
    status: str

class ProfileUpdate(BaseModel):
    farm_name: Optional[str] = None
    farm_location: Optional[str] = None
    farm_type: Optional[str] = None
    farm_size: Optional[str] = None
    addresses: Optional[List[str]] = None

class ReviewCreate(BaseModel):
    order_id: str
    product_id: str
    rating: int
    comment: Optional[str] = ""

class SavedProductToggle(BaseModel):
    product_id: str
    product_name: str
    price: float
    unit: str
    farmer_name: str
    image_base64: Optional[str] = ""

class NotifPrefsUpdate(BaseModel):
    order_updates: Optional[bool] = None
    promotions: Optional[bool] = None
    new_produce: Optional[bool] = None
    price_alerts: Optional[bool] = None


# ── Helpers ───────────────────────────────────────────────────────────────────

import json

def new_id() -> str:
    return str(uuid.uuid4())

def now_str() -> str:
    return datetime.utcnow().isoformat()

def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))

def generate_token() -> str:
    return secrets.token_hex(32)

def user_to_dict(u: UserRow) -> dict:
    try:
        addresses = json.loads(u.addresses_json or "[]")
    except Exception:
        addresses = []
    return {
        "id": u.id,
        "name": u.name,
        "email": u.email,
        "mobile": u.mobile,
        "user_type": u.user_type,
        "farm_name": u.farm_name,
        "farm_location": u.farm_location,
        "farm_type": u.farm_type,
        "farm_size": u.farm_size,
        "addresses": addresses,
        "created_at": u.created_at,
    }

def product_to_dict(p: ProductRow) -> dict:
    return {
        "id": p.id,
        "farmer_id": p.farmer_id,
        "farmer_name": p.farmer_name,
        "name": p.name,
        "category": p.category,
        "price": p.price,
        "stock": p.stock,
        "unit": p.unit,
        "description": p.description,
        "image_base64": p.image_base64,
        "created_at": p.created_at,
    }

def order_to_dict(o: OrderRow) -> dict:
    return {
        "id": o.id,
        "consumer_id": o.consumer_id,
        "consumer_name": o.consumer_name,
        "farmer_id": o.farmer_id,
        "product_id": o.product_id,
        "product_name": o.product_name,
        "quantity": o.quantity,
        "price": o.price,
        "total": o.total,
        "delivery_address": o.delivery_address,
        "status": o.status,
        "payment_method": o.payment_method,
        "payment_status": o.payment_status,
        "transaction_id": o.transaction_id,
        "created_at": o.created_at,
    }

def review_to_dict(r: ReviewRow) -> dict:
    return {
        "id": r.id,
        "order_id": r.order_id,
        "product_id": r.product_id,
        "consumer_id": r.consumer_id,
        "consumer_name": r.consumer_name,
        "rating": r.rating,
        "comment": r.comment,
        "created_at": r.created_at,
    }


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    sql: AsyncSession = Depends(get_db)
) -> UserRow:
    token = credentials.credentials
    result = await sql.execute(select(SessionRow).where(SessionRow.token == token))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    result2 = await sql.execute(select(UserRow).where(UserRow.id == session.user_id))
    user = result2.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


# ── Auth ──────────────────────────────────────────────────────────────────────

@app.post("/api/auth/register")
async def register(body: RegisterRequest, sql: AsyncSession = Depends(get_db)):
    if "@" not in body.email:
        raise HTTPException(status_code=400, detail="Invalid email address")
    if not re.fullmatch(r"\d{10}", body.mobile):
        raise HTTPException(status_code=400, detail="Mobile must be exactly 10 digits")
    if len(body.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    # Check duplicate email / mobile
    dup = await sql.execute(
        select(UserRow).where(
            sa.or_(UserRow.email == body.email, UserRow.mobile == body.mobile)
        )
    )
    if dup.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Email or mobile already registered")

    user = UserRow(
        id=new_id(),
        name=body.name,
        email=body.email,
        mobile=body.mobile,
        password_hash=hash_password(body.password),
        user_type=body.user_type,
        created_at=now_str(),
    )
    sql.add(user)

    token = generate_token()
    sql.add(SessionRow(token=token, user_id=user.id, created_at=now_str()))
    await sql.commit()

    return {"token": token, "user": user_to_dict(user)}


@app.post("/api/auth/login")
async def login(body: LoginRequest, sql: AsyncSession = Depends(get_db)):
    result = await sql.execute(
        select(UserRow).where(
            sa.or_(UserRow.email == body.identifier, UserRow.mobile == body.identifier)
        )
    )
    user = result.scalar_one_or_none()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = generate_token()
    sql.add(SessionRow(token=token, user_id=user.id, created_at=now_str()))
    await sql.commit()

    return {"token": token, "user": user_to_dict(user)}


@app.get("/api/auth/me")
async def me(current_user: UserRow = Depends(get_current_user)):
    return user_to_dict(current_user)


@app.put("/api/auth/profile")
async def update_profile(
    body: ProfileUpdate,
    current_user: UserRow = Depends(get_current_user),
    sql: AsyncSession = Depends(get_db)
):
    result = await sql.execute(select(UserRow).where(UserRow.id == current_user.id))
    user = result.scalar_one()

    if body.farm_name is not None:     user.farm_name     = body.farm_name
    if body.farm_location is not None: user.farm_location = body.farm_location
    if body.farm_type is not None:     user.farm_type     = body.farm_type
    if body.farm_size is not None:     user.farm_size     = body.farm_size
    if body.addresses is not None:     user.addresses_json = json.dumps(body.addresses)

    await sql.commit()
    await sql.refresh(user)
    return user_to_dict(user)


@app.post("/api/auth/logout")
async def logout(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    sql: AsyncSession = Depends(get_db)
):
    token = credentials.credentials
    result = await sql.execute(select(SessionRow).where(SessionRow.token == token))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=401, detail="Invalid token")
    await sql.delete(session)
    await sql.commit()
    return {"message": "Logged out successfully"}


# ── Products ──────────────────────────────────────────────────────────────────

@app.post("/api/products", status_code=201)
async def create_product(
    body: ProductCreate,
    current_user: UserRow = Depends(get_current_user),
    sql: AsyncSession = Depends(get_db)
):
    if current_user.user_type != "farmer":
        raise HTTPException(status_code=403, detail="Only farmers can create products")

    product = ProductRow(
        id=new_id(),
        farmer_id=current_user.id,
        farmer_name=current_user.name,
        name=body.name,
        category=body.category,
        price=body.price,
        stock=body.stock,
        unit=body.unit,
        description=body.description or "",
        image_base64=body.image_base64 or "",
        created_at=now_str(),
    )
    sql.add(product)
    await sql.commit()
    return product_to_dict(product)


@app.get("/api/products")
async def list_products(
    search: Optional[str] = None,
    category: Optional[str] = None,
    sql: AsyncSession = Depends(get_db)
):
    query = select(ProductRow).order_by(ProductRow.created_at.desc())
    if search:
        query = query.where(ProductRow.name.ilike(f"%{search}%"))
    if category:
        query = query.where(ProductRow.category == category)
    result = await sql.execute(query)
    return [product_to_dict(p) for p in result.scalars().all()]


@app.get("/api/products/mine")
async def my_products(
    current_user: UserRow = Depends(get_current_user),
    sql: AsyncSession = Depends(get_db)
):
    result = await sql.execute(
        select(ProductRow)
        .where(ProductRow.farmer_id == current_user.id)
        .order_by(ProductRow.created_at.desc())
    )
    return [product_to_dict(p) for p in result.scalars().all()]


@app.get("/api/products/{product_id}")
async def get_product(product_id: str, sql: AsyncSession = Depends(get_db)):
    result = await sql.execute(select(ProductRow).where(ProductRow.id == product_id))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product_to_dict(product)


@app.put("/api/products/{product_id}")
async def update_product(
    product_id: str,
    body: ProductUpdate,
    current_user: UserRow = Depends(get_current_user),
    sql: AsyncSession = Depends(get_db)
):
    result = await sql.execute(select(ProductRow).where(ProductRow.id == product_id))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if product.farmer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your product")

    if body.name is not None:         product.name        = body.name
    if body.category is not None:     product.category    = body.category
    if body.price is not None:        product.price       = body.price
    if body.stock is not None:        product.stock       = body.stock
    if body.unit is not None:         product.unit        = body.unit
    if body.description is not None:  product.description = body.description
    if body.image_base64 is not None: product.image_base64 = body.image_base64

    await sql.commit()
    await sql.refresh(product)
    return product_to_dict(product)


@app.delete("/api/products/{product_id}", status_code=204)
async def delete_product(
    product_id: str,
    current_user: UserRow = Depends(get_current_user),
    sql: AsyncSession = Depends(get_db)
):
    result = await sql.execute(select(ProductRow).where(ProductRow.id == product_id))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if product.farmer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your product")
    await sql.delete(product)
    await sql.commit()


# ── Orders ────────────────────────────────────────────────────────────────────

@app.post("/api/orders", status_code=201)
async def create_order(
    body: OrderCreate,
    current_user: UserRow = Depends(get_current_user),
    sql: AsyncSession = Depends(get_db)
):
    if current_user.user_type != "consumer":
        raise HTTPException(status_code=403, detail="Only consumers can place orders")

    result = await sql.execute(select(ProductRow).where(ProductRow.id == body.product_id))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if product.stock < body.quantity:
        raise HTTPException(status_code=400, detail="Insufficient stock")

    total = product.price * body.quantity
    order = OrderRow(
        id=new_id(),
        consumer_id=current_user.id,
        consumer_name=current_user.name,
        farmer_id=product.farmer_id,
        product_id=product.id,
        product_name=product.name,
        quantity=body.quantity,
        price=product.price,
        total=total,
        delivery_address=body.delivery_address,
        status="placed",
        payment_method=body.payment_method or "COD",
        payment_status=body.payment_status or "pending",
        transaction_id=body.transaction_id or "",
        created_at=now_str(),
    )
    sql.add(order)

    # Decrement stock
    product.stock -= body.quantity
    await sql.commit()
    return order_to_dict(order)


@app.get("/api/orders/farmer")
async def farmer_orders(
    current_user: UserRow = Depends(get_current_user),
    sql: AsyncSession = Depends(get_db)
):
    result = await sql.execute(
        select(OrderRow)
        .where(OrderRow.farmer_id == current_user.id)
        .order_by(OrderRow.created_at.desc())
    )
    return [order_to_dict(o) for o in result.scalars().all()]


@app.get("/api/orders/consumer")
async def consumer_orders(
    current_user: UserRow = Depends(get_current_user),
    sql: AsyncSession = Depends(get_db)
):
    result = await sql.execute(
        select(OrderRow)
        .where(OrderRow.consumer_id == current_user.id)
        .order_by(OrderRow.created_at.desc())
    )
    return [order_to_dict(o) for o in result.scalars().all()]


@app.patch("/api/orders/{order_id}/status")
async def update_order_status(
    order_id: str,
    body: OrderStatusUpdate,
    current_user: UserRow = Depends(get_current_user),
    sql: AsyncSession = Depends(get_db)
):
    result = await sql.execute(select(OrderRow).where(OrderRow.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.farmer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    valid_transitions = {
        "placed":     ["confirmed", "cancelled"],
        "confirmed":  ["packed",    "cancelled"],
        "packed":     ["dispatched"],
        "dispatched": ["delivered"],
        "delivered":  [],
        "cancelled":  [],
    }
    if body.status not in valid_transitions.get(order.status, []):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid transition from {order.status} to {body.status}"
        )

    order.status = body.status
    if body.status == "delivered" and order.payment_method == "COD":
        order.payment_status = "paid"

    await sql.commit()
    await sql.refresh(order)
    return order_to_dict(order)


# ── Earnings ──────────────────────────────────────────────────────────────────

@app.get("/api/earnings/summary")
async def earnings_summary(
    current_user: UserRow = Depends(get_current_user),
    sql: AsyncSession = Depends(get_db)
):
    if current_user.user_type != "farmer":
        raise HTTPException(status_code=403, detail="Only farmers can view earnings")

    result = await sql.execute(
        select(OrderRow).where(OrderRow.farmer_id == current_user.id)
    )
    orders = result.scalars().all()

    total   = sum(o.total for o in orders)
    paid    = sum(o.total for o in orders if o.status == "delivered")
    pending = total - paid

    today = datetime.utcnow().date()
    daily: dict = defaultdict(float)
    for o in orders:
        try:
            day = datetime.fromisoformat(o.created_at).date()
            daily[day] += o.total
        except Exception:
            pass

    chart = []
    for i in range(6, -1, -1):
        d = today - timedelta(days=i)
        chart.append({"date": d.isoformat(), "amount": daily.get(d, 0)})

    recent = sorted(orders, key=lambda x: x.created_at, reverse=True)[:5]
    return {
        "total": total,
        "paid": paid,
        "pending": pending,
        "chart": chart,
        "recent": [order_to_dict(o) for o in recent],
    }


# ── Reviews ───────────────────────────────────────────────────────────────────

@app.post("/api/reviews", status_code=201)
async def post_review(
    body: ReviewCreate,
    current_user: UserRow = Depends(get_current_user),
    sql: AsyncSession = Depends(get_db)
):
    if current_user.user_type != "consumer":
        raise HTTPException(status_code=403, detail="Only consumers can write reviews")
    if not (1 <= body.rating <= 5):
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")

    # Verify the order
    result = await sql.execute(select(OrderRow).where(OrderRow.id == body.order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.consumer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your order")
    if order.status != "delivered":
        raise HTTPException(status_code=400, detail="Can only review delivered orders")

    dup = await sql.execute(select(ReviewRow).where(ReviewRow.order_id == body.order_id))
    if dup.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Review already submitted for this order")

    review = ReviewRow(
        order_id=body.order_id,
        product_id=body.product_id,
        consumer_id=current_user.id,
        consumer_name=current_user.name,
        rating=body.rating,
        comment=body.comment or "",
        created_at=now_str(),
    )
    sql.add(review)
    await sql.commit()
    await sql.refresh(review)
    return review_to_dict(review)


@app.get("/api/reviews/product/{product_id}")
async def get_product_reviews(product_id: str, sql: AsyncSession = Depends(get_db)):
    result = await sql.execute(
        select(ReviewRow).where(ReviewRow.product_id == product_id)
        .order_by(ReviewRow.id.desc())
    )
    return [review_to_dict(r) for r in result.scalars().all()]


@app.get("/api/reviews/order/{order_id}")
async def get_order_review(
    order_id: str,
    current_user: UserRow = Depends(get_current_user),
    sql: AsyncSession = Depends(get_db)
):
    result = await sql.execute(select(ReviewRow).where(ReviewRow.order_id == order_id))
    row = result.scalar_one_or_none()
    return review_to_dict(row) if row else None


@app.get("/api/reviews/mine")
async def my_reviews(
    current_user: UserRow = Depends(get_current_user),
    sql: AsyncSession = Depends(get_db)
):
    result = await sql.execute(
        select(ReviewRow).where(ReviewRow.consumer_id == current_user.id)
        .order_by(ReviewRow.id.desc())
    )
    return [review_to_dict(r) for r in result.scalars().all()]


# ── Saved Products ────────────────────────────────────────────────────────────

@app.post("/api/saved/toggle")
async def toggle_saved(
    body: SavedProductToggle,
    current_user: UserRow = Depends(get_current_user),
    sql: AsyncSession = Depends(get_db)
):
    if current_user.user_type != "consumer":
        raise HTTPException(status_code=403, detail="Only consumers can save products")

    result = await sql.execute(
        select(SavedProductRow).where(
            SavedProductRow.consumer_id == current_user.id,
            SavedProductRow.product_id == body.product_id
        )
    )
    existing = result.scalar_one_or_none()

    if existing:
        await sql.delete(existing)
        await sql.commit()
        return {"saved": False, "product_id": body.product_id}
    else:
        row = SavedProductRow(
            consumer_id=current_user.id,
            product_id=body.product_id,
            product_name=body.product_name,
            price=body.price,
            unit=body.unit,
            farmer_name=body.farmer_name,
            image_base64=body.image_base64 or "",
            saved_at=now_str(),
        )
        sql.add(row)
        await sql.commit()
        return {"saved": True, "product_id": body.product_id}


@app.get("/api/saved")
async def get_saved(
    current_user: UserRow = Depends(get_current_user),
    sql: AsyncSession = Depends(get_db)
):
    if current_user.user_type != "consumer":
        raise HTTPException(status_code=403, detail="Only consumers can view saved products")
    result = await sql.execute(
        select(SavedProductRow).where(SavedProductRow.consumer_id == current_user.id)
        .order_by(SavedProductRow.id.desc())
    )
    rows = result.scalars().all()
    return [
        {
            "id": r.id,
            "product_id": r.product_id,
            "product_name": r.product_name,
            "price": r.price,
            "unit": r.unit,
            "farmer_name": r.farmer_name,
            "image_base64": r.image_base64,
            "saved_at": r.saved_at,
        }
        for r in rows
    ]


@app.get("/api/saved/check/{product_id}")
async def check_saved(
    product_id: str,
    current_user: UserRow = Depends(get_current_user),
    sql: AsyncSession = Depends(get_db)
):
    result = await sql.execute(
        select(SavedProductRow).where(
            SavedProductRow.consumer_id == current_user.id,
            SavedProductRow.product_id == product_id
        )
    )
    return {"saved": result.scalar_one_or_none() is not None}


# ── Notification Prefs ────────────────────────────────────────────────────────

@app.get("/api/notifications/prefs")
async def get_notif_prefs(
    current_user: UserRow = Depends(get_current_user),
    sql: AsyncSession = Depends(get_db)
):
    result = await sql.execute(
        select(NotificationPrefRow).where(NotificationPrefRow.user_id == current_user.id)
    )
    row = result.scalar_one_or_none()
    if not row:
        return {"order_updates": True, "promotions": True, "new_produce": True, "price_alerts": False}
    return {
        "order_updates": row.order_updates,
        "promotions": row.promotions,
        "new_produce": row.new_produce,
        "price_alerts": row.price_alerts,
    }


@app.put("/api/notifications/prefs")
async def update_notif_prefs(
    body: NotifPrefsUpdate,
    current_user: UserRow = Depends(get_current_user),
    sql: AsyncSession = Depends(get_db)
):
    result = await sql.execute(
        select(NotificationPrefRow).where(NotificationPrefRow.user_id == current_user.id)
    )
    row = result.scalar_one_or_none()
    if not row:
        row = NotificationPrefRow(
            user_id=current_user.id,
            order_updates=body.order_updates if body.order_updates is not None else True,
            promotions=body.promotions if body.promotions is not None else True,
            new_produce=body.new_produce if body.new_produce is not None else True,
            price_alerts=body.price_alerts if body.price_alerts is not None else False,
        )
        sql.add(row)
    else:
        if body.order_updates is not None: row.order_updates = body.order_updates
        if body.promotions   is not None: row.promotions    = body.promotions
        if body.new_produce  is not None: row.new_produce   = body.new_produce
        if body.price_alerts is not None: row.price_alerts  = body.price_alerts

    await sql.commit()
    return {
        "order_updates": row.order_updates,
        "promotions": row.promotions,
        "new_produce": row.new_produce,
        "price_alerts": row.price_alerts,
    }


# ── Consumer Stats ────────────────────────────────────────────────────────────

@app.get("/api/consumer/stats")
async def consumer_stats(
    current_user: UserRow = Depends(get_current_user),
    sql: AsyncSession = Depends(get_db)
):
    if current_user.user_type != "consumer":
        raise HTTPException(status_code=403, detail="Consumers only")

    order_count = (await sql.execute(
        select(func.count()).where(OrderRow.consumer_id == current_user.id)
    )).scalar()

    saved_count = (await sql.execute(
        select(func.count()).where(SavedProductRow.consumer_id == current_user.id)
    )).scalar()

    review_count = (await sql.execute(
        select(func.count()).where(ReviewRow.consumer_id == current_user.id)
    )).scalar()

    return {"orders": order_count, "saved": saved_count, "reviews": review_count}


# ── Root ──────────────────────────────────────────────────────────────────────

@app.get("/")
async def root():
    return {"message": "FarmDirect API — SQLite backend"}