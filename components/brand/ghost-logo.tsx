interface GhostLogoProps {
  className?: string
}

export function GhostLogo({ className }: GhostLogoProps) {
  return (
    <div aria-label="Ghost AI" className={`inline-flex items-center gap-3 ${className ?? ""}`}>
      <svg aria-hidden="true" viewBox="0 0 40 40" fill="none" className="h-10 w-10 shrink-0 text-brand">
        <path
          d="M9 30V18a11 11 0 0 1 22 0v12l-5-3.5L20 31l-6-4.5L9 30Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path d="M15 18v3m10-3v3M5 14l3-3m24 21 3-3" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
      <span aria-hidden="true" className="text-xl font-semibold tracking-tight text-copy-primary">ghost<span className="ml-1.5 font-normal text-copy-muted">ai</span></span>
    </div>
  )
}
