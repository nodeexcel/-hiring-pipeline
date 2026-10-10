"use client";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

/** Keeps the admin header visible and offers a retry, instead of blanking the whole app. */
export default function AdminError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const forbidden = error.message.includes("permission");
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
      <h1 className="text-2xl font-medium">{forbidden ? "You do not have access" : "Something went wrong"}</h1>
      <p className="text-base text-muted-foreground">
        {forbidden
          ? "Your role cannot do that. Ask an admin if you need access."
          : `This page failed to load${error.digest ? ` (reference ${error.digest})` : ""}.`}
      </p>
      {!forbidden && <Button onClick={() => retry()}>Try again</Button>}
    </div>
  );
}
