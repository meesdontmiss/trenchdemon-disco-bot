export async function fetchJson<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    ...options,
    signal: options.signal ?? AbortSignal.timeout(15000),
    headers: {
      accept: "application/json",
      ...(options.headers ?? {})
    }
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`HTTP ${response.status} from ${url}: ${body.slice(0, 300)}`);
  }

  return (await response.json()) as T;
}

export function withLimit(url: string, limit: number): string {
  const parsed = new URL(url);
  parsed.searchParams.set("limit", String(limit));
  return parsed.toString();
}

export function withMint(url: string, mint: string): string {
  return url.replaceAll("{mint}", encodeURIComponent(mint));
}

export function extractArray(json: unknown): unknown[] {
  if (Array.isArray(json)) {
    return json;
  }

  if (!json || typeof json !== "object") {
    return [];
  }

  const object = json as Record<string, unknown>;
  for (const key of ["data", "result", "tokens", "items", "coins"]) {
    const candidate = object[key];
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  return [];
}
