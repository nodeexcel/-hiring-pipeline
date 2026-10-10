import "server-only";

export type EmailTemplate = "invite" | "round2_invite" | "round3_task" | "rejection" | "selected";

export interface RenderedEmail {
  subject: string;
  html: string;
  /** Primary call to action. Sent through /r/[token] so clicks are counted. */
  cta?: string;
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Pure: same inputs, same email. Candidate-supplied values are HTML-escaped. */
export function renderEmail(template: EmailTemplate, vars: Record<string, string>, appUrl: string): RenderedEmail {
  const v = Object.fromEntries(Object.entries(vars).map(([k, val]) => [k, esc(val)]));
  switch (template) {
    case "invite":
      return {
        subject: "Your interview invitation: Round 1 (Aptitude)",
        cta: `${appUrl}/test/r1`,
        html: `<p>Hi ${v.name},</p><p>You have been invited to the first round of our interview process.</p>
<p>Your invite code: <b>${v.code}</b></p>
<p>Take the aptitude test in the mobile app, or on the web at the link below. Enter the code when prompted.</p>`,
      };
    case "round2_invite":
      return {
        subject: "Round 2: Coding test",
        cta: `${appUrl}/test/r2`,
        html: `<p>Hi ${v.name},</p><p>Congratulations, you cleared Round 1. Round 2 is a coding test on a laptop.</p>
<p>Use your invite code <b>${v.code}</b>. Install Safe Exam Browser (free) and open the exam config linked below.</p>`,
      };
    case "round3_task":
      return {
        subject: `Round 3: Machine test, ${vars.task}`,
        cta: `${appUrl}/submit/${encodeURIComponent(vars.token)}`,
        html: `<p>Hi ${v.name},</p><p>Final round: a take-home task.</p><p><b>${v.task}</b></p><p>${v.brief}</p>
<p>Deadline: <b>${v.deadline}</b>. Submit a GitHub link or zip through the link below. Replies by email are not accepted.</p>`,
      };
    case "rejection":
      return {
        subject: "Update on your application",
        html: `<p>Hi ${v.name},</p><p>Thank you for your time. After reviewing your results we will not be moving forward at this stage.</p>`,
      };
    case "selected":
      return {
        subject: "Good news from the hiring team",
        html: `<p>Hi ${v.name},</p><p>We are delighted to let you know you have been selected. We will be in touch with next steps.</p>`,
      };
  }
}
