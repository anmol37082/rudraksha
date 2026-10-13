// Tiny fetch wrapper for client components.
export type ApiResult<T = any> = { success: boolean; message: string; data?: T; errors?: Record<string, string> };

export async function api<T = any>(url: string, method = "GET", body?: unknown): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, {
      method,
      headers: body instanceof FormData || body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
    });
    return await res.json();
  } catch {
    return { success: false, message: "Network error. Check your connection and try again." };
  }
}

export const fmtDate = (d?: string | Date | null) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "-");
export const lines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);
export const csv = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);
