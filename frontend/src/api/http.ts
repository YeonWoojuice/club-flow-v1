type ErrorResponse = {
  code?: string;
  message?: string;
};

type CsrfToken = {
  headerName: string;
  token: string;
};

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

let csrfToken: CsrfToken | null = null;

async function getCsrfToken() {
  if (csrfToken) return csrfToken;
  const response = await fetch("/api/auth/csrf", { credentials: "include" });
  if (!response.ok) {
    throw new ApiError(response.status, "보안 토큰을 가져오지 못했습니다.");
  }
  csrfToken = await response.json() as CsrfToken;
  return csrfToken;
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const method = (options.method ?? "GET").toUpperCase();
  const headers = new Headers(options.headers);

  if (options.body) {
    headers.set("Content-Type", "application/json");
  }
  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    const csrf = await getCsrfToken();
    headers.set(csrf.headerName, csrf.token);
  }

  const response = await fetch(path, {
    ...options,
    credentials: "include",
    headers,
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get("content-type") ?? "";
  const body = contentType.includes("application/json")
    ? await response.json() as ErrorResponse
    : null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      body?.message ?? "요청을 처리하지 못했습니다.",
      body?.code,
    );
  }

  return body as T;
}
