"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/client";
import { isSupabaseConfigured } from "@/lib/supabase-config";

export function useSignOut() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const signOut = useCallback(async () => {
    setPending(true);
    if (isSupabaseConfigured()) {
      const supabase = createClient();
      await supabase.auth.signOut();
    }
    router.push("/login");
    router.refresh();
  }, [router]);

  return { signOut, pending };
}

export function SignOutButton({ className }: { className?: string }) {
  const { signOut, pending } = useSignOut();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={signOut}
      className={cn(
        "border-border bg-background/80 text-foreground hover:bg-muted",
        className
      )}
    >
      {pending ? "Signing out…" : "Sign out"}
    </Button>
  );
}
