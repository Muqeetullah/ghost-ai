import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { EditorScreen } from "@/components/editor/editor-screen"

export default async function EditorPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  return <EditorScreen />
}
