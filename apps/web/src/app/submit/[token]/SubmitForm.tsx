"use client";
import { useActionState } from "react";
import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { submitMachineTestAction, type SubmitState } from "./actions";

const initial: SubmitState = { ok: true };

export function SubmitForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(submitMachineTestAction, initial);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <FormField label="GitHub repository link">
        <Input name="github" placeholder="https://github.com/you/project" defaultValue={state.github ?? ""} maxLength={300} />
      </FormField>
      <p className="text-center text-xs text-muted-foreground">or</p>
      <FormField label="Zip file (max 25 MB)">
        <Input
          name="zip"
          type="file"
          accept=".zip,application/zip"
          className="h-auto py-2 file:mr-3 file:rounded file:border-0 file:bg-muted file:px-2 file:py-1 file:text-xs"
        />
      </FormField>
      {state.message && !state.ok && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {state.message}
        </p>
      )}
      <Button type="submit" variant="solid" disabled={pending}>
        {pending ? "Submitting" : "Submit"}
      </Button>
      <p className="text-xs text-muted-foreground">Replies by email are not accepted. You can submit once.</p>
    </form>
  );
}
