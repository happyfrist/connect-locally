import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, ShieldAlert } from "lucide-react";
import { useState } from "react";

/**
 * Terminal account states are explained here instead of exposing an app full of
 * queries that will fail. Server functions enforce the same state.
 */
export function AccountNotice({ status }: { status: "disabled" | "deleting" | "deleted" }) {
  const { signOut } = useAuth();
  const [busy, setBusy] = useState(false);

  const copy =
    status === "disabled"
      ? "This account has been disabled after a safety or policy review. Product access is revoked."
      : status === "deleting"
        ? "This account is being deleted. Access has already been revoked and cleanup is in progress."
        : "This account has been deleted. Its remaining records are an unidentified safety/audit tombstone.";

  const leave = async () => {
    setBusy(true);
    try {
      await signOut();
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-muted">
            <ShieldAlert className="size-5 text-muted-foreground" />
          </div>
          <CardTitle>Account unavailable</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center text-sm leading-6 text-muted-foreground">
          <p>{copy}</p>
          {status === "disabled" ? (
            <p className="text-xs">
              There is no staffed appeals channel in this prototype. A public
              launch requires a real, monitored appeal process before this notice
              can be used with members of the public.
            </p>
          ) : null}
          <Button className="w-full" onClick={leave} disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : null}
            Sign out
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
