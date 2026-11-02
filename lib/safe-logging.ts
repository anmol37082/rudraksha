const SAFE_ERROR_TYPES = new Set([
  "Error", "TypeError", "SyntaxError", "ApiError", "ZodError", "ValidationError", "CastError",
  "MongoServerError", "MongoNetworkError", "MongoTimeoutError", "MongoServerSelectionError",
]);
const SAFE_ERROR_CODES = new Set([
  "ECONNRESET", "ECONNREFUSED", "ETIMEDOUT", "EAI_AGAIN", "ENOTFOUND", "EPIPE", "ESOCKET",
  "EAUTH", "EMESSAGE", "ETLS", "ECONNECTION",
]);

export type SafeErrorSummary = { errorType: string; code?: string; duplicateKey?: true };

/** Keep only bounded diagnostic fields; exception messages and stacks may contain secrets or user data. */
export function safeErrorSummary(error: unknown): SafeErrorSummary {
  if (!(error instanceof Error)) return { errorType: "UnknownError" };
  const rawName = error.constructor?.name ?? error.name;
  const summary: SafeErrorSummary = { errorType: SAFE_ERROR_TYPES.has(rawName) ? rawName : "Error" };
  const code = (error as Error & { code?: unknown }).code;
  if (code === 11000 || code === 11001) summary.duplicateKey = true;
  else if (typeof code === "string" && SAFE_ERROR_CODES.has(code)) summary.code = code;
  return summary;
}

export function logSafeError(context: string, error: unknown) {
  console.error(context, safeErrorSummary(error));
}
