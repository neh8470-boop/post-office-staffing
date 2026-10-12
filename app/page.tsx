import { loadMosu } from "@/lib/mosu";
import { loadOfficeGroups } from "@/lib/offices";
import { countWorkdays, WORK_YEAR } from "@/lib/workdays";
import OfficeForm from "./ui/office-form";

export default async function Home() {
  const [groups, mosu] = await Promise.all([loadOfficeGroups(), loadMosu()]);
  const total = groups?.reduce((sum, g) => sum + g.offices.length, 0) ?? 0;

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">우체국 인력 운영기준 분석</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {groups ? groups.map((g) => g.name).join("·") : "총괄국"}과 소속국({total}곳)의 우편창구·우편마케팅 입력값으로 소요 인력을
          산출합니다. (테스트용 · 내부 자료 · {WORK_YEAR}년 기준)
        </p>
      </header>

      {groups && mosu ? (
        <OfficeForm groups={groups} mosu={mosu} workdays={countWorkdays(WORK_YEAR)} />
      ) : (
        <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
          관서·모수 자료(data/offices.json, data/mosu.json)를 찾을 수 없습니다. 내부 자료는 git에
          올라가지 않으므로, 이 컴퓨터의 data 폴더에 파일이 있어야 합니다.
        </p>
      )}
    </main>
  );
}
