import { NextRequest, NextResponse } from "next/server";

const PASSWORD = process.env.SITE_PASSWORD || "nutrienwater2024";

export async function POST(request: NextRequest) {
  const { password } = await request.json();

  if (password === PASSWORD) {
    const response = NextResponse.json({ success: true });
    response.cookies.set("site-auth", "true", {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
    return response;
  }

  return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
}
