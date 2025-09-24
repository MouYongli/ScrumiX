export function getApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1';
}

export type AuthContext = { cookies?: string } | undefined;

export async function requestWithAuth<T = unknown>(
  endpoint: string,
  options: RequestInit,
  context: AuthContext
): Promise<{ data?: T; error?: string }> {
  const cookies = context?.cookies;
  if (!cookies) return { error: 'Authentication context missing' };

  try {
    // Try to extract scrumix_session for Authorization header (hybrid auth support)
    let authHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      Cookie: cookies,
      ...(options.headers as Record<string, string> || {}),
    };
    try {
      const match = cookies.match(/(^|;\s*)scrumix_session=([^;]+)/);
      const accessToken = match ? decodeURIComponent(match[2]) : undefined;
      if (accessToken) {
        authHeaders = { ...authHeaders, Authorization: `Bearer ${accessToken}` };
      }
    } catch {}

    const res = await fetch(`${getApiBaseUrl()}${endpoint}`, {
      ...options,
      credentials: 'include',
      headers: authHeaders,
    });

    const text = await res.text();
    if (!res.ok) {
      let detail: string;
      try {
        const json = JSON.parse(text);
        detail = json.detail || text || res.statusText;
      } catch {
        detail = text || res.statusText;
      }
      return { error: `HTTP ${res.status}: ${detail}` };
    }

    if (!text) {
      return { data: undefined as unknown as T };
    }

    try {
      return { data: JSON.parse(text) as T };
    } catch {
      return { error: 'Invalid JSON response from server' };
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Unknown error occurred' };
  }
}


