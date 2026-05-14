import type { ReactNode } from "react"
import { Braces } from "lucide-react"

interface AuthShellProps {
  children: ReactNode
  mode: "sign-in" | "sign-up"
}

const featureList = [
  "Map services, storage, queues, and boundaries on a shared canvas.",
  "Invite collaborators into the same architecture workspace.",
  "Turn the final graph into a durable technical spec.",
]

const authCopy = {
  "sign-in": {
    eyebrow: "Welcome back",
    heading: "Continue designing systems with Ghost AI.",
    summary:
      "Your protected projects, collaborative canvases, and generated specs are ready when you are.",
  },
  "sign-up": {
    eyebrow: "Create your workspace",
    heading: "Start a cleaner system design workflow.",
    summary:
      "Set up your account to create projects, collaborate on architecture, and generate implementation-ready specs.",
  },
}

export function AuthShell({ children, mode }: AuthShellProps) {
  const copy = authCopy[mode]

  return (
    <main className="grid min-h-screen bg-base text-copy-primary lg:grid-cols-[minmax(0,0.9fr)_minmax(30rem,1fr)]">
      <section className="hidden border-r border-surface-border bg-surface px-10 py-10 lg:flex lg:flex-col lg:justify-between xl:px-14">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-surface-border bg-bg-elevated text-brand">
              <Braces className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-copy-primary">Ghost AI</p>
              <p className="text-xs text-copy-muted">System design workspace</p>
            </div>
          </div>
        </div>

        <div className="max-w-lg">
          <p className="text-sm font-medium text-brand">{copy.eyebrow}</p>
          <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-normal text-copy-primary">
            {copy.heading}
          </h1>
          <p className="mt-4 max-w-md text-sm leading-6 text-copy-secondary">
            {copy.summary}
          </p>

          <ul className="mt-10 space-y-3 text-sm leading-6 text-copy-secondary">
            {featureList.map((feature) => (
              <li key={feature} className="flex gap-3">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="max-w-sm text-xs leading-5 text-copy-muted">
          Protected sign-in keeps project ownership, collaborator access, and generated artifacts tied to the right workspace.
        </p>
      </section>

      <section className="flex min-h-screen items-center justify-center px-4 py-8 sm:px-6 lg:px-10">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center justify-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-surface-border bg-bg-elevated text-brand">
              <Braces className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-copy-primary">Ghost AI</p>
              <p className="text-xs text-copy-muted">System design workspace</p>
            </div>
          </div>
          {children}
        </div>
      </section>
    </main>
  )
}
