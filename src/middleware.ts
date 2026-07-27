import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (pathname === "/cadastro") {
    return NextResponse.redirect(new URL("/seller/cadastro", request.url), {
      status: 301,
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/cadastro"],
};
