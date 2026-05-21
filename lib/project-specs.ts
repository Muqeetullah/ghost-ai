import { del, put } from "@vercel/blob"

import { prisma } from "@/lib/prisma"

interface PersistProjectSpecInput {
  projectId: string
  projectName: string
  markdown: string
}

interface PersistedProjectSpec {
  id: string
  filePath: string
  createdAt: Date
}

export async function persistProjectSpec(
  input: PersistProjectSpecInput
): Promise<PersistedProjectSpec> {
  const pathname = buildProjectSpecPathname(input.projectId, input.projectName)
  const blob = await put(pathname, input.markdown, {
    access: "private",
    addRandomSuffix: true,
    contentType: "text/markdown; charset=utf-8",
  })

  try {
    const projectSpec = await prisma.projectSpec.create({
      data: {
        projectId: input.projectId,
        filePath: blob.url,
      },
      select: {
        id: true,
        filePath: true,
        createdAt: true,
      },
    })

    return projectSpec
  } catch (error) {
    await del(blob.url).catch(() => undefined)
    throw error
  }
}

export function buildProjectSpecDownloadFilename(
  projectName: string,
  specId: string
) {
  return `${slugifyProjectName(projectName)}-${specId}.md`
}

export function getProjectSpecFilename(filePath: string, specId: string) {
  try {
    const url = new URL(filePath)
    const pathnameSegments = url.pathname.split("/")
    const filename = pathnameSegments[pathnameSegments.length - 1]?.trim()

    if (filename) {
      return filename
    }
  } catch {
    // Fall back to a stable local filename when the blob URL cannot be parsed.
  }

  return `project-spec-${specId}.md`
}

function buildProjectSpecPathname(projectId: string, projectName: string) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-")

  return `specs/${projectId}/${slugifyProjectName(projectName)}-${timestamp}.md`
}

function slugifyProjectName(projectName: string) {
  const slug = projectName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

  return slug || "project-spec"
}
