import { NextRequest, NextResponse } from "next/server";

const PASSWORD = process.env.SITE_PASSWORD || "nutrienwater2024";

export function middleware(request: NextRequest) {
  const isAuthenticated = request.cookies.get("site-auth")?.value === "true";

  // Allow the password API route through
  if (request.nextUrl.pathname === "/api/password") {
    return NextResponse.next();
  }

  // Allow other API routes through (e.g. /api/leads)
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Allow static assets through
  if (
    request.nextUrl.pathname.startsWith("/_next") ||
    request.nextUrl.pathname.startsWith("/css") ||
    request.nextUrl.pathname.startsWith("/favicon")
  ) {
    return NextResponse.next();
  }

  if (isAuthenticated) {
    return NextResponse.next();
  }

  // Return password page
  return new NextResponse(passwordPage(), {
    status: 200,
    headers: { "Content-Type": "text/html" },
  });
}

function passwordPage() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Required</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #f0f4f0;
    }
    .card {
      background: white;
      padding: 2.5rem;
      border-radius: 12px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.1);
      width: 100%;
      max-width: 380px;
    }
    h1 { font-size: 1.25rem; margin-bottom: 0.5rem; color: #1a1a1a; }
    p { font-size: 0.875rem; color: #666; margin-bottom: 1.5rem; }
    input {
      width: 100%;
      padding: 0.75rem 1rem;
      border: 1px solid #ddd;
      border-radius: 8px;
      font-size: 1rem;
      margin-bottom: 1rem;
      outline: none;
    }
    input:focus { border-color: #16a34a; box-shadow: 0 0 0 3px rgba(22,163,74,0.1); }
    button {
      width: 100%;
      padding: 0.75rem;
      background: #16a34a;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
    }
    button:hover { background: #15803d; }
    .error { color: #dc2626; font-size: 0.875rem; margin-bottom: 1rem; display: none; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Password Required</h1>
    <p>Enter the password to access this site.</p>
    <form id="form">
      <div class="error" id="error">Incorrect password. Try again.</div>
      <input type="password" id="password" placeholder="Enter password" autofocus />
      <button type="submit">Enter</button>
    </form>
  </div>
  <script>
    document.getElementById('form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const password = document.getElementById('password').value;
      const res = await fetch('/api/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      if (res.ok) {
        window.location.reload();
      } else {
        document.getElementById('error').style.display = 'block';
        document.getElementById('password').value = '';
        document.getElementById('password').focus();
      }
    });
  </script>
</body>
</html>`;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
