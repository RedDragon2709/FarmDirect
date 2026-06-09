"""
FarmDirect API Tests — 27 test cases
Run: pytest backend/tests/test_farmdirect_api.py -v
"""
import pytest
import httpx

BASE_URL = "http://localhost:8000"

# ── Shared state across tests ─────────────────────────────────────────────────
state = {}


def h(token):
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="session", autouse=True)
def setup_test_users():
    # Try logging in as farmer1
    try:
        r = httpx.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": "farmer1@test.com", "password": "farmer123"
        })
        if r.status_code != 200:
            # Register farmer1
            httpx.post(f"{BASE_URL}/api/auth/register", json={
                "name": "Farmer One",
                "email": "farmer1@test.com",
                "mobile": "9876543210",
                "password": "farmer123",
                "user_type": "farmer"
            })
    except Exception:
        pass

    # Try logging in as consumer1
    try:
        r = httpx.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": "consumer1@test.com", "password": "consumer123"
        })
        if r.status_code != 200:
            # Register consumer1
            httpx.post(f"{BASE_URL}/api/auth/register", json={
                "name": "Consumer One",
                "email": "consumer1@test.com",
                "mobile": "9876543211",
                "password": "consumer123",
                "user_type": "consumer"
            })
    except Exception:
        pass


# ═══════════════════════════════════════════════════════════════════════════════
# AUTH
# ═══════════════════════════════════════════════════════════════════════════════

class TestAuth:
    def test_register_invalid_email(self):
        r = httpx.post(f"{BASE_URL}/api/auth/register", json={
            "name": "Bad", "email": "notanemail",
            "mobile": "9000000001", "password": "pass123", "user_type": "consumer"
        })
        assert r.status_code == 400

    def test_register_invalid_mobile_short(self):
        r = httpx.post(f"{BASE_URL}/api/auth/register", json={
            "name": "Bad", "email": "bad@test.com",
            "mobile": "123", "password": "pass123", "user_type": "consumer"
        })
        assert r.status_code == 400

    def test_register_invalid_mobile_letters(self):
        r = httpx.post(f"{BASE_URL}/api/auth/register", json={
            "name": "Bad", "email": "bad2@test.com",
            "mobile": "abcdefghij", "password": "pass123", "user_type": "consumer"
        })
        assert r.status_code == 400

    def test_register_short_password(self):
        r = httpx.post(f"{BASE_URL}/api/auth/register", json={
            "name": "Bad", "email": "bad3@test.com",
            "mobile": "9000000002", "password": "abc", "user_type": "consumer"
        })
        assert r.status_code == 400

    def test_register_farmer_ok(self):
        import time
        ts = int(time.time())
        r = httpx.post(f"{BASE_URL}/api/auth/register", json={
            "name": "Test Farmer",
            "email": f"farmer_{ts}@test.com",
            "mobile": f"80000{ts % 100000:05d}",
            "password": "farmer123",
            "user_type": "farmer"
        })
        assert r.status_code == 200
        data = r.json()
        assert "token" in data
        assert data["user"]["user_type"] == "farmer"
        state["farmer_token"] = data["token"]
        state["farmer_id"] = data["user"]["id"]

    def test_register_consumer_ok(self):
        import time
        ts = int(time.time()) + 1
        r = httpx.post(f"{BASE_URL}/api/auth/register", json={
            "name": "Test Consumer",
            "email": f"consumer_{ts}@test.com",
            "mobile": f"90000{ts % 100000:05d}",
            "password": "consumer123",
            "user_type": "consumer"
        })
        assert r.status_code == 200
        data = r.json()
        assert "token" in data
        state["consumer_token"] = data["token"]
        state["consumer_id"] = data["user"]["id"]

    def test_login_with_email(self):
        r = httpx.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": "farmer1@test.com", "password": "farmer123"
        })
        assert r.status_code == 200
        assert "token" in r.json()
        state["farmer1_token"] = r.json()["token"]

    def test_login_with_mobile(self):
        r = httpx.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": "9876543210", "password": "farmer123"
        })
        assert r.status_code == 200

    def test_login_wrong_password(self):
        r = httpx.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": "farmer1@test.com", "password": "wrongpass"
        })
        assert r.status_code == 401

    def test_me_with_valid_token(self):
        r = httpx.get(f"{BASE_URL}/api/auth/me", headers=h(state["farmer1_token"]))
        assert r.status_code == 200
        assert r.json()["email"] == "farmer1@test.com"

    def test_me_without_token(self):
        r = httpx.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code in (401, 403)

    def test_logout_invalidates_token(self):
        # Login fresh
        r = httpx.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": "consumer1@test.com", "password": "consumer123"
        })
        token = r.json()["token"]
        # Logout
        r2 = httpx.post(f"{BASE_URL}/api/auth/logout", headers=h(token))
        assert r2.status_code == 200
        # /me should now return 401
        r3 = httpx.get(f"{BASE_URL}/api/auth/me", headers=h(token))
        assert r3.status_code == 401


# ═══════════════════════════════════════════════════════════════════════════════
# PRODUCTS
# ═══════════════════════════════════════════════════════════════════════════════

class TestProducts:
    def test_consumer_cannot_create_product(self):
        r = httpx.post(f"{BASE_URL}/api/products",
                       headers=h(state["consumer_token"]),
                       json={"name": "Hack", "category": "vegetable",
                             "price": 10, "stock": 5, "unit": "kg"})
        assert r.status_code == 403

    def test_farmer_creates_product(self):
        r = httpx.post(f"{BASE_URL}/api/products",
                       headers=h(state["farmer_token"]),
                       json={"name": "Fresh Mango", "category": "fruit",
                             "price": 50, "stock": 100, "unit": "kg",
                             "description": "Sweet alphonso"})
        assert r.status_code == 201
        data = r.json()
        assert data["name"] == "Fresh Mango"
        state["product_id"] = data["id"]

    def test_list_products(self):
        r = httpx.get(f"{BASE_URL}/api/products")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_search_products(self):
        r = httpx.get(f"{BASE_URL}/api/products?search=Mango")
        assert r.status_code == 200
        results = r.json()
        assert any("Mango" in p["name"] for p in results)

    def test_category_filter(self):
        r = httpx.get(f"{BASE_URL}/api/products?category=fruit")
        assert r.status_code == 200
        for p in r.json():
            assert p["category"] == "fruit"

    def test_my_products(self):
        r = httpx.get(f"{BASE_URL}/api/products/mine", headers=h(state["farmer_token"]))
        assert r.status_code == 200
        ids = [p["id"] for p in r.json()]
        assert state["product_id"] in ids

    def test_get_product_detail(self):
        r = httpx.get(f"{BASE_URL}/api/products/{state['product_id']}")
        assert r.status_code == 200
        assert r.json()["id"] == state["product_id"]

    def test_update_product_owner(self):
        r = httpx.put(f"{BASE_URL}/api/products/{state['product_id']}",
                      headers=h(state["farmer_token"]),
                      json={"price": 60})
        assert r.status_code == 200
        assert r.json()["price"] == 60

    def test_update_product_non_owner(self):
        r = httpx.put(f"{BASE_URL}/api/products/{state['product_id']}",
                      headers=h(state["farmer1_token"]),
                      json={"price": 1})
        assert r.status_code == 403

    def test_delete_product_non_owner(self):
        r = httpx.delete(f"{BASE_URL}/api/products/{state['product_id']}",
                         headers=h(state["farmer1_token"]))
        assert r.status_code == 403

    def test_delete_product_owner(self):
        # Create a temp product then delete it
        r = httpx.post(f"{BASE_URL}/api/products",
                       headers=h(state["farmer_token"]),
                       json={"name": "Temp", "category": "vegetable",
                             "price": 5, "stock": 10, "unit": "kg"})
        pid = r.json()["id"]
        r2 = httpx.delete(f"{BASE_URL}/api/products/{pid}", headers=h(state["farmer_token"]))
        assert r2.status_code == 204
        r3 = httpx.get(f"{BASE_URL}/api/products/{pid}")
        assert r3.status_code == 404


# ═══════════════════════════════════════════════════════════════════════════════
# ORDERS
# ═══════════════════════════════════════════════════════════════════════════════

class TestOrders:
    def test_farmer_cannot_place_order(self):
        r = httpx.post(f"{BASE_URL}/api/orders",
                       headers=h(state["farmer_token"]),
                       json={"product_id": state["product_id"],
                             "quantity": 1, "delivery_address": "Farm Lane"})
        assert r.status_code == 403

    def test_consumer_places_order(self):
        r = httpx.post(f"{BASE_URL}/api/orders",
                       headers=h(state["consumer_token"]),
                       json={"product_id": state["product_id"],
                             "quantity": 2, "delivery_address": "123 Main St"})
        assert r.status_code == 201
        data = r.json()
        assert data["status"] == "placed"
        assert data["total"] == 120  # 2 * 60
        state["order_id"] = data["id"]

    def test_stock_decremented(self):
        r = httpx.get(f"{BASE_URL}/api/products/{state['product_id']}")
        assert r.json()["stock"] == 98  # 100 - 2

    def test_insufficient_stock(self):
        r = httpx.post(f"{BASE_URL}/api/orders",
                       headers=h(state["consumer_token"]),
                       json={"product_id": state["product_id"],
                             "quantity": 9999, "delivery_address": "Somewhere"})
        assert r.status_code == 400

    def test_farmer_orders_list(self):
        r = httpx.get(f"{BASE_URL}/api/orders/farmer", headers=h(state["farmer_token"]))
        assert r.status_code == 200
        ids = [o["id"] for o in r.json()]
        assert state["order_id"] in ids

    def test_consumer_orders_list(self):
        r = httpx.get(f"{BASE_URL}/api/orders/consumer", headers=h(state["consumer_token"]))
        assert r.status_code == 200
        ids = [o["id"] for o in r.json()]
        assert state["order_id"] in ids

    def test_update_order_status_by_farmer(self):
        # 1. placed -> confirmed
        r1 = httpx.patch(f"{BASE_URL}/api/orders/{state['order_id']}/status",
                         headers=h(state["farmer_token"]),
                         json={"status": "confirmed"})
        assert r1.status_code == 200
        assert r1.json()["status"] == "confirmed"

        # 2. confirmed -> packed
        r2 = httpx.patch(f"{BASE_URL}/api/orders/{state['order_id']}/status",
                         headers=h(state["farmer_token"]),
                         json={"status": "packed"})
        assert r2.status_code == 200
        assert r2.json()["status"] == "packed"

        # 3. packed -> dispatched
        r3 = httpx.patch(f"{BASE_URL}/api/orders/{state['order_id']}/status",
                         headers=h(state["farmer_token"]),
                         json={"status": "dispatched"})
        assert r3.status_code == 200
        assert r3.json()["status"] == "dispatched"

    def test_update_order_status_unauthorized(self):
        r = httpx.patch(f"{BASE_URL}/api/orders/{state['order_id']}/status",
                        headers=h(state["consumer_token"]),
                        json={"status": "cancelled"})
        assert r.status_code == 403


# ═══════════════════════════════════════════════════════════════════════════════
# EARNINGS
# ═══════════════════════════════════════════════════════════════════════════════

class TestEarnings:
    def test_earnings_unauthenticated(self):
        r = httpx.get(f"{BASE_URL}/api/earnings/summary")
        assert r.status_code in (401, 403)

    def test_earnings_for_farmer(self):
        r = httpx.get(f"{BASE_URL}/api/earnings/summary", headers=h(state["farmer_token"]))
        assert r.status_code == 200
        data = r.json()
        assert "total" in data
        assert "paid" in data
        assert "pending" in data
        assert "chart" in data
        assert len(data["chart"]) == 7
        assert "recent" in data

    def test_earnings_chart_shape(self):
        r = httpx.get(f"{BASE_URL}/api/earnings/summary", headers=h(state["farmer_token"]))
        chart = r.json()["chart"]
        for entry in chart:
            assert "date" in entry
            assert "amount" in entry

    def test_earnings_total_correct(self):
        r = httpx.get(f"{BASE_URL}/api/earnings/summary", headers=h(state["farmer_token"]))
        data = r.json()
        assert data["total"] >= 120  # at least one order placed


# ═══════════════════════════════════════════════════════════════════════════════
# PROFILE
# ═══════════════════════════════════════════════════════════════════════════════

class TestProfile:
    def test_update_profile_unauthenticated(self):
        r = httpx.put(f"{BASE_URL}/api/auth/profile", json={"farm_name": "Test Farm"})
        assert r.status_code in (401, 403)

    def test_update_profile_farmer(self):
        r = httpx.put(f"{BASE_URL}/api/auth/profile", headers=h(state["farmer_token"]), json={
            "farm_name": "Dynamic Farm",
            "farm_location": "Dynamic Valley",
            "farm_type": "organic",
            "farm_size": "5 acres"
        })
        assert r.status_code == 200
        data = r.json()
        assert data["farm_name"] == "Dynamic Farm"
        assert data["farm_location"] == "Dynamic Valley"
        assert data["farm_type"] == "organic"
        assert data["farm_size"] == "5 acres"

    def test_update_profile_consumer(self):
        r = httpx.put(f"{BASE_URL}/api/auth/profile", headers=h(state["consumer_token"]), json={
            "addresses": ["123 Green St", "456 Harvest Rd"]
        })
        assert r.status_code == 200
        data = r.json()
        assert "addresses" in data
        assert "123 Green St" in data["addresses"]
        assert "456 Harvest Rd" in data["addresses"]
