import { Link } from "react-router-dom";

export function ClubNavigation({ clubId }: { clubId: string }) {
  const items = [
    ["대시보드", `/clubs/${clubId}/dashboard`],
    ["학기", `/clubs/${clubId}/generations`],
    ["지원자", `/clubs/${clubId}/applications`],
    ["부원", `/clubs/${clubId}/members`],
  ] as const;

  return (
    <nav className="flex flex-wrap gap-2 border-b border-[var(--border-subtle)] bg-white px-5 py-3">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap gap-2">
        {items.map(([label, href]) => (
          <Link
            key={href}
            to={href}
            className="rounded-[6px] px-3 py-2 text-xs font-extrabold text-[var(--text-secondary)] hover:bg-[var(--panel-muted)] hover:text-[var(--text-primary)]"
          >
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
