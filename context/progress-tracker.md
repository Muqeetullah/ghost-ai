# Progress Tracker

Update this file whenever the current phase, active feature, or implementation state changes.

## Current Phase

- Foundation setup

## Current Goal

- Await the next scoped feature from the project context.

## Completed

- Design system and UI primitives setup from `context/feature-specs/01-design-system.md`.
- Editor chrome components from `context/feature-specs/02-editor.md`: navbar, floating project sidebar shell, and dialog content pattern.
- Editor screen composition mounting the navbar and project sidebar on `/`.
- Authentication wiring from `context/feature-specs/03-auth.md`: Clerk provider, auth pages, proxy route protection, root redirects, and editor user menu.
- Authentication page UI polish for sign-in and sign-up screens.
- Authenticated user menu positioning and account modal backdrop opacity fix.
- Clerk protected-route redirects now use the embedded local auth pages.
- Project dialogs and editor home from `context/feature-specs/04-project-dialogs.md`: mock project lists, owned-project actions, create/rename/delete dialogs, live slug preview, and mobile sidebar scrim.
- Current issue fix for project creation: created mock projects now appear in the sidebar, and invalid special characters block submission instead of being silently stripped from the slug preview.

## In Progress

- None.

## Next Up

- Begin the next scoped feature from the project context.

## Open Questions

- None.

## Architecture Decisions

- Add decisions that affect the system design or data model.

## Session Notes

- 2026-05-14: Started current issue fix for project creation sidebar updates and invalid project name validation.
- 2026-05-14: Completed current issue fix for project creation sidebar updates and invalid name validation. Moved mock projects into editor state, wired create/rename/delete mutations, added name validation, blocked invalid submits, and verified with lint, `tsc --noEmit`, and production build.
- 2026-05-14: Started project dialogs and editor home implementation from `context/feature-specs/04-project-dialogs.md`.
- 2026-05-14: Completed project dialogs and editor home implementation. Added mock owned/shared project data, wired create/rename/delete dialog flows through a dedicated hook, added live slug preview, and added the mobile sidebar scrim. Verified with lint, `tsc --noEmit`, and production build; in-app browser verification was blocked by the client for localhost.
- 2026-05-11: Started design-system foundation setup. Scope is shadcn/ui configuration, specified primitives, lucide-react, and shared `cn()` utility.
- 2026-05-11: Confirmed design-system foundation remains in progress before implementation verification.
- 2026-05-11: Completed design-system foundation setup. Verified shadcn primitives, `lucide-react`, shared `cn()`, and dark Ghost AI theme tokens with lint and production build.
- 2026-05-11: Added root `.gitignore` with baseline Next.js/Node ignores for dependencies, build artifacts, logs, env files, and OS/editor noise.
- 2026-05-11: Started editor chrome implementation from `context/feature-specs/02-editor.md`.
- 2026-05-11: Completed editor chrome components. Added reusable navbar/sidebar shells and dialog content pattern, then verified with lint and production build.
- 2026-05-11: Mounted the editor navbar and floating project sidebar on `/` using a small client screen shell. Verified with lint and production build.
- 2026-05-14: Closed `ProjectSidebar` removes descendants from the focus order via `inert={!isOpen}` alongside existing `aria-hidden` and transform. Verified with lint and `tsc --noEmit`.
- 2026-05-14: Started authentication wiring from `context/feature-specs/03-auth.md`.
- 2026-05-14: Completed authentication wiring. Added ClerkProvider dark-theme configuration, sign-in/sign-up pages, root `proxy.ts` protection, `/` auth redirects, `/editor`, and the editor `UserButton`. Installed `@clerk/ui`. Verified with lint and production build.
- 2026-05-14: Started authentication page UI polish pass.
- 2026-05-14: Completed authentication page UI polish. Added mode-specific auth shell copy, refined mobile brand header and desktop split panel, and tightened Clerk form appearance with existing CSS variables. Verified with lint, production build, and in-app browser checks for sign-in and sign-up.
- 2026-05-14: Started authenticated user menu positioning and account modal backdrop opacity fix.
- 2026-05-14: Completed authenticated user menu fix. Split compact `UserButton` Clerk appearance from full-width auth form appearance, added a lower-opacity modal backdrop token, and applied it to Clerk modal styling. Verified with lint and production build; in-app browser was signed out, so `/editor` redirected to Clerk sign-in during visual check.
- 2026-05-14: Started Clerk local auth redirect fix based on `context/current-issues/current-issues.md`.
- 2026-05-14: Completed Clerk local auth redirect fix. Passed explicit sign-in and sign-up URLs into `clerkMiddleware`, verified lint and production build, and confirmed `/editor` redirects to local `/sign-in` when signed out.
