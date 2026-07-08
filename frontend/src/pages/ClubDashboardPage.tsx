import { Link, useParams } from "react-router-dom";
import { AppLayout } from "../components/AppLayout";

export function ClubDashboardPage() {
  const { clubId = "" } = useParams();

  const sections = [
    {
      label: "학기/기수",
      desc: "활성 학기를 만들고 기수 상태를 관리합니다.",
      to: `/clubs/${clubId}/generations`,
    },
    {
      label: "지원자 관리",
      desc: "지원자를 등록하고 합격·불합격을 처리합니다.",
      to: `/clubs/${clubId}/applications`,
    },
    {
      label: "부원 관리",
      desc: "합격 처리된 부원 목록과 활동 이력을 확인합니다.",
      to: `/clubs/${clubId}/members`,
    },
  ];

  return (
    <AppLayout clubId={clubId}>
      <header className="flex items-center justify-between border-b border-[var(--border-subtle)] bg-white px-8 py-5">
        <div>
          <h1 className="text-xl font-extrabold">대시보드</h1>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">동아리 운영 현황을 확인하고 관리합니다.</p>
        </div>
        <Link
          to="/clubs"
          className="rounded-lg border border-[var(--border)] bg-white px-4 py-2.5 text-xs font-extrabold hover:bg-[var(--panel-muted)]"
        >
          동아리 전환
        </Link>
      </header>
      <main className="p-8">
        <div className="grid gap-4 sm:grid-cols-3">
          {sections.map(section => (
            <Link
              key={section.to}
              to={section.to}
              className="rounded-xl border border-[var(--border-subtle)] bg-white p-6 transition hover:border-[var(--navy)] hover:shadow-sm"
            >
              <b className="text-base">{section.label}</b>
              <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">{section.desc}</p>
            </Link>
          ))}
        </div>
      </main>
    </AppLayout>
  );
}
