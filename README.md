# Ghost AI

<p align="center">
  <strong>AI-assisted system design workspace for collaborative architecture planning and technical specification generation.</strong>
</p>

<p align="center">
  <a href="#tech-stack"><img alt="Next.js" src="https://img.shields.io/badge/Next.js-16.2.6-black?style=for-the-badge&logo=nextdotjs"></a>
  <a href="#tech-stack"><img alt="React" src="https://img.shields.io/badge/React-19.2-149ECA?style=for-the-badge&logo=react&logoColor=white"></a>
  <a href="#tech-stack"><img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white"></a>
  <a href="#tech-stack"><img alt="Prisma" src="https://img.shields.io/badge/Prisma-7.8-2D3748?style=for-the-badge&logo=prisma"></a>
  <a href="#tech-stack"><img alt="Trigger.dev" src="https://img.shields.io/badge/Trigger.dev-4.4-111827?style=for-the-badge"></a>
</p>

Ghost AI turns natural-language architecture prompts into editable system design diagrams, keeps collaborators synchronized in real time, and generates polished Markdown technical specifications from the final canvas. It is built as a full-stack Next.js workspace with authenticated project management, Liveblocks-powered multiplayer state, durable Trigger.dev AI workflows, Prisma/PostgreSQL metadata, and Vercel Blob artifact storage.

> Demo placeholder: add a short walkthrough GIF or video at `docs/media/ghost-ai-demo.mp4`.
>
> Screenshot placeholders: add product images at `docs/images/editor-canvas.png`, `docs/images/ai-sidebar.png`, and `docs/images/generated-spec.png`.

## Product Value

Ghost AI is designed for engineers, founders, and product teams who need to move quickly from a rough system idea to a concrete architecture artifact. Instead of keeping diagrams, AI chat, collaboration, and specs in separate tools, Ghost AI brings them into one shared workspace:

| Capability | Value |
| --- | --- |
| AI architecture generation | Converts a prompt into structured React Flow nodes and edges on the canvas. |
| Multiplayer editing | Lets teammates refine the same architecture with live cursors and presence. |
| Starter templates | Speeds up common designs such as monoliths, microservices, serverless, event-driven systems, and CI/CD flows. |
| Spec generation | Produces persistent Markdown technical specs from the current graph and project context. |
| Durable background work | Keeps long-running AI tasks out of request handlers and observable through Trigger.dev runs. |

## Tech Stack

| Layer | Technology | Purpose |
| --- | --- | --- |
| Framework | Next.js 16, React 19, TypeScript | Full-stack application with Server Component-first routing. |
| Styling | Tailwind CSS 4, shadcn/ui, Radix primitives, Lucide React | Dark technical workspace UI with composable primitives. |
| Authentication | Clerk | Sign-in, route protection, user identity, and account UI. |
| Database | Prisma 7, PostgreSQL, Prisma Accelerate/PG adapter | Project metadata, collaborators, task runs, and generated spec records. |
| Realtime canvas | Liveblocks, React Flow, `@liveblocks/react-flow` | Shared canvas state, presence, cursors, and collaborative graph editing. |
| Background jobs | Trigger.dev v4 | Durable AI design generation, spec generation, run metadata, and local worker tooling. |
| AI | AI SDK, Google Gemini | Structured architecture planning and Markdown spec generation. |
| Artifact storage | Vercel Blob | Private canvas snapshots and generated Markdown specs. |

## Architecture Overview

```mermaid
flowchart LR
  User["Authenticated user"] --> Next["Next.js app router"]
  Next --> Clerk["Clerk auth"]
  Next --> API["Route handlers"]
  API --> Prisma["Prisma + PostgreSQL"]
  API --> Liveblocks["Liveblocks rooms"]
  API --> Trigger["Trigger.dev tasks"]
  Trigger --> Gemini["Google Gemini via AI SDK"]
  Trigger --> Liveblocks
  Trigger --> Blob["Vercel Blob"]
  Blob --> Prisma
  Liveblocks --> Canvas["React Flow collaborative canvas"]
  Prisma --> Next
```

The application keeps responsibilities intentionally separated:

| Boundary | Responsibility |
| --- | --- |
| `app/` | Next.js routes, authenticated pages, route handlers, and API entry points. |
| `components/editor/` | Workspace chrome, canvas UI, AI sidebar, project sidebar, modals, and editor controls. |
| `components/ui/` | shadcn/ui foundation primitives. |
| `hooks/` | Client-side interaction hooks such as autosave, keyboard shortcuts, and project actions. |
| `lib/` | Server infrastructure for Prisma, Liveblocks, project access, generated specs, feeds, and validation helpers. |
| `trigger/` | Durable Trigger.dev tasks for AI design generation, spec generation, and health checks. |
| `types/` | Shared contracts for canvas nodes, AI status events, projects, and task payloads. |
| `prisma/` | Prisma schema, model files, and migrations. |
| `context/` | Product, architecture, UI, standards, workflow, and progress documentation. |

## Features

### Authenticated Project Workspace

- Clerk-backed sign-in and protected editor routes.
- Owned and shared project lists.
- Project creation, rename, delete, and collaborator management.
- Access checks enforced before every project mutation.

### Real-Time Collaborative Canvas

- Liveblocks room tokens issued only after project membership verification.
- React Flow graph synchronized through Liveblocks storage.
- Live cursors, participant avatars, presence metadata, and AI thinking state.
- Node creation, resize, inline label editing, color selection, custom shapes, edge labels, undo/redo, zoom controls, and keyboard shortcuts.

### Starter Architecture Templates

- Static graph templates can be imported into any active workspace.
- Templates share the same node and edge schema as user-created canvas content.
- Current library covers common architecture patterns and can be extended without database changes.

### AI Design Agent

- `POST /api/ai/design` validates access, creates an idempotent Trigger.dev run, and persists the run ID.
- `trigger/design-agent.ts` reads project context, interprets the prompt, generates canvas actions, and applies them into the Liveblocks room.
- AI activity is published back to the workspace through room events and status feeds.

### AI Spec Generation

- `POST /api/ai/spec` sends the current canvas snapshot and relevant chat history into a Trigger.dev workflow.
- `trigger/generate-spec.ts` generates a Markdown technical specification with Gemini Flash-Lite.
- Specs are saved to private Vercel Blob storage and linked through Prisma metadata.
- Authenticated users can preview and download generated specs.

## Key Technical Challenges Solved

| Challenge | Solution |
| --- | --- |
| Keeping AI work out of request handlers | Long-running generation runs in Trigger.dev tasks, while API routes only validate, authorize, trigger, and persist metadata. |
| Synchronizing AI and human edits | The design agent applies graph mutations directly to the Liveblocks-backed React Flow document, so generated changes appear in the same realtime state model as human edits. |
| Preventing duplicate AI runs | Design generation uses Trigger.dev idempotency keys derived from project, user, room, and prompt hash. |
| Protecting collaborative rooms | Liveblocks tokens are minted only after Clerk identity and project membership checks pass. |
| Separating metadata from large artifacts | PostgreSQL stores ownership and references; Vercel Blob stores canvas snapshots and Markdown specs. |
| Reducing slow AI spec runs | Spec prompts trim chat history, compress canvas context, use a bounded model output budget, and fail fast with an AI SDK timeout. |
| Handling database connection modes | Runtime Prisma connections normalize direct Prisma Postgres URLs to pooled hosts while CLI workflows can use direct URLs for migrations. |

## Folder Structure

```txt
ghost-ai/
|-- app/
|   |-- api/                         # Authenticated API routes
|   |-- editor/                      # Editor home and project workspace routes
|   |-- sign-in/                     # Clerk sign-in route
|   |-- sign-up/                     # Clerk sign-up route
|   |-- globals.css                  # Dark theme tokens and Tailwind mapping
|   `-- layout.tsx                   # Root app shell and providers
|-- components/
|   |-- auth/                        # Authentication layout composition
|   |-- editor/                      # Canvas, sidebar, navbar, dialogs, workspace UI
|   `-- ui/                          # shadcn/ui primitives
|-- context/                         # Product and engineering context docs
|-- generated/prisma/                # Generated Prisma client output
|-- hooks/                           # Client interaction hooks
|-- lib/                             # Server utilities, access control, Prisma, Liveblocks
|-- prisma/
|   |-- migrations/                  # Database migrations
|   |-- models/                      # Prisma model definitions
|   `-- schema.prisma                # Prisma schema entry
|-- trigger/                         # Trigger.dev v4 tasks
|-- types/                           # Shared TypeScript contracts
|-- liveblocks.config.ts             # Liveblocks type augmentation
|-- trigger.config.ts                # Trigger.dev deployment configuration
`-- prisma.config.ts                 # Prisma CLI configuration
```

## Getting Started

### Prerequisites

- Node.js 20 or newer
- npm
- PostgreSQL or Prisma Postgres
- Clerk application
- Liveblocks project
- Trigger.dev project
- Google AI API key
- Vercel Blob token for private artifact storage

### Installation

```bash
git clone <your-repository-url>
cd ghost-ai
npm install
```

Create a local environment file:

```bash
touch .env.local
```

Populate `.env.local` using the environment variable table below. If your branch includes an `.env.example`, you can copy that file instead.

Generate the Prisma client and apply migrations:

```bash
npx prisma generate
npx prisma migrate deploy
```

Start the Next.js app:

```bash
npm run dev
```

Start the Trigger.dev worker in a second terminal:

```bash
npm run trigger:dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Runtime database connection. Use a pooled Prisma Postgres URL when possible. |
| `DIRECT_URL` | Recommended | Direct database connection for Prisma migrations and admin operations. |
| `DIRECT_DATABASE_URL` | Optional | Alternate direct database URL used by `prisma.config.ts` when `DIRECT_URL` is absent. |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes | Clerk public browser key. |
| `CLERK_SECRET_KEY` | Yes | Clerk server secret key. |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | Recommended | Local sign-in route, usually `/sign-in`. |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | Recommended | Local sign-up route, usually `/sign-up`. |
| `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL` | Recommended | Post-auth redirect, usually `/editor`. |
| `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL` | Recommended | Post-sign-up redirect, usually `/editor`. |
| `LIVEBLOCKS_SECRET_KEY` | Yes | Server key for room creation, auth token issuance, presence, and room mutation. |
| `TRIGGER_PROJECT_REF` | Yes | Trigger.dev project reference used by `trigger.config.ts`. |
| `TRIGGER_SECRET_KEY` | Yes | Trigger.dev secret key for local and deployed workers. |
| `GOOGLE_AI_API_KEY` | Yes | Google AI API key used by design and spec generation tasks. |
| `BLOB_READ_WRITE_TOKEN` | Yes | Vercel Blob read/write token for private canvas and spec artifacts. |

Example database configuration for Prisma Postgres:

```bash
DATABASE_URL="postgres://USER:PASSWORD@pooled.db.prisma.io:5432/postgres?sslmode=require"
DIRECT_URL="postgres://USER:PASSWORD@db.prisma.io:5432/postgres?sslmode=require"
```

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Next.js development server. |
| `npm run build` | Create a production build. |
| `npm run start` | Run the production server after a build. |
| `npm run lint` | Run ESLint. |
| `npm run trigger:dev` | Start the Trigger.dev local worker with `.env.local`. |
| `npm run trigger:deploy` | Deploy Trigger.dev tasks. |
| `npx prisma generate` | Generate the Prisma client in `generated/prisma`. |
| `npx prisma migrate deploy` | Apply committed migrations to the configured database. |

## API Integration

| Route | Method | Responsibility |
| --- | --- | --- |
| `/api/projects` | `GET` | List owned and shared projects for the authenticated user. |
| `/api/projects` | `POST` | Create a new project. |
| `/api/projects/[projectId]` | `PATCH` | Rename or update a project owned by the user. |
| `/api/projects/[projectId]` | `DELETE` | Delete an owned project. |
| `/api/projects/[projectId]/collaborators` | `GET` | List project collaborators. |
| `/api/projects/[projectId]/collaborators` | `POST` | Invite a collaborator by email. |
| `/api/projects/[projectId]/collaborators/[collaboratorId]` | `DELETE` | Remove a collaborator. |
| `/api/liveblocks-auth` | `POST` | Verify project access and issue a Liveblocks room token. |
| `/api/projects/[projectId]/canvas` | `GET` | Load the saved canvas snapshot from Vercel Blob. |
| `/api/projects/[projectId]/canvas` | `PUT` | Persist the latest canvas snapshot to Vercel Blob. |
| `/api/ai/design` | `POST` | Trigger the durable AI design-agent workflow. |
| `/api/ai/design/token` | `POST` | Issue a Trigger.dev public token scoped to a stored design run. |
| `/api/ai/spec` | `POST` | Trigger Markdown spec generation from the current canvas. |
| `/api/ai/spec/token` | `POST` | Issue a Trigger.dev public token scoped to a stored spec run. |
| `/api/projects/[projectId]/specs` | `GET` | List generated project specs. |
| `/api/projects/[projectId]/specs/[specId]` | `GET` | Preview a generated Markdown spec. |
| `/api/projects/[projectId]/specs/[specId]/download` | `GET` | Download a generated Markdown spec. |

## Data Model

The core relational model is intentionally small:

| Model | Description |
| --- | --- |
| `Project` | Owned architecture workspace with optional canvas snapshot reference. |
| `ProjectCollaborator` | Email-based collaborator access for a project. |
| `TaskRun` | Stored Trigger.dev run IDs tied to project and user ownership. |
| `ProjectSpec` | Metadata reference to a generated Markdown spec stored in Vercel Blob. |

Canvas nodes, edges, and generated Markdown content are not stored directly in relational rows. Large artifacts live in Vercel Blob and are referenced by URL from Prisma records.

## Performance Optimizations

- Server Component-first routing keeps client JavaScript scoped to interactive editor surfaces.
- Debounced canvas autosave limits artifact writes while preserving explicit manual save controls.
- Liveblocks stores collaborative graph state and presence without polling.
- Trigger.dev moves AI generation out of request-response latency paths.
- Spec generation trims chat history, filters repetitive assistant status messages, limits prompt size, and caps model output.
- Prisma client is cached in development to avoid connection churn during hot reloads.
- Runtime database URLs are normalized toward pooled Prisma Postgres hosts for application traffic.
- Generated specs and canvas snapshots are stored as Blob artifacts instead of inflating relational tables.

## Deployment

### Vercel App

1. Create a Vercel project connected to this repository.
2. Configure all required environment variables.
3. Apply database migrations:

```bash
npx prisma migrate deploy
```

4. Build and deploy the app:

```bash
npm run build
```

### Trigger.dev Workers

Deploy durable tasks after environment variables are configured:

```bash
npm run trigger:deploy
```

Trigger.dev production and staging schedules/runs execute against the latest deployed worker version.

### Production Checklist

- Clerk production instance and allowed redirect URLs are configured.
- Liveblocks production project secret is set.
- Trigger.dev project reference and secret key are set.
- Google AI key is scoped and rotated according to team policy.
- Vercel Blob token is available in the deployment environment.
- Database migrations are deployed before routing production traffic.

## Future Improvements

- Role-based permissions beyond owner and collaborator.
- Versioned spec history with review and approval workflows.
- First-class diagram export to PNG, SVG, and PDF.
- Template marketplace or organization-scoped starter libraries.
- Observability dashboard for Trigger.dev task latency, AI usage, and failure rates.
- Automated end-to-end tests for authenticated canvas and spec generation flows.
- Fine-grained project activity audit log.
- Object lifecycle policies for archived canvas snapshots and specs.

## Contributing

Contributions should preserve the system boundaries documented in `context/architecture-context.md` and the implementation rules in `context/code-standards.md`.

1. Create a focused branch.
2. Read the relevant files in `context/` before changing behavior.
3. Keep route handlers thin and move long-running work to Trigger.dev tasks.
4. Validate external input at API and task boundaries.
5. Run verification before opening a pull request:

```bash
npm run lint
npx tsc --noEmit
npm run build
```

For UI work, follow the dark-only token system in `app/globals.css` and reuse `components/ui/` primitives rather than modifying generated foundation components.

## License

License information has not been added yet. Add a `LICENSE` file before publishing this repository publicly.
