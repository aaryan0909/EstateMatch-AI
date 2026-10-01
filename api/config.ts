import { ApiRequest, ApiResponse, requireMethod, sendJson } from "./_lib/http.js";
import { liveAiConfigured } from "./_lib/gemini.js";

export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  if (!requireMethod(req, res, "GET")) return;
  sendJson(res, 200, { liveAi: liveAiConfigured() });
}
