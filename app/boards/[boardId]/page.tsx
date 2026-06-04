import { BoardClient } from "@/components/board-client";
import { getBoardPageData } from "@/lib/data";
import { requireUser, syncProfile } from "@/lib/auth";

export default async function BoardPage({
  params,
}: {
  params: Promise<{ boardId: string }>;
}) {
  await syncProfile();
  const user = await requireUser();
  const { boardId } = await params;
  const data = await getBoardPageData(boardId, user.id);

  return <BoardClient data={data} />;
}
