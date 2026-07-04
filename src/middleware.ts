import { NextResponse, type NextRequest } from "next/server";

// Minimal pass-through middleware.
// (The Supabase session refresh was removed: it pulls Node-only APIs into the
//  Edge runtime, which breaks the Netlify build. Auth still works — the browser
//  client persists the session and server components read it from cookies.)
export function middleware(_request: NextRequest) {
  return NextResponse.next();
}

// Run on nothing by default (effectively disabled). Re-enable later if needed.
export const config = {
  matcher: ["/__disabled__"],
};
