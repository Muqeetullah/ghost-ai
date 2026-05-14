import { EditorScreen } from "@/components/editor/editor-screen";
import { getEditorProjectLists } from "@/lib/projects";
import { notFound } from "next/navigation";

export default async function ProjectWorkspacePage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const projectLists = await getEditorProjectLists();
  const activeProject = [
    ...projectLists.ownedProjects,
    ...projectLists.sharedProjects,
  ].find((project) => project.id === projectId);

  if (!activeProject) {
    notFound();
  }

  return <EditorScreen {...projectLists} activeProjectId={projectId} />;
}
