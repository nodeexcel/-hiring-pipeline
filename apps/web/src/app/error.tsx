"use client";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

/** Catches unexpected runtime errors in any route segment below the root layout. */
export default function RootError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-medium">Something went wrong</h1>
      <p className="text-base text-muted-foreground">
        We could not load this page. Try again, and if it keeps happening contact the team
        {error.digest ? ` with reference ${error.digest}` : ""}.
      </p>
      <Button onClick={() => retry()}>Try again</Button>
    </main>
  );
}
