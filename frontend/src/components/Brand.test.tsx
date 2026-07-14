import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Brand, BrandLogo } from "./Brand";

describe("Brand", () => {
  it("CrewCat 이름과 공용 로고를 표시한다", () => {
    const { container } = render(<Brand />);

    expect(screen.getByText("CrewCat")).toBeInTheDocument();
    expect(container.querySelector("img")).toHaveAttribute(
      "src",
      "/crewcat-logo.png?v=20260714-1022",
    );
  });

  it("내비게이션 이름 영역에는 확대 로고를 표시한다", () => {
    const { container } = render(<BrandLogo variant="navigation" />);

    expect(container.firstElementChild).toHaveClass("bg-transparent");
    expect(container.firstElementChild).not.toHaveClass("bg-white");
    expect(container.querySelector("img")).toHaveAttribute(
      "src",
      "/crewcat-logo-full.png?v=20260714-1030",
    );
  });
});
