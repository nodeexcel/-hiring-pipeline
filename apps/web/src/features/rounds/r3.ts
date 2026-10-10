import "server-only";
import { z } from "zod";
import { adminDb } from "@/server/db/admin";
import { err, ok, type Outcome } from "./result";

const MAX_ZIP_BYTES = 25 * 1024 * 1024;
const GITHUB = /^https:\/\/(www\.)?github\.com\/[\w.-]+\/[\w.-]+(\/.*)?$/;

export const tokenSchema = z.string().min(16).max(128).regex(/^[\w-]+$/);
export const githubSchema = z.string().trim().max(300).regex(GITHUB);

/** Records a take-home submission: either a GitHub link or a zip, never both, once. */
export async function submitMachineTest(
  token: string,
  input: { github: string; zip: File | null },
): Promise<Outcome<{ late: boolean }>> {
  if (!tokenSchema.safeParse(token).success) return err(404, "This link is not valid.");

  const db = adminDb();
  const { data: a } = await db.from("r3_assignments").select("*").eq("token", token).maybeSingle();
  if (!a) return err(404, "This link is not valid.");
  if (a.submitted_at) return err(409, "You have already submitted this task.");

  const hasZip = !!input.zip && input.zip.size > 0;
  let filePath: string | null = null;
  let github: string | null = null;

  if (hasZip) {
    const zip = input.zip!;
    if (!zip.name.toLowerCase().endsWith(".zip")) return err(400, "Upload a .zip file.");
    if (zip.size > MAX_ZIP_BYTES) return err(400, "The zip file must be under 25 MB.");
    filePath = `${a.candidate_id}/${token}.zip`;
    const { error } = await db.storage.from("r3-submissions").upload(filePath, zip, { upsert: true, contentType: "application/zip" });
    if (error) return err(500, "We could not store your file. Please try again.");
  } else {
    const parsed = githubSchema.safeParse(input.github);
    if (!parsed.success) return err(400, "Enter a GitHub repository link (https://github.com/owner/repo) or choose a zip file.");
    github = parsed.data;
  }

  const now = new Date();
  const late = now > new Date(a.deadline);
  const { error } = await db
    .from("r3_assignments")
    .update({ submitted_at: now.toISOString(), is_late: late, github_url: github, file_path: filePath })
    .eq("id", a.id)
    .is("submitted_at", null); // guards against a double submit racing past the check above
  if (error) return err(500, "We could not save your submission. Please try again.");

  await db.from("candidates").update({ status: "R3 submitted" }).eq("id", a.candidate_id);
  return ok({ late });
}
