// 로그인 처리: 입력한 비밀번호가 맞으면 확인표 쿠키를 주고 첫 화면으로 보낸다.

import { NextResponse } from "next/server";
import { AUTH_COOKIE, getSitePassword, makeAuthToken } from "@/lib/auth";

export async function POST(request: Request) {
  const expected = getSitePassword();
  if (!expected) {
    return new NextResponse("접속 비밀번호(SITE_PASSWORD)가 설정되지 않았습니다.", { status: 503 });
  }

  const form = await request.formData();
  const typed = String(form.get("password") ?? "");

  if (typed !== expected) {
    // 틀렸을 때 잠깐 기다리게 해서 계속 찍어 보는 시도를 늦춘다.
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return NextResponse.redirect(new URL("/login?error=1", request.url), 303);
  }

  const response = NextResponse.redirect(new URL("/", request.url), 303);
  response.cookies.set(AUTH_COOKIE, await makeAuthToken(expected), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7일
  });
  return response;
}
