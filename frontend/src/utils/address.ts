export interface StructuredAddress {
  flat: string;
  street: string;
  landmark: string;
  city: string;
  pincode: string;
  tag: "Home" | "Work" | "Other";
}

export function parseAddress(addr: string | null | undefined): StructuredAddress {
  if (!addr) {
    return { flat: "", street: "", landmark: "", city: "", pincode: "", tag: "Home" };
  }
  try {
    const trimmed = addr.trim();
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      const parsed = JSON.parse(trimmed);
      return {
        flat: parsed.flat || "",
        street: parsed.street || "",
        landmark: parsed.landmark || "",
        city: parsed.city || "",
        pincode: parsed.pincode || "",
        tag: parsed.tag || "Home",
      };
    }
  } catch (e) {
    // Fall back to legacy plain text
  }
  return {
    flat: addr,
    street: "",
    landmark: "",
    city: "",
    pincode: "",
    tag: "Home",
  };
}

export function formatAddress(addr: string | null | undefined): string {
  if (!addr) return "";
  try {
    const trimmed = addr.trim();
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      const parsed = JSON.parse(trimmed);
      const parts = [
        parsed.flat,
        parsed.street,
        parsed.landmark ? `Near ${parsed.landmark}` : "",
        parsed.city,
        parsed.pincode ? `${parsed.pincode}` : "",
      ].filter(Boolean);
      let formatted = parts.join(", ");
      if (parsed.tag) {
        formatted += ` (${parsed.tag})`;
      }
      return formatted;
    }
  } catch (e) {
    // Ignore error, fallback to returning string directly
  }
  return addr;
}
