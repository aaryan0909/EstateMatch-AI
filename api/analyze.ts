import {
  ApiRequest,
  ApiResponse,
  clientIp,
  readJsonBody,
  requireMethod,
  requireSameOrigin,
  sendJson,
} from "./_lib/http.js";
import { analyzeWithGemini, liveAiConfigured } from "./_lib/gemini.js";
import { rateLimit } from "./_lib/rateLimit.js";
import { sanitizeListing, sanitizePreferences } from "./_lib/validate.js";
import { applyDeterministicScoring } from "../services/analyzerCore.js";

interface AnalyzeBody {
  listingContent?: unknown;
  preferences?: unknown;
}

export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  if (!requireMethod(req, res, "POST")) return;
  if (!requireSameOrigin(req, res)) return;

  const limit = await rateLimit("analyze", clientIp(req), 6);
  if (!limit.allowed) {
    res.setHeader("Retry-After", String(limit.retryAfterSeconds));
    sendJson(res, 429, { error: "Too many analysis requests. Try again shortly.", code: "RATE_LIMITED" });
    return;
  }

  if (!liveAiConfigured()) {
    sendJson(res, 501, {
      error: "Live AI is not configured on the server.",
      code: "LIVE_AI_NOT_CONFIGURED",
    });
    return;
  }

  const body = await readJsonBody<AnalyzeBody>(req);
  const listingContent = sanitizeListing(body?.listingContent);
  if (!listingContent) {
    sendJson(res, 400, { error: "Listing text is required and must be within the size limit.", code: "INVALID_LISTING" });
    return;
  }
  const preferences = sanitizePreferences(body?.preferences);

  try {
    const modelResult = await analyzeWithGemini(listingContent, preferences);
    // The model proposes claims and narrative. Code validates every quote and
    // owns the final score and market disclaimer.
    const result = applyDeterministicScoring(modelResult, listingContent, preferences);
    sendJson(res, 200, { result, mode: "live" });
  } catch (error) {
    console.error("Live analysis failed", error);
    sendJson(res, 502, {
      error: "Live AI analysis failed. Instant local analysis is still available.",
      code: "LIVE_AI_FAILED",
    });
  }
}
