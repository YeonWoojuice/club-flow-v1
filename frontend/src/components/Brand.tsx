export function Brand() {
  return (
    <span className="flex items-center gap-2.5">
      <span aria-hidden="true" className="flex h-8 w-8 items-end justify-center gap-[3px] rounded-[8px] bg-[var(--chrome-active)] px-[7px] py-[7px]">
        <span className="h-[6px] w-[3px] rounded-[1px] bg-[var(--chrome-text-muted)]" />
        <span className="h-[11px] w-[3px] rounded-[1px] bg-white" />
        <span className="h-[15px] w-[3px] rounded-[1px] bg-[var(--chrome-text-muted)]" />
      </span>
      <b className="text-lg tracking-[-0.3px] text-[var(--text-primary)]">ClubFlow</b>
    </span>
  );
}
