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
- Verified review fixes: current issue notes untracked while ignored locally, project dialog submit cleanup is guaranteed with async try/finally, and the project dialog spec now explicitly permits scoped sidebar changes.
- Prisma schema and data layer from `context/feature-specs/05-prisma.md`: Project and ProjectCollaborator models, Prisma schema folder setup, cached Prisma singleton with Prisma Postgres/direct Postgres branching, generated client, and applied migration.
- Backend project API routes from `context/feature-specs/06-project-apis.md`: list/create owned projects, rename/delete with owner checks, route-level `401` and `403` responses, and project route proxy handoff.
- Editor home real project API wiring from `context/feature-specs/07-wire-editor-home.md`: server-loaded owned/shared project lists, real create/rename/delete mutations, room ID preview, workspace navigation, active workspace route, and delete redirect/refresh behavior.
- Editor workspace shell from `context/feature-specs/08-editor-workspace-shell.md`: `/editor/[roomId]` server component, project access helper, access denied state, active project workspace layout, canvas placeholder, and AI sidebar placeholder.
- Share dialog from `context/feature-specs/09-share-dialog.md`: workspace share button, collaborator invite/list/remove APIs, owner-only management, read-only collaborator view, Clerk user enrichment, and project-link copy feedback.
- Liveblocks realtime setup from `context/feature-specs/10-liveblock-setup.md`: typed Liveblocks presence/user metadata, cached node client, deterministic cursor colors, private room creation, and Clerk-backed auth token route.
- Base collaborative canvas from `context/feature-specs/11-base-canvas.md`: Liveblocks room wrapper, suspense and error states, React Flow state synced through `useLiveblocksFlow`, shared canvas node/edge types, MiniMap, loose connections, fit view, and dot-pattern background.
- Bottom shape panel from `context/feature-specs/12-shape-panel.md`: floating bottom shape toolbar, drag payloads with shape and default size data, canvas dragover/drop handling, new custom canvas nodes, shape-based node IDs, and basic bordered node rendering.
- Node shape rendering and drag preview from `context/feature-specs/13-node-shape.md`: CSS-rendered rectangle, pill, and circle nodes; SVG-rendered diamond, hexagon, and cylinder nodes; selected/resting border states; and cursor-following ghost previews sourced from the existing drag payload.
- Shape panel accessibility fix: shape toolbar buttons now support click, Enter, and Space insertion in addition to drag-and-drop.
- Node resizing and inline label editing from `context/feature-specs/14-node-editing.md`: selected nodes show resize handles with minimum dimensions, node labels open centered inline textarea editing on double-click, labels update through shared node data, and editing closes on blur or Escape.
- Node color toolbar from `context/feature-specs/15-nodes-color-toolbar.md`: selected nodes show a floating color toolbar with predefined fill/text swatches, swatch selection updates collaborative node data, active swatches are clearly indicated, and node fill/text colors update immediately.
- Edge rendering polish: registered the shared `canvasEdge` type with a custom smooth-step renderer and aligned starter template edges to explicit node handles for cleaner imported connections.
- Canvas ergonomics from `context/feature-specs/17-canvas-ergonomics.md`: bottom-left zoom/history control bar, animated React Flow zoom and fit view actions, Liveblocks undo/redo buttons with disabled states, and keyboard shortcuts that skip editable fields.
- Starter template imports from `context/feature-specs/18-starter-template.md`: curated template data, import modal with lightweight diagram previews, navbar entry point, and template replacement through the collaborative canvas flow.

## In Progress

- None.

## Next Up

- Begin the next scoped feature from the project context.

## Open Questions

- None.

## Architecture Decisions

- Add decisions that affect the system design or data model.

## Session Notes

- 2026-05-16: Polished template edge rendering. Root cause was imported template edges using the shared `canvasEdge` type without a registered renderer or explicit handle anchors, while live-created edges were not persisted with the shared edge type. Added a focused `CanvasEdgeRenderer`, registered it in React Flow, made new edges use `canvasEdge`, and added source/target handles to starter template edges. Verified with lint, `tsc --noEmit`, and production build.
- 2026-05-16: Completed starter template imports implementation. Added curated microservices, CI/CD pipeline, and event-driven system templates using shared canvas types and node colors; added a scrollable import modal with fixed-size SVG previews calculated from node bounds; wired the workspace navbar Templates action to replace existing collaborative nodes and edges, then fit the view after load. Verified with lint, `tsc --noEmit`, and production build; in-app browser smoke was blocked by `ERR_BLOCKED_BY_CLIENT`.
- 2026-05-16: Started starter template imports implementation from `context/feature-specs/18-starter-template.md`.
- 2026-05-16: Completed canvas ergonomics implementation. Added the bottom-left zoom/history control bar above the shape panel, wired zoom out/fit view/zoom in to the React Flow instance with short animations, wired undo/redo to Liveblocks history with disabled states, and added `hooks/useKeyboardShortcuts.ts` for zoom and history shortcuts while skipping editable fields. Verified with lint, `tsc --noEmit`, and production build.
- 2026-05-16: Started canvas ergonomics implementation from `context/feature-specs/17-canvas-ergonomics.md`.
- 2026-05-16: Completed node color toolbar implementation. Added a selected-node floating swatch toolbar above canvas nodes, reused the predefined node fill/text pairs, updated color changes through React Flow node data for Liveblocks sync, and added tight active/hover swatch glow styling. Verified with lint, `tsc --noEmit`, and production build; in-app browser verification was blocked by `ERR_BLOCKED_BY_CLIENT`, and the local dev server could not be started because Next reported an existing dev-server lock for PID 62233.
- 2026-05-16: Started node color toolbar implementation from `context/feature-specs/15-nodes-color-toolbar.md`.
- 2026-05-16: Fixed node dragging from the center label area by only applying `nodrag`/`nopan` while inline label editing is active. Verified with lint, `tsc --noEmit`, and production build.
- 2026-05-16: Refined inline node label editing to remove the separate textarea background/border treatment and allow wrapped text to remain visible inside the node label area. Verified with lint, `tsc --noEmit`, and production build.
- 2026-05-16: Completed node resizing and inline label editing implementation. Added selected-node resize handles with minimum dimensions, centered placeholder and label display, double-click inline textarea editing, shared label updates via React Flow node data, blur/Escape edit closing, and drag/pan event isolation for text editing. Verified with lint, `tsc --noEmit`, and production build; browser smoke reached the expected signed-out redirect to `/sign-in`, so authenticated canvas interaction was not visually checked.
- 2026-05-16: Started node resizing and inline label editing implementation from `context/feature-specs/14-node-editing.md`.
- 2026-05-16: Verified the shape panel keyboard-accessibility finding as still valid. Added click, Enter, and Space insertion paths for shape buttons using the existing shape payload and shared canvas node creation helper, preserved drag-and-drop behavior, and verified with lint, `tsc --noEmit`, and production build.
- 2026-05-16: Completed node shape rendering and drag preview implementation. Replaced the placeholder canvas node body with shape-specific rendering, reused the same shape surface for the drag ghost, kept node creation unchanged, and verified with lint, `tsc --noEmit`, and production build. In-app browser verification was blocked by `ERR_BLOCKED_BY_CLIENT`, and a second local dev server could not stay running because the project already had a Next dev-server lock for PID 62233.
- 2026-05-16: Started node shape rendering and drag preview implementation from `context/feature-specs/13-node-shape.md`.
- 2026-05-16: Completed bottom shape panel implementation. Added draggable shape buttons for rectangle, diamond, circle, pill, cylinder, and hexagon; encoded shape and default size in the drag payload; added React Flow dragover/drop handling that creates Liveblocks-synced custom canvas nodes with default color and empty labels; added a basic bordered `canvasNode` renderer with four connection handles; and verified with lint, `tsc --noEmit`, and production build. In-app browser verification reached the local sign-in redirect on the existing dev server, so authenticated canvas drag/drop was not visually checked.
- 2026-05-16: Started bottom shape panel implementation from `context/feature-specs/12-shape-panel.md`.
- 2026-05-15: Completed base collaborative canvas implementation. Added shared canvas node/edge types, typed Liveblocks flow storage, created the Liveblocks-backed React Flow canvas wrapper with suspense and connection error fallback, replaced the workspace placeholder with the live canvas, imported React Flow/Liveblocks styles globally, and verified with lint, `tsc --noEmit`, and production build.
- 2026-05-15: Started base collaborative canvas implementation from `context/feature-specs/11-base-canvas.md`.
- 2026-05-15: Completed Liveblocks realtime collaboration setup. Added typed `liveblocks.config.ts` Presence and UserMeta, installed and cached `@liveblocks/node`, added deterministic cursor color generation, created `POST /api/liveblocks-auth` with Clerk auth, project access verification, private room creation, and scoped session tokens with user metadata. Verified with lint, `tsc --noEmit`, and production build.
- 2026-05-15: Started Liveblocks realtime collaboration setup from `context/feature-specs/10-liveblock-setup.md`.
- 2026-05-15: Completed share dialog implementation. Added collaborator list/invite/remove project API routes, enforced owner-only invite/remove on the server, enriched collaborator emails from Clerk when available with email fallback, wired the workspace Share button to a role-aware dialog, added copy-link feedback, and verified with lint, `tsc --noEmit`, production build, and a signed-out route redirect smoke check.
- 2026-05-15: Started share dialog implementation from `context/feature-specs/09-share-dialog.md`.
- 2026-05-15: Completed editor workspace shell implementation. Added server-side access checks for `/editor/[roomId]`, created `lib/project-access.ts`, added the `AccessDenied` state, moved the active workspace route from `[projectId]` to `[roomId]`, built the workspace layout with project sidebar, canvas placeholder, navbar actions, and AI placeholder sidebar, and verified with lint, `tsc --noEmit`, production build, and a signed-out browser redirect check.
- 2026-05-15: Started editor workspace shell implementation from `context/feature-specs/08-editor-workspace-shell.md`.
- 2026-05-14: Limited shared-project collaborator lookups to verified Clerk email addresses only.
- 2026-05-14: Updated editor project list unauthenticated redirects to use `NEXT_PUBLIC_CLERK_SIGN_IN_URL` with `/sign-in` fallback.
- 2026-05-14: Fixed project creation duplicate ID handling by removing the non-atomic pre-check and mapping Prisma `P2002` create failures to `409`.
- 2026-05-14: Fixed Prisma Accelerate URL detection so both `prisma://` and `prisma+postgres://` database URLs use the Accelerate client path instead of the direct Postgres adapter.
- 2026-05-14: Completed editor home real project API wiring. Added server-side project list loading, moved project mutations into `hooks/use-project-actions.ts`, wired sidebar rows to `/editor/[projectId]`, added room ID creation aligned to project IDs, and verified with lint, `tsc --noEmit`, and production build.
- 2026-05-14: Started editor home real project API wiring from `context/feature-specs/07-wire-editor-home.md`.
- 2026-05-14: Completed backend project API route implementation. Added REST handlers for list/create/rename/delete, used Clerk user IDs as project owners, enforced owner-only rename/delete, allowed project API routes to return route-level `401` JSON, and verified with lint, `tsc --noEmit`, and production build.
- 2026-05-14: Started backend project API route implementation from `context/feature-specs/06-project-apis.md`.
- 2026-05-14: Started verified review fixes for untracking current issue notes, hardening project dialog submit cleanup, and resolving project dialog spec wording.
- 2026-05-14: Completed verified review fixes. Confirmed all three findings were valid, untracked local current issue notes while preserving the `.gitignore` entry, hardened project dialog submit cleanup with async `try/finally`, resolved the project dialog spec sidebar wording conflict, and verified with lint, `tsc --noEmit`, and production build.
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
- 2026-05-14: Completed Prisma Postgres setup end to end. Installed Prisma runtime dependencies, restored `DATABASE_URL` into ignored `.env` from local env, added Prisma schema/config and generated client output, applied the initial migration, added seed data and a server-only Prisma singleton, verified a live database read, and kept secrets out of logs.
- 2026-05-14: Started Prisma schema and data layer implementation from `context/feature-specs/05-prisma.md`.
- 2026-05-14: Completed Prisma schema and data layer implementation. Moved models into `prisma/models/project.prisma`, added `ProjectStatus`, `Project`, and `ProjectCollaborator` with the requested indexes and cascade relation, updated `lib/prisma.ts` to branch between Prisma Postgres Accelerate URLs and direct `@prisma/adapter-pg`, applied the project data layer migration, regenerated the client, and verified with Prisma status, lint, `tsc --noEmit`, and production build.
