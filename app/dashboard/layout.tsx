import { redirect } from "next/navigation";
import { ActiveOrgProvider } from "@/components/active-org-provider";
import { AuthSessionProvider } from "@/components/auth-session-provider";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { WorkspaceGate } from "@/components/workspace-gate";
import { createClient } from "@/lib/server";
import { isSupabaseConfigured } from "@/lib/supabase-config";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  if (!isSupabaseConfigured()) {
    redirect("/login?error=config");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const email = user.email ?? null;

  return (
    <AuthSessionProvider>
      <ActiveOrgProvider>
        <DashboardShell email={email}>
          <WorkspaceGate>{children}</WorkspaceGate>
        </DashboardShell>
      </ActiveOrgProvider>
    </AuthSessionProvider>
  );
}
