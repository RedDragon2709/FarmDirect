import AsyncStorage from "@react-native-async-storage/async-storage";

const BASE_URL = "http://10.212.77.108:8000";

async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem("token");
}

async function request(
  method: string,
  path: string,
  body?: object,
  auth = true
) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (auth) {
    const token = await getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return null;

  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Request failed");
  return data;
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export const api = {
  register: (payload: {
    name: string;
    email: string;
    mobile: string;
    password: string;
    user_type: string;
  }) => request("POST", "/api/auth/register", payload, false),

  login: (identifier: string, password: string) =>
    request("POST", "/api/auth/login", { identifier, password }, false),

  me: () => request("GET", "/api/auth/me"),

  logout: () => request("POST", "/api/auth/logout"),

  // ── Products ───────────────────────────────────────────────────────────────
  createProduct: (data: {
    name: string;
    category: string;
    price: number;
    stock: number;
    unit: string;
    description?: string;
    image_base64?: string;
  }) => request("POST", "/api/products", data),

  listProducts: (search?: string, category?: string) => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (category) params.set("category", category);
    const qs = params.toString();
    return request("GET", `/api/products${qs ? "?" + qs : ""}`, undefined, false);
  },

  myProducts: () => request("GET", "/api/products/mine"),

  getProduct: (id: string) =>
    request("GET", `/api/products/${id}`, undefined, false),

  updateProduct: (id: string, data: object) =>
    request("PUT", `/api/products/${id}`, data),

  deleteProduct: (id: string) => request("DELETE", `/api/products/${id}`),

  // ── Orders ─────────────────────────────────────────────────────────────────
  createOrder: (data: {
    product_id: string;
    quantity: number;
    delivery_address: string;
  }) => request("POST", "/api/orders", data),

  farmerOrders: () => request("GET", "/api/orders/farmer"),

  consumerOrders: () => request("GET", "/api/orders/consumer"),

  updateOrderStatus: (id: string, status: string) =>
    request("PATCH", `/api/orders/${id}/status`, { status }),

  // ── Earnings ───────────────────────────────────────────────────────────────
  earningsSummary: () => request("GET", "/api/earnings/summary"),

  // ── ML Price Prediction ───────────────────────────────────────────────────
  predictPrice: (data: {
    commodity: string;
    state: string;
    district: string;
    month: number;
  }) => mlRequest("POST", "/api/ml/price-suggest", data),
};

// ── ML Service ──────────────────────────────────────────────────────────────
const ML_BASE_URL = "http://10.212.77.108:8001";

async function mlRequest(
  method: string,
  path: string,
  body?: object
) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const res = await fetch(`${ML_BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "ML request failed");
  return data;
}
