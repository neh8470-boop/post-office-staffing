import { loadMosu } from "@/lib/mosu";
import { loadOfficeGroups } from "@/lib/offices";
import { countWorkdays, WORK_YEAR } from "@/lib/workdays";
import AppTabs from "./ui/app-tabs";
import FreeCalc from "./ui/free-calc";
import HomeTab from "./ui/home-tab";
import OfficeForm from "./ui/office-form";
import ReferenceTab from "./ui/reference-tab";

export default async function Home() {
  const [groups, mosu] = await Promise.all([loadOfficeGroups(), loadMosu()]);
  const total = groups?.reduce((sum, g) => sum + g.offices.length, 0) ?? 0;

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">우체국 인력 운영기준 분석</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">테스트용 · 내부 자료 · {WORK_YEAR}년 기준</p>
      </header>

      {/* 내부 자료(data 폴더)가 없어도 처음 화면과 참고자료는 열리고, 계산 탭에만 안내를 보여 준다. */}
      <AppTabs
        home={<HomeTab groupCount={groups?.length ?? 0} officeCount={total} />}
        calc={groups && mosu ? <OfficeForm groups={groups} mosu={mosu} workdays={countWorkdays(WORK_YEAR)} /> : <NoData />}
        free={mosu ? <FreeCalc mosu={mosu} /> : <NoData />}
        reference={<ReferenceTab />}
      />
    </main>
  );
}

function NoData() {
  return (
    <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
      관서·모수 자료(data/groups.json, data/mosu.json)를 찾을 수 없습니다. 내부 자료는 git에
      올라가지 않으므로, 이 컴퓨터의 data 폴더에 파일이 있어야 계산할 수 있습니다.
    </p>
  );
}
