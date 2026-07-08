import { beforeEach, describe, expect, it, vi } from "vitest";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function emptyResponse(status = 204) {
  return new Response(null, { status });
}

describe("apiRequest", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it("GET 요청에 세션 쿠키 옵션을 포함한다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([{ id: "club-1" }]));
    vi.stubGlobal("fetch", fetchMock);
    const { apiRequest } = await import("./http");

    await apiRequest("/api/clubs");

    expect(fetchMock).toHaveBeenCalledWith("/api/clubs", expect.objectContaining({
      credentials: "include",
    }));
  });

  it("쓰기 요청 전에 CSRF 토큰을 받아 헤더에 포함한다", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ headerName: "X-CSRF-TOKEN", token: "csrf-token" }))
      .mockResolvedValueOnce(jsonResponse({ id: "club-1" }, 201));
    vi.stubGlobal("fetch", fetchMock);
    const { apiRequest } = await import("./http");

    await apiRequest("/api/clubs", {
      method: "POST",
      body: JSON.stringify({ name: "ClubFlow" }),
    });

    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/auth/csrf", {
      credentials: "include",
    });
    const requestOptions = fetchMock.mock.calls[1][1] as RequestInit;
    expect(new Headers(requestOptions.headers).get("X-CSRF-TOKEN")).toBe("csrf-token");
  });

  it("쓰기 요청이 403이면 CSRF 토큰을 갱신해 한 번만 재시도한다", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ headerName: "X-CSRF-TOKEN", token: "stale-token" }))
      .mockResolvedValueOnce(jsonResponse({ message: "Forbidden" }, 403))
      .mockResolvedValueOnce(jsonResponse({ headerName: "X-CSRF-TOKEN", token: "fresh-token" }))
      .mockResolvedValueOnce(jsonResponse({ id: "club-1" }, 201));
    vi.stubGlobal("fetch", fetchMock);
    const { API_AUTH_ERROR_EVENT, apiRequest } = await import("./http");
    const listener = vi.fn();
    window.addEventListener(API_AUTH_ERROR_EVENT, listener);

    await apiRequest("/api/clubs", {
      method: "POST",
      body: JSON.stringify({ name: "ClubFlow" }),
    });

    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(fetchMock).toHaveBeenNthCalledWith(3, "/api/auth/csrf", {
      credentials: "include",
    });
    const firstRequest = fetchMock.mock.calls[1][1] as RequestInit;
    const retryRequest = fetchMock.mock.calls[3][1] as RequestInit;
    expect(new Headers(firstRequest.headers).get("X-CSRF-TOKEN")).toBe("stale-token");
    expect(new Headers(retryRequest.headers).get("X-CSRF-TOKEN")).toBe("fresh-token");
    expect(listener).not.toHaveBeenCalled();
    window.removeEventListener(API_AUTH_ERROR_EVENT, listener);
  });

  it("CSRF 토큰 갱신 후에도 403이면 더 재시도하지 않고 인증 이벤트를 알린다", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ headerName: "X-CSRF-TOKEN", token: "stale-token" }))
      .mockResolvedValueOnce(jsonResponse({ message: "Forbidden" }, 403))
      .mockResolvedValueOnce(jsonResponse({ headerName: "X-CSRF-TOKEN", token: "fresh-token" }))
      .mockResolvedValueOnce(jsonResponse({ message: "접근할 수 없습니다." }, 403));
    vi.stubGlobal("fetch", fetchMock);
    const { API_AUTH_ERROR_EVENT, apiRequest } = await import("./http");
    const listener = vi.fn();
    window.addEventListener(API_AUTH_ERROR_EVENT, listener);

    await expect(apiRequest("/api/clubs", {
      method: "POST",
      body: JSON.stringify({ name: "ClubFlow" }),
    })).rejects.toMatchObject({ status: 403 });

    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(listener).toHaveBeenCalledOnce();
    window.removeEventListener(API_AUTH_ERROR_EVENT, listener);
  });

  it("로그아웃이 끝나면 캐시한 CSRF 토큰을 초기화한다", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ headerName: "X-CSRF-TOKEN", token: "before-logout" }))
      .mockResolvedValueOnce(jsonResponse({ id: "club-1" }, 201))
      .mockResolvedValueOnce(emptyResponse())
      .mockResolvedValueOnce(jsonResponse({ headerName: "X-CSRF-TOKEN", token: "after-login" }))
      .mockResolvedValueOnce(jsonResponse({ id: "club-2" }, 201));
    vi.stubGlobal("fetch", fetchMock);
    const { apiRequest } = await import("./http");
    const { logout } = await import("./auth");

    await apiRequest("/api/clubs", { method: "POST", body: JSON.stringify({ name: "첫 동아리" }) });
    await logout();
    await apiRequest("/api/clubs", { method: "POST", body: JSON.stringify({ name: "두 번째 동아리" }) });

    expect(fetchMock).toHaveBeenNthCalledWith(4, "/api/auth/csrf", {
      credentials: "include",
    });
    const requestAfterLogin = fetchMock.mock.calls[4][1] as RequestInit;
    expect(new Headers(requestAfterLogin.headers).get("X-CSRF-TOKEN")).toBe("after-login");
  });

  it.each([401, 403] as const)("%s 응답을 전역 인증 이벤트로 알린다", async status => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ message: "접근할 수 없습니다." }, status));
    vi.stubGlobal("fetch", fetchMock);
    const { API_AUTH_ERROR_EVENT, apiRequest } = await import("./http");
    const listener = vi.fn();
    window.addEventListener(API_AUTH_ERROR_EVENT, listener);

    await expect(apiRequest("/api/clubs")).rejects.toMatchObject({ status });

    expect(listener).toHaveBeenCalledOnce();
    expect((listener.mock.calls[0][0] as CustomEvent).detail).toEqual({ status });
    window.removeEventListener(API_AUTH_ERROR_EVENT, listener);
  });
});
