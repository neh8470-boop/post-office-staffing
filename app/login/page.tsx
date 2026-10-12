// 접속 비밀번호 입력 화면

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 p-6">
      <h1 className="text-xl font-bold">우체국 인력 운영기준 분석</h1>
      <p className="text-sm text-gray-600">내부용 서비스입니다. 접속 비밀번호를 입력해 주세요.</p>
      <form action="/api/login" method="post" className="flex flex-col gap-3">
        <label htmlFor="password" className="text-sm font-medium">
          접속 비밀번호
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoFocus
          autoComplete="current-password"
          className="rounded border border-gray-400 px-3 py-2"
        />
        {error ? (
          <p role="alert" className="text-sm text-red-600">
            비밀번호가 맞지 않습니다. 다시 입력해 주세요.
          </p>
        ) : null}
        <button type="submit" className="rounded bg-blue-700 px-3 py-2 font-medium text-white">
          들어가기
        </button>
      </form>
    </main>
  );
}
