import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { gmailAuthorizationUrl, createGmailState } from "@/lib/gmail-oauth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.redirect(new URL("/?auth_error=login_required", request.url));

  try {
    const state = createGmailState();
    const response = NextResponse.redirect(gmailAuthorizationUrl(new URL(request.url).origin, state));
    response.cookies.set("rutasaldo_gmail_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api/integrations/gmail/callback",
      maxAge: 10 * 60,
    });
    return response;
  } catch (error) {
    console.error("[gmail-oauth] connect failed", error);
    return NextResponse.redirect(new URL("/configuracion?gmail=not_configured", request.url));
  }
}
