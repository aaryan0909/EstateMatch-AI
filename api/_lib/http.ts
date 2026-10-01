export interface ApiRequest {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
  socket?: { remoteAddress?: string };
  [Symbol.asyncIterator]?: () => AsyncIterator<unknown>;
}

export interface ApiResponse {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => ApiResponse;
  json: (body: unknown) => void;
  end: (body?: string) => void;
}

export const headerValue = (
  req: ApiRequest,
  name: string,
): string | undefined => {
  const value = req.headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
};

export const sendJson = (
  res: ApiResponse,
  status: number,
  body: unknown,
): void => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.status(status).json(body);
};

export const requireMethod = (
  req: ApiRequest,
  res: ApiResponse,
  method: string,
): boolean => {
  if (req.method === method) return true;
  res.setHeader("Allow", method);
  sendJson(res, 405, { error: "Method not allowed", code: "METHOD_NOT_ALLOWED" });
  return false;
};

export const requireSameOrigin = (req: ApiRequest, res: ApiResponse): boolean => {
  const origin = headerValue(req, "origin");
  if (!origin) return true;
  const host = headerValue(req, "host");
  try {
    if (new URL(origin).host === host) return true;
  } catch {
    // Fall through to the 403 below.
  }
  sendJson(res, 403, { error: "Cross-origin request rejected", code: "FORBIDDEN_ORIGIN" });
  return false;
};

export const readJsonBody = async <T>(req: ApiRequest): Promise<T | null> => {
  if (req.body && typeof req.body === "object") return req.body as T;
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body) as T;
    } catch {
      return null;
    }
  }
  if (!req[Symbol.asyncIterator]) return null;
  let raw = "";
  for await (const chunk of req as AsyncIterable<unknown>) {
    raw += typeof chunk === "string" ? chunk : Buffer.from(chunk as Uint8Array).toString("utf8");
    if (raw.length > 120_000) return null;
  }
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

export const clientIp = (req: ApiRequest): string => {
  const forwarded = headerValue(req, "x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return headerValue(req, "x-real-ip") ?? req.socket?.remoteAddress ?? "unknown";
};
