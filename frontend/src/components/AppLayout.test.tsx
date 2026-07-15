import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppLayout } from "./AppLayout";
import { clearCachedClubs } from "./appLayoutClubCache";

const { clear, getClub, logout } = vi.hoisted(() => ({
  clear: vi.fn(),
  getClub: vi.fn(),
  logout: vi.fn(),
}));

vi.mock("../api/auth", () => ({ logout }));
vi.mock("../api/clubs", () => ({ getClub }));
vi.mock("../auth/AuthContext", () => ({
  useAuth: () => ({
    user: {
      name: "회장",
      email: "owner@example.com",
      profileImageUrl: "https://lh3.googleusercontent.com/profile-photo",
    },
    clear,
  }),
}));

describe("AppLayout 로그아웃", () => {
  beforeEach(() => {
    clearCachedClubs();
    clear.mockReset();
    getClub.mockReset();
    logout.mockReset();
    getClub.mockResolvedValue({
      id: "club-1",
      name: "ClubFlow",
      role: "PRESIDENT",
    });
  });

  it("왼쪽 아래에 Google 프로필 이미지를 표시한다", () => {
    const { container } = render(
      <MemoryRouter>
        <AppLayout clubId="club-1"><div>현재 화면</div></AppLayout>
      </MemoryRouter>,
    );

    const profileImage = container.querySelector(
      'img[src="https://lh3.googleusercontent.com/profile-photo"]',
    );
    expect(profileImage).toBeInTheDocument();
    expect(profileImage).toHaveClass("bg-white");
  });

  it("Google 프로필 이미지를 불러오지 못하면 이름 첫 글자를 표시한다", () => {
    const { container } = render(
      <MemoryRouter>
        <AppLayout clubId="club-1"><div>현재 화면</div></AppLayout>
      </MemoryRouter>,
    );
    const profileImage = container.querySelector(
      'img[src="https://lh3.googleusercontent.com/profile-photo"]',
    );

    fireEvent.error(profileImage!);

    expect(screen.getAllByText("회")).toHaveLength(2);
    expect(profileImage).not.toBeInTheDocument();
  });

  it("다른 메뉴 화면이 다시 만들어져도 저장된 동아리 정보가 즉시 표시된다", async () => {
    const firstRender = render(
      <MemoryRouter>
        <AppLayout clubId="club-1"><div>첫 화면</div></AppLayout>
      </MemoryRouter>,
    );
    expect((await screen.findAllByText("ClubFlow")).length).toBeGreaterThan(0);
    firstRender.unmount();

    getClub.mockReturnValueOnce(new Promise(() => undefined));
    render(
      <MemoryRouter>
        <AppLayout clubId="club-1"><div>다음 화면</div></AppLayout>
      </MemoryRouter>,
    );

    expect(screen.getAllByText("ClubFlow").length).toBeGreaterThan(0);
    expect(within(document.getElementById("app-sidebar")!).getByRole("link", { name: "운영진 관리" })).toBeInTheDocument();
  });

  it("로그아웃 요청이 실패하면 현재 인증 상태를 유지하고 에러 토스트를 표시한다", async () => {
    logout.mockRejectedValue(new TypeError("Failed to fetch"));

    render(
      <MemoryRouter>
        <AppLayout clubId="club-1"><div>현재 화면 유지</div></AppLayout>
      </MemoryRouter>,
    );

    fireEvent.click(within(document.getElementById("app-sidebar")!).getByRole("button", { name: "나가기" }));

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("로그아웃에 실패했습니다"));
    expect(clear).not.toHaveBeenCalled();
    expect(screen.getByText("현재 화면 유지")).toBeInTheDocument();
  });

  it("회장에게만 운영진 관리 링크를 보여주고 받은 초대 링크는 모두에게 보여준다", async () => {
    getClub.mockResolvedValueOnce({ id: "club-1", name: "ClubFlow", role: "STAFF" });

    render(
      <MemoryRouter>
        <AppLayout clubId="club-1"><div>운영진 화면</div></AppLayout>
      </MemoryRouter>,
    );

    const sidebar = document.getElementById("app-sidebar")!;
    await waitFor(() => expect(within(sidebar).getByRole("link", { name: "받은 초대" })).toBeInTheDocument());
    expect(within(sidebar).queryByRole("link", { name: "운영진 관리" })).not.toBeInTheDocument();
    expect(screen.queryByText("폼 연동")).not.toBeInTheDocument();
  });

  it("받은 초대 경로에서는 해당 메뉴만 현재 페이지로 표시한다", async () => {
    render(
      <MemoryRouter initialEntries={["/clubs/club-1/staff-invitations"]}>
        <AppLayout clubId="club-1"><div>받은 초대 화면</div></AppLayout>
      </MemoryRouter>,
    );

    const sidebar = document.getElementById("app-sidebar")!;
    const topNavigation = screen.getByTestId("mobile-top-navigation");
    await waitFor(() => expect(within(sidebar).getByRole("link", { name: "운영진 관리" })).toBeInTheDocument());
    expect(within(sidebar).getByRole("link", { name: "운영진 관리" })).not.toHaveAttribute("aria-current");
    expect(within(sidebar).getByRole("link", { name: "받은 초대" })).toHaveAttribute("aria-current", "page");
    expect(within(topNavigation).getByRole("link", { name: "받은 초대" })).toHaveAttribute("aria-current", "page");
  });

  it("좁은 화면에서는 사이드바 대신 상단 가로 메뉴를 표시한다", async () => {
    render(
      <MemoryRouter>
        <AppLayout clubId="club-1"><div>현재 화면</div></AppLayout>
      </MemoryRouter>,
    );

    const topNavigation = screen.getByTestId("mobile-top-navigation");
    const topMenu = within(topNavigation).getByRole("navigation", { name: "상단 메뉴" });
    const sidebar = document.getElementById("app-sidebar");
    expect(topNavigation).toHaveClass("sticky", "top-0", "lg:hidden");
    expect(topMenu).toHaveClass("overflow-x-auto");
    expect(within(topMenu).getByRole("link", { name: "대시보드" })).toBeInTheDocument();
    expect(within(topMenu).getByRole("link", { name: "부원 관리" })).toBeInTheDocument();
    expect(sidebar).toHaveClass("hidden", "lg:flex");
    expect(screen.queryByRole("button", { name: "메뉴 열기" })).not.toBeInTheDocument();
  });
});
