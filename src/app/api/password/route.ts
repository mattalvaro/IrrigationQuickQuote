import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const PASSWORD = process.env.SITE_PASSWORD;

export async function POST(request: NextRequest) {
  if (!PASSWORD) {
    return NextResponse.json({ error: "Password not configured" }, { status: 500 });
  }

  const { password } = await request.json();

  if (password === PASSWORD) {
    const token = crypto.createHmac("sha256", PASSWORD).update("authenticated").digest("hex");
    const response = NextResponse.json({ success: true });
    response.cookies.set("site-auth", token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
    return response;
  }

  return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
}
