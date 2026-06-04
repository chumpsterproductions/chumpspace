import { DashboardShell } from "@/components/dashboard-shell";
import { getDashboardData } from "@/lib/data";
import { requireUser, syncProfile } from "@/lib/auth";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ workspace?: string; open?: string }>;
}) {
  await syncProfile();
  const user = await requireUser();
  const data = await getDashboardData(user.id);
  const params = await searchParams;

  return (
    <DashboardShell
      data={data}
      initialWorkspaceId={params.open === "boards" ? params.workspace ?? null : null}
    />
  );
}
