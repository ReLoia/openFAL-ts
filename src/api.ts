import type { FetchError } from "ofetch";

export class FALApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly data?: unknown,
    options?: { cause?: unknown }
  ) {
    super(message, options);
    this.name = "FALApiError";
  }
}

const extractDetail = (data: unknown): string => {
  if (data == null || data === "") return "no response body";
  if (typeof data === "string") return data.slice(0, 300);
  const d = data as Record<string, any>;
  return (
    d.operationMessage ??
    d.message ??
    d.error ??
    (d.errors ? JSON.stringify(d.errors) : JSON.stringify(d).slice(0, 300))
  );
};

function toApiError(e: unknown, label: string): FALApiError {
  if (e instanceof FALApiError) return e;

  const err = e as FetchError;

  if (!err?.response) {
    return new FALApiError(
      `${label}: unreachable (${err?.message ?? "unknown error"})`,
      undefined,
      undefined,
      { cause: e }
    );
  }

  const status = err.status ?? err.response.status;
  return new FALApiError(
    `${label}: ${status} ${err.statusText ?? ""} - ${extractDetail(err.data)}`.trim(),
    status,
    err.data,
    { cause: e }
  );
}

export async function api<T>(label: string, request: () => Promise<T>): Promise<T> {
  try {
    return await request();
  } catch (e) {
    throw toApiError(e, label);
  }
}
