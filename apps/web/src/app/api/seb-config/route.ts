import { NextResponse } from "next/server";
import { env } from "@/server/env";

/**
 * Starter Safe Exam Browser config (plain XML plist) pointing at the R2 page.
 * Open it once in SEB Config Tool, review/save, and paste the resulting Config Key into
 * Admin → Cutoffs so /api/r2/start can verify X-SafeExamBrowser-ConfigKeyHash.
 * Not validated against a real SEB install in this repo's tests.
 */
export function GET() {
  const start = `${env().APP_URL}/test/r2`;
  const bool = (k: string, v: boolean) => `\t<key>${k}</key>\n\t<${v}/>`;
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
\t<key>startURL</key>
\t<string>${start}</string>
${bool("sendBrowserExamKey", true)}
${bool("URLFilterEnable", true)}
${bool("allowQuit", true)}
${bool("enablePrintScreen", false)}
${bool("enableRightMouse", false)}
${bool("allowSwitchToApplications", false)}
</dict>
</plist>
`;
  return new NextResponse(xml, {
    headers: {
      "content-type": "application/xml",
      "content-disposition": 'attachment; filename="interview-r2.seb"',
    },
  });
}
