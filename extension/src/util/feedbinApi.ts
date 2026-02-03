import type { FeedbinCredentials, FeedbinSubscription } from "./constants";

const BASE_URL = "https://api.feedbin.com/v2";

function authHeader(creds: FeedbinCredentials): string {
  return "Basic " + btoa(`${creds.email}:${creds.password}`);
}

export async function authenticate(
  creds: FeedbinCredentials,
): Promise<boolean> {
  try {
    const resp = await fetch(`${BASE_URL}/authentication.json`, {
      headers: { Authorization: authHeader(creds) },
    });
    return resp.status === 200;
  } catch {
    return false;
  }
}

export async function getSubscriptions(
  creds: FeedbinCredentials,
): Promise<FeedbinSubscription[]> {
  const resp = await fetch(`${BASE_URL}/subscriptions.json`, {
    headers: { Authorization: authHeader(creds) },
  });

  if (!resp.ok) {
    throw new Error(`Failed to fetch subscriptions: ${resp.status}`);
  }

  return resp.json();
}

export async function subscribe(
  creds: FeedbinCredentials,
  feedUrl: string,
): Promise<{
  status: "created" | "already_subscribed" | "error";
  subscription?: FeedbinSubscription;
  error?: string;
}> {
  try {
    const resp = await fetch(`${BASE_URL}/subscriptions.json`, {
      method: "POST",
      headers: {
        Authorization: authHeader(creds),
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({ feed_url: feedUrl }),
      redirect: "manual",
    });

    if (resp.status === 201) {
      const subscription: FeedbinSubscription = await resp.json();
      return { status: "created", subscription };
    }

    if (resp.status === 302) {
      return { status: "already_subscribed" };
    }

    const text = await resp.text().catch(() => "");
    return { status: "error", error: text || `HTTP ${resp.status}` };
  } catch (err) {
    return {
      status: "error",
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
