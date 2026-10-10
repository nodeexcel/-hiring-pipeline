import "server-only";
import { Resend } from "resend";
import { adminDb } from "@/server/db/admin";
import { env } from "@/server/env";
import { renderEmail, type EmailTemplate } from "./templates";

export type { EmailTemplate } from "./templates";

/** RFC 2606 reserved names can never receive mail: log them instead of calling the provider. */
const RESERVED = /@(.+\.)?(example\.(com|org|net)|test|invalid|localhost)$/i;

export async function sendEmail(args: {
  candidateId: string | null;
  to: string;
  template: EmailTemplate;
  vars: Record<string, string>;
}): Promise<void> {
  const e = env();
  const db = adminDb();
  const msg = renderEmail(args.template, args.vars, e.APP_URL);

  const { data: row } = await db
    .from("email_log")
    .insert({
      candidate_id: args.candidateId,
      template: args.template,
      to_email: args.to,
      subject: msg.subject,
      target_url: msg.cta ?? null,
    })
    .select("id,click_token")
    .single();
  if (!row) return;

  const link = msg.cta && row.click_token ? `${e.APP_URL}/r/${row.click_token}` : null;
  const html = link ? `${msg.html}<p><a href="${link}">Open</a></p>` : msg.html;

  if (!e.RESEND_API_KEY || RESERVED.test(args.to)) {
    console.log(`[email:dev] to=${args.to} template=${args.template} subject="${msg.subject}" link=${link ?? "-"}`);
    await db.from("email_log").update({ status: "logged" }).eq("id", row.id);
    return;
  }

  try {
    const { data, error } = await new Resend(e.RESEND_API_KEY).emails.send({
      from: e.EMAIL_FROM,
      to: args.to,
      subject: msg.subject,
      html,
    });
    await db
      .from("email_log")
      .update(error ? { status: "failed", error: error.message } : { status: "sent", provider_id: data?.id })
      .eq("id", row.id);
  } catch (err) {
    await db.from("email_log").update({ status: "failed", error: String(err) }).eq("id", row.id);
  }
}
