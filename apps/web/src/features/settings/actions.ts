"use server";
import { revalidatePath } from "next/cache";
import { done, failed, type ActionState } from "@/lib/action-state";
import { parseForm } from "@/lib/form";
import { adminDb } from "@/server/db/admin";
import { requireAdmin } from "@/server/auth";
import { settingsFormSchema } from "./schemas";

export async function saveSettings(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  // Unchecked checkboxes are absent from FormData, which the schema reads as false.
  const { data: v, error } = parseForm(formData, settingsFormSchema);
  if (error) return error;

  const db = adminDb();
  const { data: current } = await db.from("round_config").select("round,settings");
  const existing = new Map((current ?? []).map((r) => [r.round, (r.settings ?? {}) as Record<string, unknown>]));

  const seb = { ...(existing.get(2) ?? {}) };
  if (v.seb_key) seb.seb_config_key = v.seb_key;
  else delete seb.seb_config_key;

  const rows = [
    { round: 1, cutoff: v.cutoff_1, weight: v.weight_1, auto_advance: v.auto_1, settings: { ...(existing.get(1) ?? {}), questions: v.r1_questions, duration_minutes: v.r1_duration, max_per_topic: v.r1_max_per_topic } },
    { round: 2, cutoff: v.cutoff_2, weight: v.weight_2, auto_advance: v.auto_2, settings: { ...seb, duration_minutes: v.r2_duration, problem_count: v.r2_problem_count, enforce_seb: v.enforce_seb } },
    { round: 3, cutoff: v.cutoff_3, weight: v.weight_3, auto_advance: v.auto_3, settings: { ...(existing.get(3) ?? {}), deadline_days: v.r3_days } },
  ];
  const results = await Promise.all(rows.map((r) => db.from("round_config").update({ cutoff: r.cutoff, weight: r.weight, auto_advance: r.auto_advance, settings: r.settings as never }).eq("round", r.round)));
  if (results.some((r) => r.error)) return failed("Could not save the settings.");

  revalidatePath("/admin/settings");
  return done("Settings saved.");
}
