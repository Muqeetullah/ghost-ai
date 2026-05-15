"use client"

import { FormEvent, useEffect, useMemo, useState } from "react"
import { Check, Copy, Trash2, UserPlus } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

interface ShareDialogProps {
  isOpen: boolean
  projectId: string
  projectName: string
  canManage: boolean
  onOpenChange: (isOpen: boolean) => void
}

interface Collaborator {
  id: string
  email: string
  displayName: string | null
  avatarUrl: string | null
  createdAt: string
}

interface CollaboratorListResponse {
  canManage: boolean
  collaborators: Collaborator[]
}

interface CollaboratorInviteResponse {
  collaborator: Collaborator
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function ShareDialog({
  isOpen,
  projectId,
  projectName,
  canManage,
  onOpenChange,
}: ShareDialogProps) {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isInviting, setIsInviting] = useState(false)
  const [removingCollaboratorId, setRemovingCollaboratorId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [serverCanManage, setServerCanManage] = useState(canManage)

  const projectLink = useMemo(() => {
    if (typeof window === "undefined") {
      return `/editor/${projectId}`
    }

    return `${window.location.origin}/editor/${projectId}`
  }, [projectId])

  const normalizedEmail = email.trim().toLowerCase()
  const emailError =
    email.trim().length > 0 && !EMAIL_PATTERN.test(normalizedEmail)
      ? "Enter a valid email address."
      : null
  const canInvite = serverCanManage && normalizedEmail.length > 0 && emailError === null

  useEffect(() => {
    if (!isOpen) {
      return
    }

    let isMounted = true

    async function loadCollaborators() {
      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/projects/${projectId}/collaborators`)
        const payload = await readJsonResponse<CollaboratorListResponse>(response)

        if (isMounted) {
          setCollaborators(payload.collaborators)
          setServerCanManage(payload.canManage)
        }
      } catch (loadError) {
        if (isMounted) {
          setError(loadError instanceof Error ? loadError.message : "Could not load sharing details.")
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadCollaborators()

    return () => {
      isMounted = false
    }
  }, [isOpen, projectId])

  useEffect(() => {
    if (!copied) {
      return
    }

    const timeout = window.setTimeout(() => setCopied(false), 1600)

    return () => window.clearTimeout(timeout)
  }, [copied])

  async function handleInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!canInvite || isInviting) {
      return
    }

    setIsInviting(true)
    setError(null)

    try {
      const response = await fetch(`/api/projects/${projectId}/collaborators`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: normalizedEmail,
        }),
      })
      const payload = await readJsonResponse<CollaboratorInviteResponse>(response)

      setCollaborators((currentCollaborators) => [
        ...currentCollaborators,
        payload.collaborator,
      ])
      setEmail("")
    } catch (inviteError) {
      setError(inviteError instanceof Error ? inviteError.message : "Could not invite collaborator.")
    } finally {
      setIsInviting(false)
    }
  }

  async function handleRemove(collaborator: Collaborator) {
    if (!serverCanManage || removingCollaboratorId) {
      return
    }

    setRemovingCollaboratorId(collaborator.id)
    setError(null)

    try {
      const response = await fetch(
        `/api/projects/${projectId}/collaborators/${collaborator.id}`,
        {
          method: "DELETE",
        }
      )

      if (!response.ok) {
        throw new Error(await readErrorMessage(response))
      }

      setCollaborators((currentCollaborators) =>
        currentCollaborators.filter((currentCollaborator) => currentCollaborator.id !== collaborator.id)
      )
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "Could not remove collaborator.")
    } finally {
      setRemovingCollaboratorId(null)
    }
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(projectLink)
      setCopied(true)
    } catch {
      setError("Could not copy the project link.")
    }
  }

  function handleOpenChange(nextIsOpen: boolean) {
    if (nextIsOpen) {
      setServerCanManage(canManage)
    } else {
      setEmail("")
      setError(null)
      setCopied(false)
      setServerCanManage(canManage)
    }

    onOpenChange(nextIsOpen)
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="gap-0 overflow-hidden rounded-3xl border border-surface-border bg-bg-elevated p-0 text-copy-primary shadow-2xl ring-0 sm:max-w-lg">
        <DialogHeader className="space-y-2 p-6 pr-12">
          <DialogTitle className="text-lg font-semibold text-copy-primary">
            Share Project
          </DialogTitle>
          <DialogDescription className="text-sm leading-6 text-copy-muted">
            Manage access to {projectName}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 px-6 pb-6">
          <div className="rounded-2xl border border-surface-border bg-bg-subtle/60 p-3">
            <p className="text-xs font-medium uppercase text-copy-faint">
              Project link
            </p>
            <div className="mt-2 flex min-w-0 items-center gap-2">
              <p className="min-w-0 flex-1 truncate font-mono text-xs text-copy-secondary">
                {projectLink}
              </p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleCopyLink}
                className="shrink-0"
              >
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                {copied ? "Copied!" : "Copy"}
              </Button>
            </div>
          </div>

          {serverCanManage ? (
            <form className="space-y-2" onSubmit={handleInvite}>
              <label className="block space-y-2">
                <span className="text-sm font-medium text-copy-secondary">
                  Invite by email
                </span>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="teammate@example.com"
                    aria-invalid={emailError !== null}
                    className="h-10 border-surface-border-subtle bg-bg-subtle text-copy-primary placeholder:text-copy-faint"
                  />
                  <Button type="submit" disabled={!canInvite || isInviting}>
                    <UserPlus className="h-4 w-4" />
                    Invite
                  </Button>
                </div>
              </label>
              {emailError ? (
                <p className="text-sm text-state-error">{emailError}</p>
              ) : null}
            </form>
          ) : null}

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-copy-primary">
                Collaborators
              </h3>
              {!serverCanManage ? (
                <span className="text-xs text-copy-muted">Read only</span>
              ) : null}
            </div>

            <div className="max-h-72 space-y-2 overflow-y-auto">
              {isLoading ? (
                <div className="rounded-2xl border border-dashed border-surface-border bg-bg-subtle/40 p-6 text-center text-sm text-copy-muted">
                  Loading collaborators...
                </div>
              ) : collaborators.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-surface-border bg-bg-subtle/40 p-6 text-center text-sm text-copy-muted">
                  No collaborators yet.
                </div>
              ) : (
                collaborators.map((collaborator) => (
                  <div
                    key={collaborator.id}
                    className="flex items-center gap-3 rounded-2xl border border-surface-border bg-bg-subtle/50 p-3"
                  >
                    <CollaboratorAvatar collaborator={collaborator} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-copy-primary">
                        {collaborator.displayName ?? collaborator.email}
                      </p>
                      {collaborator.displayName ? (
                        <p className="mt-1 truncate text-xs text-copy-muted">
                          {collaborator.email}
                        </p>
                      ) : null}
                    </div>
                    {serverCanManage ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Remove ${collaborator.email}`}
                        disabled={removingCollaboratorId !== null}
                        onClick={() => handleRemove(collaborator)}
                        className="text-copy-muted hover:bg-bg-elevated hover:text-state-error"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    ) : null}
                  </div>
                ))
              )}
            </div>

            {error ? <p className="text-sm text-state-error">{error}</p> : null}
          </section>
        </div>

        <DialogFooter className="rounded-none border-surface-border bg-bg-subtle/50 p-6">
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function CollaboratorAvatar({ collaborator }: { collaborator: Collaborator }) {
  const fallback = collaborator.displayName ?? collaborator.email
  const initials = fallback
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")

  if (collaborator.avatarUrl) {
    return (
      <div
        aria-hidden="true"
        className="h-9 w-9 shrink-0 rounded-xl border border-surface-border bg-cover bg-center"
        style={{ backgroundImage: `url(${collaborator.avatarUrl})` }}
      />
    )
  }

  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-surface-border bg-accent-dim text-xs font-semibold text-brand">
      {initials || "?"}
    </div>
  )
}

async function readJsonResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(await readErrorMessage(response))
  }

  return (await response.json()) as T
}

async function readErrorMessage(response: Response) {
  const fallback = "Sharing action failed."

  try {
    const payload = (await response.json()) as { error?: unknown }

    return typeof payload.error === "string" ? payload.error : fallback
  } catch {
    return fallback
  }
}
