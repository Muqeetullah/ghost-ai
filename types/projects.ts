export type ProjectOwnerType = "owned" | "shared";

export interface EditorProject {
  id: string;
  name: string;
  slug: string;
  ownerType: ProjectOwnerType;
  updatedAt: string;
}

export interface EditorProjectLists {
  ownedProjects: EditorProject[];
  sharedProjects: EditorProject[];
}
