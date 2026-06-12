import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

// Resolve local host IP dynamically for development
const debuggerHost = Constants.expoConfig?.hostUri;
const localIp = debuggerHost ? debuggerHost.split(":")[0] : "localhost";

const BASE_URL = `http://${localIp}:8000`;

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

  updateProfile: (data: {
    farm_name?: string;
    farm_location?: string;
    farm_type?: string;
    farm_size?: string;
    addresses?: string[];
  }) => request("PUT", "/api/auth/profile", data),

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
    payment_method?: string;
    payment_status?: string;
    transaction_id?: string;
  }) => request("POST", "/api/orders", data),

  farmerOrders: () => request("GET", "/api/orders/farmer"),

  consumerOrders: () => request("GET", "/api/orders/consumer"),

  updateOrderStatus: (id: string, status: string) =>
    request("PATCH", `/api/orders/${id}/status`, { status }),

  // ── Earnings ───────────────────────────────────────────────────────────────
  earningsSummary: () => request("GET", "/api/earnings/summary"),

  // ── Consumer Stats ────────────────────────────────────────────────────────
  consumerStats: () => request("GET", "/api/consumer/stats"),

  // ── Reviews ────────────────────────────────────────────────────────────────
  postReview: (data: { order_id: string; product_id: string; rating: number; comment?: string }) =>
    request("POST", "/api/reviews", data),

  getProductReviews: (product_id: string) =>
    request("GET", `/api/reviews/product/${product_id}`, undefined, false),

  getOrderReview: (order_id: string) =>
    request("GET", `/api/reviews/order/${order_id}`),

  getMyReviews: () => request("GET", "/api/reviews/mine"),

  // ── Saved Products ─────────────────────────────────────────────────────────
  toggleSaved: (data: {
    product_id: string;
    product_name: string;
    price: number;
    unit: string;
    farmer_name: string;
    image_base64?: string;
  }) => request("POST", "/api/saved/toggle", data),

  getSaved: () => request("GET", "/api/saved"),

  checkSaved: (product_id: string) =>
    request("GET", `/api/saved/check/${product_id}`),

  // ── Notification Prefs ─────────────────────────────────────────────────────
  getNotifPrefs: () => request("GET", "/api/notifications/prefs"),

  updateNotifPrefs: (data: {
    order_updates?: boolean;
    promotions?: boolean;
    new_produce?: boolean;
    price_alerts?: boolean;
  }) => request("PUT", "/api/notifications/prefs", data),

  // ── ML Price Prediction ───────────────────────────────────────────────────
  predictPrice: (data: {
    commodity: string;
    state: string;
    district: string;
    month: number;
  }) => mlRequest("POST", "/api/ml/price-suggest", data),
};

// ── ML Service ──────────────────────────────────────────────────────────────
const ML_BASE_URL = `http://${localIp}:8001`;

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
