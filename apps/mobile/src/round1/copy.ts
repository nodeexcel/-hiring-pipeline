/** Candidate-facing strings in one place. Sentence case, plain, no em dashes. */
export const copy = {
  appName: "Hiring pipeline",
  codeTitle: "Aptitude test",
  codeLead: "Enter the invite code from your email. You need internet for this step only.",
  codeHint: "The code has 10 letters and numbers.",
  rulesTitle: "Rules and regulations",
  rulesLead: "Read these carefully. You must accept them to continue.",
  rulesAccept: "I have read and accept these rules",
  downloading: "Preparing your paper",
  readyTitle: "Ready when you are",
  offlineNeeded: "Turn off Wi-Fi and mobile data to begin. The test will not start while you are online.",
  offlineOk: "Internet is off. You can start.",
  onlineWarn: "Internet is on.",
  submitTitle: "Submit your answers?",
  doneTitle: "Thank you",
  doneBody: "Your answers were submitted. The hiring team will contact you about next steps.",
  uploadHint: "Turn your internet back on to upload your answers. They are safe on this device.",
  timeUp: "Time is up. Your answers are being submitted.",
} as const;

export function userMessage(status: number | undefined, fallback: string): string {
  if (status === 404) return "We could not find that invite code. Check it and try again.";
  if (status === 409) return fallback || "This test is not available for this code.";
  if (status === 429) return "Too many attempts. Please wait a minute and try again.";
  if (status === 503) return "The test is not ready yet. Please try again later.";
  if (status === undefined) return "We could not reach the server. Check your connection and try again.";
  return fallback || "Something went wrong. Please try again.";
}
