const BASE = "https://api.holded.com/api";

export class HoldedError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "HoldedError";
  }
}

export async function holdedFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const apiKey = process.env.HOLDED_API_KEY;
  if (!apiKey) throw new Error("HOLDED_API_KEY is not configured");

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      key: apiKey,
      "Content-Type": "application/json",
      ...options?.headers,
    },
    // Cache 5 min — fresh enough for a dashboard, avoids hammering the API
    next: { revalidate: 300 },
  });

  if (!res.ok) {
    throw new HoldedError(
      res.status,
      `Holded ${res.status}: ${res.statusText} — ${path}`
    );
  }

  return res.json() as Promise<T>;
}
