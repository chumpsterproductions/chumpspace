import { redirect } from "next/navigation";
import { AuthPanel } from "@/components/auth-panel";
import { getSessionUser } from "@/lib/auth";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const user = await getSessionUser();

  if (user != null) {
    redirect("/dashboard");
  }

  const params = await searchParams;

  return (
    <main className="grainy-bg min-h-screen px-4 py-6 sm:px-6 lg:px-8 lowercase">
      <div className="mx-auto grid min-h-[92vh] max-w-4xl place-items-center">
        <AuthPanel error={params.error} message={params.message} />
      </div>
    </main>
  );
}
