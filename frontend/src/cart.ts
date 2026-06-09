import AsyncStorage from "@react-native-async-storage/async-storage";

export interface CartItem {
  product_id: string;
  name: string;
  price: number;
  stock: number;
  unit: string;
  farmer_name: string;
  farmer_id: string;
  image_base64?: string;
  quantity: number;
}

const CART_KEY = "farmdirect_cart";
const listeners = new Set<() => void>();

export function subscribeToCart(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyListeners() {
  listeners.forEach((l) => l());
}

export async function getCart(): Promise<CartItem[]> {
  try {
    const raw = await AsyncStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function addToCart(product: any, quantity: number): Promise<CartItem[]> {
  const cart = await getCart();
  const existing = cart.find((item) => item.product_id === product.id);

  if (existing) {
    existing.quantity = Math.min(product.stock, existing.quantity + quantity);
  } else {
    cart.push({
      product_id: product.id,
      name: product.name,
      price: product.price,
      stock: product.stock,
      unit: product.unit,
      farmer_name: product.farmer_name,
      farmer_id: product.farmer_id,
      image_base64: product.image_base64,
      quantity: Math.min(product.stock, quantity),
    });
  }

  await AsyncStorage.setItem(CART_KEY, JSON.stringify(cart));
  notifyListeners();
  return cart;
}

export async function removeFromCart(productId: string): Promise<CartItem[]> {
  let cart = await getCart();
  cart = cart.filter((item) => item.product_id !== productId);
  await AsyncStorage.setItem(CART_KEY, JSON.stringify(cart));
  notifyListeners();
  return cart;
}

export async function updateCartQuantity(productId: string, quantity: number): Promise<CartItem[]> {
  const cart = await getCart();
  const item = cart.find((i) => i.product_id === productId);
  if (item) {
    item.quantity = Math.max(1, Math.min(item.stock, quantity));
    await AsyncStorage.setItem(CART_KEY, JSON.stringify(cart));
    notifyListeners();
  }
  return cart;
}

export async function clearCart(): Promise<void> {
  await AsyncStorage.removeItem(CART_KEY);
  notifyListeners();
}

export async function getCartCount(): Promise<number> {
  const cart = await getCart();
  return cart.reduce((acc, item) => acc + item.quantity, 0);
}
