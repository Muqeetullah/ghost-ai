import { EditorScreen } from "@/components/editor/editor-screen"
import { getEditorProjectLists } from "@/lib/projects"

export default async function EditorPage() {
  const projectLists = await getEditorProjectLists()

  return <EditorScreen {...projectLists} />
}
