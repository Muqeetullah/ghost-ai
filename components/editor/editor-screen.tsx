"use client"

import { useState } from "react"

import { EditorNavbar } from "@/components/editor/editor-navbar"
import { ProjectSidebar } from "@/components/editor/project-sidebar"

export function EditorScreen() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-base text-copy-primary">
      <EditorNavbar
        isSidebarOpen={isSidebarOpen}
        onSidebarToggle={() => setIsSidebarOpen((isOpen) => !isOpen)}
        centerContent={
          <span className="truncate text-sm font-medium text-copy-secondary">
            Ghost AI Editor
          </span>
        }
      />
      <ProjectSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <main className="relative min-h-0 flex-1 bg-base">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--border-default)_1px,transparent_1px)] bg-[length:24px_24px]" />
        <div className="relative flex h-full min-h-[calc(100vh-3.5rem)] items-center justify-center px-6 text-center">
          <div>
            <h1 className="text-2xl font-semibold tracking-normal text-copy-primary">
              Canvas workspace
            </h1>
            <p className="mt-3 text-sm leading-6 text-copy-muted">
              The editor chrome is mounted and ready for the canvas layer.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
