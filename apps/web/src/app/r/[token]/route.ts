import { NextResponse } from "next/server";
import { adminDb } from "@/server/db/admin";
import { env } from "@/server/env";

/** Click-tracking redirect: counts link clicks instead of unreliable email opens. */
export async function GET(_req: Request, ctx: RouteContext<"/r/[token]">) {
  const { token } = await ctx.params;
  const db = adminDb();
  const { data } = await db.from("email_log").select("id,target_url,clicks").eq("click_token", token).maybeSingle();
  if (!data?.target_url) return NextResponse.redirect(new URL("/", env().APP_URL));
  await db.from("email_log").update({ clicks: data.clicks + 1 }).eq("id", data.id);
  return NextResponse.redirect(data.target_url);
}
