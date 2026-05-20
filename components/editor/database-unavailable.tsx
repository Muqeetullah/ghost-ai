import Link from "next/link"
import { DatabaseZap } from "lucide-react"

import { Button } from "@/components/ui/button"

export function DatabaseUnavailable() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-base px-6 py-12 text-copy-primary">
      <div className="flex max-w-sm flex-col items-center text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-surface-border bg-bg-surface text-state-warning">
          <DatabaseZap className="h-6 w-6" aria-hidden="true" />
        </div>
        <h1 className="mt-6 text-2xl font-semibold tracking-normal">
          Database unavailable
        </h1>
        <p className="mt-3 text-sm leading-6 text-copy-muted">
          Ghost AI could not reach the project database. Check the database
          connection and try again.
        </p>
        <Button asChild className="mt-6">
          <Link href="/editor">Retry editor</Link>
        </Button>
      </div>
    </main>
  )
}
