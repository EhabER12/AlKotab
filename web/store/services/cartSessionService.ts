import axiosInstance from "@/lib/axios";
import { CartItem } from "@/store/slices/cartSlice";
import Cookies from "js-cookie";

const COOKIE_NAME = "genoun_cart_session";

async function requestWithApiPrefixFallback<T = any>(
  method: "get" | "post" | "patch" | "delete",
  path: string,
  data?: any,
  config?: any
): Promise<T> {
  const baseUrl = String((axiosInstance as any)?.defaults?.baseURL || "");
  const baseHasApiPrefix = /\/api\/?$/i.test(baseUrl);
  const primaryPath = baseHasApiPrefix || path.startsWith("/api/")
    ? path
    : `/api${path}`;
  const secondaryPath =
    primaryPath === path ? `/api${path}` : path;

  try {
    const response = await (axiosInstance as any)[method](
      primaryPath,
      data,
      config
    );
    return response.data;
  } catch (error: any) {
    const status = error?.response?.status;
    const shouldRetry =
      !baseHasApiPrefix &&
      !path.startsWith("/api/") &&
      (status === 404 || status >= 500 || !status);

    if (!shouldRetry) {
      throw error;
    }

    const fallbackResponse = await (axiosInstance as any)[method](
      secondaryPath,
      data,
      config
    );
    return fallbackResponse.data;
  }
}

const isValidObjectId = (value: unknown): value is string =>
  typeof value === "string" && /^[a-fA-F0-9]{24}$/.test(value);

const normalizeLocalizedText = (
  value: any
): { ar: string; en: string } => {
  if (!value) return { ar: "", en: "" };
  if (typeof value === "string") return { ar: value, en: value };
  if (typeof value === "object") {
    const ar = typeof value.ar === "string" ? value.ar : "";
    const en = typeof value.en === "string" ? value.en : "";
    if (ar || en) return { ar, en: en || ar };
  }
  return { ar: "", en: "" };
};

// Generate or get session ID from cookies
export function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "";

  let sessionId = Cookies.get(COOKIE_NAME);

  if (!sessionId) {
    sessionId = crypto.randomUUID();
    Cookies.set(COOKIE_NAME, sessionId, {
      expires: 30, // 30 days
      sameSite: "lax",
      secure: window.location.protocol === "https:",
    });
  }

  return sessionId;
}

// Clear session ID (after successful order)
export function clearSessionId(): void {
  if (typeof window === "undefined") return;
  Cookies.remove(COOKIE_NAME);
}

// Transform cart items for API
function transformCartItems(items: CartItem[]) {
  return items
    .map((item) => {
      const rawId =
        item.itemType === "course" ? item.courseId || item.itemId : item.productId;

      if (!isValidObjectId(rawId)) {
        return null;
      }

      const quantity = Number(item.quantity || 1);
      const safeQuantity = Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
      const unitPrice =
        item.itemType === "course"
          ? Number(item.course?.price || 0)
          : Number(item.variant?.price ?? item.product?.basePrice ?? 0);
      const addons =
        item.itemType === "course"
          ? []
          : item.addons.map((addon) => ({
              addonId: addon.id,
              name: normalizeLocalizedText(addon.name),
              price: Number(addon.price || 0),
            }));
      const addonsTotal = addons.reduce((sum, addon) => sum + addon.price, 0);

      return {
        productId: rawId,
        productName: normalizeLocalizedText(
          item.itemType === "course" ? item.course?.title : item.product?.name
        ),
        productSlug:
          item.itemType === "course" ? item.course?.slug : item.product?.slug,
        productImage:
          item.itemType === "course"
            ? item.course?.thumbnail
            : item.product?.coverImage,
        variantId: item.itemType === "course" ? undefined : item.variantId,
        variantName:
          item.itemType === "course"
            ? undefined
            : normalizeLocalizedText(item.variant?.name),
        variantPrice: item.itemType === "course" ? undefined : Number(item.variant?.price ?? 0),
        addons,
        quantity: safeQuantity,
        unitPrice,
        totalPrice: (unitPrice + addonsTotal) * safeQuantity,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => !!entry);
}

/**
 * Create or update cart session
 */
export async function syncCartSession(
  items: CartItem[],
  total: number,
  currency = "EGP"
) {
  try {
    const sessionId = getOrCreateSessionId();
    if (!sessionId) return null;

    const payload = {
      sessionId,
      cartItems: transformCartItems(items),
      cartTotal: total,
      currency,
    };

    return await requestWithApiPrefixFallback(
      "post",
      "/cart-sessions",
      payload
    );
  } catch (error) {
    console.error("Failed to sync cart session:", error);
    return null;
  }
}

/**
 * Update customer info during checkout
 */
export async function updateCustomerInfo(customerInfo: {
  name?: string;
  email?: string;
  phone?: string;
}) {
  try {
    const sessionId = getOrCreateSessionId();
    if (!sessionId) return null;

    return await requestWithApiPrefixFallback(
      "patch",
      `/cart-sessions/${sessionId}/customer`,
      customerInfo
    );
  } catch (error) {
    const status = (error as any)?.response?.status;
    const sessionId = getOrCreateSessionId();

    // If session wasn't found on backend, create a minimal one then retry once.
    if (status === 404 && sessionId) {
      try {
        await requestWithApiPrefixFallback("post", "/cart-sessions", {
          sessionId,
          cartItems: [],
          cartTotal: 0,
          currency: "EGP",
        });

        return await requestWithApiPrefixFallback(
          "patch",
          `/cart-sessions/${sessionId}/customer`,
          customerInfo
        );
      } catch (retryError) {
        console.error("Failed to update customer info after session bootstrap:", retryError);
        return null;
      }
    }

    console.error("Failed to update customer info:", error);
    return null;
  }
}

/**
 * Mark session as converted after successful payment
 */
export async function markSessionConverted(paymentId?: string) {
  try {
    const sessionId = getOrCreateSessionId();
    if (!sessionId) return null;

    const response = await requestWithApiPrefixFallback(
      "patch",
      `/cart-sessions/${sessionId}/converted`,
      { paymentId }
    );

    // Clear session ID after conversion
    clearSessionId();

    return response;
  } catch (error) {
    console.error("Failed to mark session as converted:", error);
    return null;
  }
}

// ==========================================
// ADMIN API FUNCTIONS
// ==========================================

/**
 * Get abandoned cart sessions (Admin)
 */
export async function getAbandonedSessions(params?: {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}) {
  const response = await axiosInstance.get("/cart-sessions/admin/list", {
    params,
  });
  return response.data;
}

/**
 * Get single session details (Admin)
 */
export async function getSessionById(id: string) {
  const response = await axiosInstance.get(`/cart-sessions/admin/${id}`);
  return response.data;
}

/**
 * Get cart session statistics (Admin)
 */
export async function getSessionStats() {
  const response = await axiosInstance.get("/cart-sessions/admin/stats");
  return response.data;
}

/**
 * Mark session as recovered (Admin)
 */
export async function markAsRecovered(id: string, notes?: string) {
  const response = await axiosInstance.patch(
    `/cart-sessions/admin/${id}/recovered`,
    { notes }
  );
  return response.data;
}

/**
 * Add admin note to session (Admin)
 */
export async function addAdminNote(id: string, note: string) {
  const response = await axiosInstance.patch(
    `/cart-sessions/admin/${id}/note`,
    { note }
  );
  return response.data;
}

/**
 * Delete session (Admin)
 */
export async function deleteSession(id: string) {
  const response = await axiosInstance.delete(`/cart-sessions/admin/${id}`);
  return response.data;
}

/**
 * Run abandonment check manually (Admin)
 */
export async function runAbandonmentCheck(minutes = 30) {
  const response = await axiosInstance.post(
    "/cart-sessions/admin/check-abandoned",
    null,
    { params: { minutes } }
  );
  return response.data;
}
