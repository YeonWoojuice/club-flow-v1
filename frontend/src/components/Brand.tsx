type BrandLogoProps = {
  className?: string;
  variant?: "default" | "navigation";
};

export function BrandLogo({ className = "h-8 w-8", variant = "default" }: BrandLogoProps) {
  const navigation = variant === "navigation";

  return (
    <span
      aria-hidden="true"
      className={`relative shrink-0 overflow-hidden rounded-[8px] ${navigation ? "bg-transparent" : "bg-white"} ${className}`}
    >
      <img
        src={navigation
          ? "/crewcat-logo-full.png?v=20260714-1030"
          : "/crewcat-logo.png?v=20260714-1022"}
        alt=""
        className={`absolute inset-0 h-full w-full object-cover ${navigation ? "scale-[1.45]" : "scale-100"}`}
      />
    </span>
  );
}

export function Brand() {
  return (
    <span className="flex items-center gap-2.5">
      <BrandLogo />
      <b className="text-lg tracking-[-0.3px] text-[var(--text-primary)]">CrewCat</b>
    </span>
  );
}
