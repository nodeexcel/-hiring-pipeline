import "server-only";
import { r1SettingsSchema, r2SettingsSchema, r3SettingsSchema } from "@app/shared";
import { userDb } from "@/server/db/user";
import { requireStaff } from "@/server/auth";

/** The three round configs with their JSON settings parsed into known shapes. */
export async function getRoundSettings() {
  await requireStaff();
  const db = await userDb();
  const { data } = await db.from("round_config").select("*").order("round");
  const byRound = new Map((data ?? []).map((r) => [r.round, r]));
  const base = (n: number) => {
    const r = byRound.get(n);
    return { cutoff: Number(r?.cutoff ?? 50), weight: Number(r?.weight ?? 0), autoAdvance: r?.auto_advance ?? true, raw: r?.settings ?? {} };
  };
  const [c1, c2, c3] = [base(1), base(2), base(3)];
  return {
    r1: { ...c1, settings: r1SettingsSchema.parse(c1.raw) },
    r2: { ...c2, settings: r2SettingsSchema.parse(c2.raw) },
    r3: { ...c3, settings: r3SettingsSchema.parse(c3.raw) },
  };
}
