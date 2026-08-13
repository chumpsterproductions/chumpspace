import { DashboardShell } from "@/components/dashboard-shell";
import { getDashboardData } from "@/lib/data";
import { requireUser } from "@/lib/auth";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ workspace?: string; open?: string }>;
}) {
  const [user, params] = await Promise.all([requireUser(), searchParams]);
  const data = await getDashboardData(user.id);

  return (
    <DashboardShell
      data={data}
      initialWorkspaceId={params.open === "boards" ? params.workspace ?? null : null}
    />
  );
}
