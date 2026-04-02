type Props = { className?: string }

export default function VerifiedBadge({ className = '' }: Props) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-800',
        className,
      ].join(' ')}
      title="Verified by FrameFolio"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
      Verified
    </span>
  )
}
