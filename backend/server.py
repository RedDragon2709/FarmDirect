from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime, timedelta
import bcrypt
import motor.motor_asyncio
import os
import secrets
import re
from collections import defaultdict

app = FastAPI(title="FarmDirect API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# DB
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URL)
db = client["farmdirect"]

security = HTTPBearer()

# ── Models ────────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    name: str
    email: str
    mobile: str
    password: str
    user_type: str  # "farmer" | "consumer"

class LoginRequest(BaseModel):
    identifier: str   # email OR mobile
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

class OrderStatusUpdate(BaseModel):
    status: str  # "accepted" | "dispatched" | "delivered" | "cancelled"

# ── Helpers ───────────────────────────────────────────────────────────────────

def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))

def generate_token() -> str:
    return secrets.token_hex(32)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    session = await db.sessions.find_one({"token": token})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    user = await db.users.find_one({"_id": session["user_id"]})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

def serialize(doc) -> dict:
    if doc is None:
        return None
    doc = dict(doc)
    doc["id"] = str(doc.pop("_id"))
    # Convert any remaining ObjectId fields to strings
    for key, value in doc.items():
        if hasattr(value, '__class__') and value.__class__.__name__ == 'ObjectId':
            doc[key] = str(value)
    return doc
# ── Auth ─────────────────────────────────────────────────────────────────────

@app.post("/api/auth/register")
async def register(body: RegisterRequest):
    # Validate email
    if "@" not in body.email:
        raise HTTPException(status_code=400, detail="Invalid email address")
    # Validate mobile
    if not re.fullmatch(r"\d{10}", body.mobile):
        raise HTTPException(status_code=400, detail="Mobile must be exactly 10 digits")
    # Validate password
    if len(body.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    # Check duplicate
    existing = await db.users.find_one({"$or": [{"email": body.email}, {"mobile": body.mobile}]})
    if existing:
        raise HTTPException(status_code=409, detail="Email or mobile already registered")

    from bson import ObjectId
    user_id = ObjectId()
    user_doc = {
        "_id": user_id,
        "name": body.name,
        "email": body.email,
        "mobile": body.mobile,
        "password_hash": hash_password(body.password),
        "user_type": body.user_type,
        "created_at": datetime.utcnow(),
    }
    await db.users.insert_one(user_doc)

    token = generate_token()
    await db.sessions.insert_one({"token": token, "user_id": user_id, "created_at": datetime.utcnow()})

    user_out = serialize(user_doc)
    user_out.pop("password_hash", None)
    return {"token": token, "user": user_out}


@app.post("/api/auth/login")
async def login(body: LoginRequest):
    user = await db.users.find_one({
        "$or": [{"email": body.identifier}, {"mobile": body.identifier}]
    })
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = generate_token()
    await db.sessions.insert_one({"token": token, "user_id": user["_id"], "created_at": datetime.utcnow()})

    user_out = serialize(user)
    user_out.pop("password_hash", None)
    return {"token": token, "user": user_out}


@app.get("/api/auth/me")
async def me(current_user=Depends(get_current_user)):
    user_out = serialize(current_user)
    user_out.pop("password_hash", None)
    return user_out


@app.post("/api/auth/logout")
async def logout(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    result = await db.sessions.delete_one({"token": token})
    if result.deleted_count == 0:
        raise HTTPException(status_code=401, detail="Invalid token")
    return {"message": "Logged out successfully"}

# ── Products ──────────────────────────────────────────────────────────────────

@app.post("/api/products", status_code=201)
async def create_product(body: ProductCreate, current_user=Depends(get_current_user)):
    if current_user["user_type"] != "farmer":
        raise HTTPException(status_code=403, detail="Only farmers can create products")
    from bson import ObjectId
    product = {
        "_id": ObjectId(),
        "farmer_id": current_user["_id"],
        "farmer_name": current_user["name"],
        **body.dict(),
        "created_at": datetime.utcnow(),
    }
    await db.products.insert_one(product)
    return serialize(product)


@app.get("/api/products")
async def list_products(search: Optional[str] = None, category: Optional[str] = None):
    query = {}
    if search:
        query["name"] = {"$regex": search, "$options": "i"}
    if category:
        query["category"] = category
    cursor = db.products.find(query).sort("created_at", -1)
    products = [serialize(p) async for p in cursor]
    return products


@app.get("/api/products/mine")
async def my_products(current_user=Depends(get_current_user)):
    cursor = db.products.find({"farmer_id": current_user["_id"]}).sort("created_at", -1)
    products = [serialize(p) async for p in cursor]
    return products


@app.get("/api/products/{product_id}")
async def get_product(product_id: str):
    from bson import ObjectId
    product = await db.products.find_one({"_id": ObjectId(product_id)})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return serialize(product)


@app.put("/api/products/{product_id}")
async def update_product(product_id: str, body: ProductUpdate, current_user=Depends(get_current_user)):
    from bson import ObjectId
    product = await db.products.find_one({"_id": ObjectId(product_id)})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if product["farmer_id"] != current_user["_id"]:
        raise HTTPException(status_code=403, detail="Not your product")
    update_data = {k: v for k, v in body.dict().items() if v is not None}
    await db.products.update_one({"_id": ObjectId(product_id)}, {"$set": update_data})
    updated = await db.products.find_one({"_id": ObjectId(product_id)})
    return serialize(updated)


@app.delete("/api/products/{product_id}", status_code=204)
async def delete_product(product_id: str, current_user=Depends(get_current_user)):
    from bson import ObjectId
    product = await db.products.find_one({"_id": ObjectId(product_id)})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if product["farmer_id"] != current_user["_id"]:
        raise HTTPException(status_code=403, detail="Not your product")
    await db.products.delete_one({"_id": ObjectId(product_id)})

# ── Orders ────────────────────────────────────────────────────────────────────

@app.post("/api/orders", status_code=201)
async def create_order(body: OrderCreate, current_user=Depends(get_current_user)):
    if current_user["user_type"] != "consumer":
        raise HTTPException(status_code=403, detail="Only consumers can place orders")
    from bson import ObjectId
    product = await db.products.find_one({"_id": ObjectId(body.product_id)})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if product["stock"] < body.quantity:
        raise HTTPException(status_code=400, detail="Insufficient stock")

    total = product["price"] * body.quantity
    order = {
        "_id": ObjectId(),
        "consumer_id": current_user["_id"],
        "consumer_name": current_user["name"],
        "farmer_id": product["farmer_id"],
        "product_id": product["_id"],
        "product_name": product["name"],
        "quantity": body.quantity,
        "price": product["price"],
        "total": total,
        "delivery_address": body.delivery_address,
        "status": "accepted",
        "payment_method": "COD",
        "created_at": datetime.utcnow(),
    }
    await db.orders.insert_one(order)
    # Decrement stock
    await db.products.update_one({"_id": ObjectId(body.product_id)}, {"$inc": {"stock": -body.quantity}})
    return serialize(order)


@app.get("/api/orders/farmer")
async def farmer_orders(current_user=Depends(get_current_user)):
    cursor = db.orders.find({"farmer_id": current_user["_id"]}).sort("created_at", -1)
    return [serialize(o) async for o in cursor]


@app.get("/api/orders/consumer")
async def consumer_orders(current_user=Depends(get_current_user)):
    cursor = db.orders.find({"consumer_id": current_user["_id"]}).sort("created_at", -1)
    return [serialize(o) async for o in cursor]


@app.patch("/api/orders/{order_id}/status")
async def update_order_status(order_id: str, body: OrderStatusUpdate, current_user=Depends(get_current_user)):
    from bson import ObjectId
    order = await db.orders.find_one({"_id": ObjectId(order_id)})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order["farmer_id"] != current_user["_id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    await db.orders.update_one({"_id": ObjectId(order_id)}, {"$set": {"status": body.status}})
    updated = await db.orders.find_one({"_id": ObjectId(order_id)})
    return serialize(updated)

# ── Earnings ──────────────────────────────────────────────────────────────────

@app.get("/api/earnings/summary")
async def earnings_summary(current_user=Depends(get_current_user)):
    if current_user["user_type"] != "farmer":
        raise HTTPException(status_code=403, detail="Only farmers can view earnings")

    orders = await db.orders.find({"farmer_id": current_user["_id"]}).to_list(None)

    total = sum(o["total"] for o in orders)
    paid = sum(o["total"] for o in orders if o["status"] == "delivered")
    pending = total - paid

    # 7-day chart
    today = datetime.utcnow().date()
    chart = []
    daily = defaultdict(float)
    for o in orders:
        day = o["created_at"].date()
        daily[day] += o["total"]
    for i in range(6, -1, -1):
        d = today - timedelta(days=i)
        chart.append({"date": d.isoformat(), "amount": daily.get(d, 0)})

    recent = sorted(orders, key=lambda x: x["created_at"], reverse=True)[:5]

    return {
        "total": total,
        "paid": paid,
        "pending": pending,
        "chart": chart,
        "recent": [serialize(o) for o in recent],
    }


@app.get("/")
async def root():
    return {"message": "FarmDirect API running"}