"use server";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { submitMachineTest } from "@/features/rounds/r3";
import { rateLimit } from "@/server/security/rate-limit";

export interface SubmitState {
  ok: boolean;
  message?: string;
  /** Echoed back so a rejected link is not lost when React resets the form. */
  github?: string;
}

export async function submitMachineTestAction(_prev: SubmitState, formData: FormData): Promise<SubmitState> {
  const token = String(formData.get("token") ?? "");
  const github = String(formData.get("github") ?? "");

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!rateLimit(`r3-submit:${ip}`, 20, 60_000).ok) {
    return { ok: false, message: "Too many attempts. Please wait a minute and try again.", github };
  }

  const zip = formData.get("zip");
  const out = await submitMachineTest(token, { github, zip: zip instanceof File ? zip : null });
  if (!out.ok) return { ok: false, message: out.error, github };

  revalidatePath(`/submit/${token}`);
  return { ok: true, message: "Submitted." };
}
