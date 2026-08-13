import { BoardClient } from "@/components/board-client";
import { getBoardPageData } from "@/lib/data";
import { requireUser } from "@/lib/auth";

export default async function BoardPage({
  params,
}: {
  params: Promise<{ boardId: string }>;
}) {
  const [user, { boardId }] = await Promise.all([requireUser(), params]);
  const data = await getBoardPageData(boardId, user.id);

  return <BoardClient data={data} />;
}
