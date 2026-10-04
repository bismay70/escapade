export type Preferences = {
  travel_style: "solo" | "couple" | "family" | "friends";
  budget: number;
  interests: string[];
  dietary: "any" | "vegetarian" | "vegan" | "halal";
  pace: "relaxed" | "balanced" | "packed";
  hotel_type: "budget" | "boutique" | "luxury";
  transport: "any" | "train" | "flight" | "road";
  language: string;
  accessibility: boolean;
  origin: string;
  destination: string;
  days: number;
  travelers: number;
  departure_date: string | null;
  return_date: string | null;
};

export const defaultPreferences: Preferences = {
  travel_style: "solo", budget: 35000, interests: ["nature", "culture"], dietary: "any",
  pace: "balanced", hotel_type: "boutique", transport: "any", language: "English",
  accessibility: false, origin: "", destination: "", days: 5, travelers: 1,
  departure_date: null, return_date: null,
};

export type AgentResponse = {
  answer: string;
  destination: string;
  mode: "sample" | "ai";
  preferences_used: Preferences;
  recommendations: { destination: string; reason: string; estimated_ground_cost: number; sample: boolean }[];
  itinerary: { day: number; title: string; activities: string[]; meals: string; sample: boolean }[];
  budget: { total: number; currency: string; scope: string; allocations: Record<string, number>; estimated_ground_cost: number | null; warning: string; notice: string } | null;
  sources: { title: string; url: string; type: string }[];
  trace: { agent: string; status: string; detail: string }[];
  notices: string[];
};

export type ChatMessage = { role: "user" | "assistant"; content: string; payload?: AgentResponse | null; created_at?: string };
export type Capabilities = { ai: boolean; search: boolean; weather: boolean; flight_status: boolean; provider: string; auth?: boolean; bookings?: boolean; flights?: boolean; hotels?: boolean; payments?: boolean };
export type AuthUser = { uid: string; email: string | null; name: string | null };
export type AuthStatus = { authenticated: boolean; user: AuthUser | null };

export async function travelApi<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`/api/${path}`, { ...options, credentials: "same-origin", cache: "no-store", headers: { "Content-Type": "application/json", ...options?.headers } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = data.error ?? data.detail;
    const fallback = response.status === 401 ? "Sign in to continue with this booking. Your session may have expired." : response.status === 503 ? "This service is unavailable. Check the backend and provider configuration, then try again." : "Check your preference values and travel dates, then try again.";
    throw new Error(typeof detail === "string" ? detail : fallback);
  }
  return data as T;
}

export async function authStatus(): Promise<AuthStatus> {
  const response = await fetch("/api/auth/me", { credentials: "same-origin", cache: "no-store" });
  if (response.status === 401) return { authenticated: false, user: null };
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof data.detail === "string" ? data.detail : "The sign-in service is unavailable.");
  return { authenticated: data.authenticated === true, user: data.user ?? null };
}

export async function logout(): Promise<void> {
  await travelApi("auth/session", { method: "DELETE" });
  if (typeof window !== "undefined" && window.firebase) {
    await window.firebase.auth().signOut().catch(() => undefined);
  }
}
