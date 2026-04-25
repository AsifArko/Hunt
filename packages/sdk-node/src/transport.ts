function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface TransportRequest {
  url: string;
  payload: unknown;
  headers: Record<string, string>;
  timeoutMs: number;
}

export interface TransportOptions {
  attempts: number;
  baseDelayMs: number;
}

export async function postWithRetry(
  request: TransportRequest,
  options: TransportOptions,
): Promise<void> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= options.attempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), request.timeoutMs);
    try {
      const response = await fetch(request.url, {
        method: "POST",
        headers: request.headers,
        body: JSON.stringify(request.payload),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (response.ok) {
        return;
      }
      const body = await response.json().catch(() => ({}));
      const message = body?.error?.message ?? `Request failed with status ${response.status}`;
      throw new Error(message);
    } catch (error) {
      clearTimeout(timeout);
      lastError = error;
      if (attempt < options.attempts) {
        await sleep(options.baseDelayMs * attempt);
      }
    }
  }

  throw lastError;
}
