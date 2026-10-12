// 접속 비밀번호 확인에 쓰는 공통 함수. (proxy.ts와 로그인 처리에서 함께 쓴다)
// 비밀번호 자체는 쿠키에 담지 않고, 비밀번호로 만든 '확인표(해시)'만 담는다.

export const AUTH_COOKIE = "site-auth";

// 서버 환경변수 SITE_PASSWORD (.env 또는 Vercel 환경변수에만 둔다)
export function getSitePassword(): string | undefined {
  const value = process.env.SITE_PASSWORD;
  return value && value.length > 0 ? value : undefined;
}

// 비밀번호 → 확인표(SHA-256 해시, 16진수 글자)
export async function makeAuthToken(password: string): Promise<string> {
  const bytes = new TextEncoder().encode(`postal-staffing-auth:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
