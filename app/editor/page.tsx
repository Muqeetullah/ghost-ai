import { DatabaseUnavailable } from "@/components/editor/database-unavailable"
import { EditorScreen } from "@/components/editor/editor-screen"
import { isDatabaseUnavailableError } from "@/lib/database-errors"
import { getEditorProjectLists } from "@/lib/projects"

export default async function EditorPage() {
  let projectLists

  try {
    projectLists = await getEditorProjectLists()
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      return <DatabaseUnavailable />
    }

    throw error
  }

  return <EditorScreen {...projectLists} />
}
