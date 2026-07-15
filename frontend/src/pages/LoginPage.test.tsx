import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { LoginPage } from "./LoginPage";

vi.mock("../auth/AuthContext", () => ({
  useAuth: () => ({ status: "anonymous" }),
}));

describe("LoginPage", () => {
  it("큰 화면에서 로그인 카드 왼쪽에 같은 높이의 CrewCat 이미지를 표시한다", () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    const image = screen.getByAltText("카페에서 노트북으로 동아리를 관리하는 CrewCat 고양이");
    const imagePanel = screen.getByRole("region", { name: "CrewCat 소개 이미지" });
    const loginLink = screen.getByRole("link", { name: "Google로 시작하기" });
    const loginScreen = screen.getByRole("main");
    const loginPanel = loginLink.closest("section");

    expect(loginScreen).toHaveClass("bg-white");
    expect(image).toHaveAttribute("src", "/crewcat-login-cat.png?v=20260715-cafe");
    expect(image).toHaveClass("h-full", "w-full", "object-cover");
    expect(imagePanel).toHaveClass("hidden", "min-h-[420px]", "lg:block");
    expect(imagePanel).not.toHaveClass("border", "rounded-[14px]", "shadow-sm");
    expect(loginPanel).not.toHaveClass("border", "rounded-[14px]", "shadow-sm");
    expect(loginLink).toHaveAttribute("href", "http://localhost:8080/oauth2/authorization/google");
  });
});
