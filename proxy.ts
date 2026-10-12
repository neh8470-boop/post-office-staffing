// 접속 비밀번호 문지기: 화면과 데이터가 나가기 전에 비밀번호 확인을 마쳤는지 본다.
// 확인을 마치지 않았으면 로그인 화면(/login)으로 보낸다.

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AUTH_COOKIE, getSitePassword, makeAuthToken } from "@/lib/auth";

export async function proxy(request: NextRequest) {
  const password = getSitePassword();

  if (!password) {
    // 개발용 컴퓨터에서는 비밀번호 없이 열린다. 배포(운영) 환경에서 비밀번호가 없으면 아예 열지 않는다.
    if (process.env.NODE_ENV === "production") {
      return new NextResponse("접속 비밀번호(SITE_PASSWORD)가 설정되지 않아 접속할 수 없습니다.", { status: 503 });
    }
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;
  // 로그인 화면과 로그인 처리는 비밀번호 없이도 열려야 한다.
  if (pathname === "/login" || pathname === "/api/login") return NextResponse.next();

  const cookie = request.cookies.get(AUTH_COOKIE)?.value;
  if (cookie && cookie === (await makeAuthToken(password))) return NextResponse.next();

  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  // 화면 꾸미기 파일(_next/static, _next/image)과 아이콘은 자료가 없으므로 제외한다.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
