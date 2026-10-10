/**
 * The rules a candidate accepts before Round 1. Plain, sentence case, no em dashes.
 * Served by the API so wording can change without an app release; the numbers come from settings.
 */
export const RULES_VERSION = "2026-10-1";

export function round1Rules(questionCount: number, durationMinutes: number): string[] {
  return [
    `This test has ${questionCount} questions and lasts ${durationMinutes} minutes. The timer starts when you tap Start and cannot be paused.`,
    "You have one attempt. Closing the app does not stop the timer.",
    "Turn your internet off before you start. The test will not begin while you are online.",
    "Stay in the app. Leaving it, switching apps or turning the internet back on during the test is recorded and shown to the reviewer.",
    "Do not take screenshots or recordings, and do not copy the questions.",
    "Work alone. Do not use another person, another device or any website. Rough paper is allowed.",
    "Changing the clock on your phone does not affect the timer.",
    "Your answers are saved securely on your device. When you submit, or when time ends, turn the internet back on to upload them.",
    "Do not uninstall the app or clear its data until your answers are uploaded.",
    "The hiring team shares results with you. They are not shown in the app.",
  ];
}
