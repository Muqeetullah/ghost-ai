import type { ReactNode } from "react"
import Image from "next/image"
import { FileText, GitBranch, LockKeyhole, Sparkles } from "lucide-react"

import { GhostLogo } from "@/components/brand/ghost-logo"

interface AuthShellProps {
  children: ReactNode
  mode: "sign-in" | "sign-up"
}

const authCopy = {
  "sign-in": {
    heading: "Your next big idea.\nA clearer architecture.",
    summary: "Pick up where you left off. Shape systems together, from the first connection to the final spec.",
  },
  "sign-up": {
    heading: "From a spark of an idea\nto a system that works.",
    summary: "A shared canvas for your architecture. Explore ideas with AI, build with your team, and bring every decision into focus.",
  },
}

export function AuthShell({ children, mode }: AuthShellProps) {
  const copy = authCopy[mode]

  return (
    <main className="grid min-h-svh bg-bg-base text-copy-primary lg:grid-cols-2">
      <section aria-label="Your Ghost AI account" className="flex min-w-0 flex-col px-6 py-8 sm:px-10 lg:px-12 lg:py-10 xl:px-16">
        <GhostLogo />

        <div className="flex flex-1 items-center justify-center py-12 lg:py-10">
          <div className="w-full max-w-[25rem]">{children}</div>
        </div>

        <p className="flex items-center justify-center gap-2 text-xs leading-5 text-copy-muted lg:justify-start">
          <LockKeyhole aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
          Your ideas. Your team. Your workspace.
        </p>
      </section>

      <aside aria-label="Design systems with Ghost AI" className="relative m-4 ml-0 hidden min-h-[44rem] min-w-0 flex-col justify-end overflow-hidden rounded-3xl border border-surface-border bg-bg-base p-8 lg:flex xl:p-12">
        <Image
          src="/images/auth-horizon.png"
          alt=""
          fill
          sizes="50vw"
          preload
          className="object-cover"
        />
        <div className="relative z-10 mx-auto w-full max-w-xl pb-4 pt-80">
          <p className="mb-4 flex items-center gap-2 text-xs font-medium text-brand"><Sparkles aria-hidden="true" className="h-4 w-4" />Think it. Map it. Build it.</p>
          <h1 className="whitespace-pre-line text-3xl font-medium leading-tight tracking-tight xl:text-4xl">{copy.heading}</h1>
          <p className="mt-4 max-w-md text-sm leading-6 text-copy-secondary">{copy.summary}</p>
          <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-3 border-t border-copy-primary/20 pt-5 text-xs text-copy-secondary">
            <li className="flex items-center gap-2"><GitBranch aria-hidden="true" className="h-4 w-4 text-brand" />Shared canvas</li>
            <li className="flex items-center gap-2"><Sparkles aria-hidden="true" className="h-4 w-4 text-ai-text" />AI architect</li>
            <li className="flex items-center gap-2"><FileText aria-hidden="true" className="h-4 w-4 text-copy-muted" />Technical specs</li>
          </ul>
        </div>
      </aside>
    </main>
  )
}
