import { Brand } from "./Brand";

export function LoadingScreen({ message }: { message: string }) {
  return (
    <main className="flex min-h-full items-center justify-center bg-[var(--surface)] px-5 font-body">
      <section className="w-full max-w-md rounded-[12px] border border-[var(--border-subtle)] bg-white p-8 text-center shadow-sm">
        <div className="flex justify-center"><Brand /></div>
        <div className="mx-auto mt-8 h-6 w-6 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--navy)]" />
        <p className="mt-4 text-sm text-[var(--text-secondary)]">{message}</p>
      </section>
    </main>
  );
}
