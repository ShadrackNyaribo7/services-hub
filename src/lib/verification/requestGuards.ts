import "server-only";

export class RequestInputError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 413 | 415 = 400,
  ) {
    super(message);
    this.name = "RequestInputError";
  }
}

export async function readBoundedJsonObject(
  request: Request,
  maximumBytes = 32_768,
) {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  const mediaType = contentType.split(";", 1)[0].trim();
  if (mediaType !== "application/json") {
    throw new RequestInputError("Content-Type must be application/json.", 415);
  }

  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maximumBytes) {
    throw new RequestInputError("Request body is too large.", 413);
  }

  const rawBody = await request.text();
  if (new TextEncoder().encode(rawBody).byteLength > maximumBytes) {
    throw new RequestInputError("Request body is too large.", 413);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    throw new RequestInputError("Request body must contain valid JSON.");
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new RequestInputError("Request body must be a JSON object.");
  }

  return parsed as Record<string, unknown>;
}

export function readTextInput(
  body: Record<string, unknown>,
  field: string,
  maximumLength: number,
) {
  const rawValue = body[field];

  if (rawValue === null || rawValue === undefined) return "";
  if (typeof rawValue !== "string") {
    throw new RequestInputError(`${field} must be a string.`);
  }

  const value = rawValue.normalize("NFKC").trim();
  if (value.length > maximumLength) {
    throw new RequestInputError(
      `${field} must be ${maximumLength} characters or fewer.`,
    );
  }

  return value;
}
