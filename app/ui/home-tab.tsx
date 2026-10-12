"use client";

import { REFERENCE_SECTIONS, REGULATION_FULL_NAME } from "@/lib/reference";
import { useNav, type TabId } from "./nav";

type TocItem = { label: string; tab: TabId; targetId?: string; refSection?: string };
type TocGroup = { no: string; title: string; tab: TabId; desc: string; items: TocItem[] };

// 목차: 각 화면과 그 안의 항목. 항목을 누르면 해당 화면의 그 위치로 이동한다.
const TOC: TocGroup[] = [
  {
    no: "1",
    title: "처음 화면",
    tab: "home",
    desc: "지금 보고 계신 화면입니다. 서비스 소개와 사용 방법을 안내합니다.",
    items: [
      { label: "서비스 소개", tab: "home", targetId: "home-intro" },
      { label: "누가, 왜 쓰나요?", tab: "home", targetId: "home-why" },
      { label: "할 수 있는 일", tab: "home", targetId: "home-features" },
      { label: "사용 방법", tab: "home", targetId: "home-steps" },
      { label: "알아 두실 점", tab: "home", targetId: "home-notes" },
    ],
  },
  {
    no: "2",
    title: "소요 인력 계산",
    tab: "calc",
    desc: "관서의 업무량을 넣으면 필요한 인력을 계산하고, 계산식과 근거 조문을 함께 보여 줍니다.",
    items: [
      { label: "전체 정리표 — 총괄국별 소요 인력을 한 표로", tab: "calc", targetId: "calc-summary" },
      { label: "총괄국 선택 · 관서 선택", tab: "calc", targetId: "calc-group" },
      { label: "업무량 엑셀 올리기", tab: "calc", targetId: "calc-upload" },
      { label: "총괄국 전체 소요 인력 (합계)", tab: "calc", targetId: "calc-total" },
      { label: "관서별 산출 결과 — 계산식과 근거 조문", tab: "calc", targetId: "calc-result" },
      { label: "입력 항목 직접 고쳐 보기", tab: "calc", targetId: "calc-inputs-우편창구" },
    ],
  },
  {
    no: "3",
    title: "참고자료",
    tab: "reference",
    desc: `${REGULATION_FULL_NAME}의 별표를 정리해 둔 자료입니다.`,
    items: REFERENCE_SECTIONS.map((s) => ({ label: s.title, tab: "reference" as const, refSection: s.id })),
  },
];

const FEATURES = [
  {
    title: "소요 인력 자동 계산",
    body: "관서의 세입·물량 같은 업무량을 규정(별표 2)의 산출식에 넣어 필요한 인력을 계산합니다. 우편창구와 우편마케팅 분야를 계산합니다.",
  },
  {
    title: "계산 근거를 함께 표시",
    body: "결과마다 적용한 계산식과 근거 조문을 같이 보여 줘서, 왜 그 인력이 나왔는지 바로 확인할 수 있습니다.",
  },
  {
    title: "엑셀로 한꺼번에 불러오기",
    body: "업무량 엑셀 파일을 올리면 화면에 있는 모든 관서의 값이 한 번에 채워집니다. 파일은 서버로 보내지 않고 이 브라우저 안에서만 읽습니다.",
  },
  {
    title: "규정 별표 열람",
    body: "1인당 연간 근무 일수, 우체국·우편집중국 소요인력 산출 기준, 기타직원 환산기준 등 규정의 별표를 참고자료 탭에서 볼 수 있습니다.",
  },
];

const STEPS = [
  { title: "총괄국을 고릅니다", body: "‘소요 인력 계산’ 탭에서 총괄국을 고르면 그 총괄국과 소속국들이 나옵니다." },
  { title: "업무량을 넣습니다", body: "업무량 엑셀을 올리거나, 입력칸에 값을 직접 넣습니다. 미리 채워진 값을 고쳐 볼 수도 있습니다." },
  { title: "소요 인력을 확인합니다", body: "관서별 인력과 총괄국 전체 합계, 계산식과 근거 조문이 바로 나옵니다." },
  { title: "규정이 궁금하면 참고자료를 봅니다", body: "‘참고자료’ 탭에서 계산에 쓰인 규정의 별표를 확인합니다." },
];

const NOTES = [
  "테스트용이며 내부 자료입니다. 외부에 공개하지 마세요.",
  "업무량과 기준값(모수)은 2025년 자료를 기준으로 합니다.",
  "우편창구와 우편마케팅만 계산합니다. 금융창구·우체국 발착·지원지도 등은 참고자료로만 제공합니다.",
  "입력한 값은 저장되지 않습니다. 화면을 새로고침하면 처음 자료로 돌아갑니다.",
  "담당자가 계산한 값과 비교해 전남지방우정청 323개 관서가 모두 일치함을 확인했습니다. 계산 결과는 참고용입니다.",
];

export default function HomeTab({ groupCount, officeCount }: { groupCount: number; officeCount: number }) {
  const { goTo } = useNav();

  return (
    <div className="space-y-10">
      {/* 서비스 소개 */}
      <section id="home-intro" className="scroll-mt-4 rounded-xl border border-blue-200 bg-blue-50 p-6 dark:border-blue-900 dark:bg-blue-950">
        <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">서비스 소개</p>
        <h2 className="mt-1 text-2xl font-bold text-blue-950 dark:text-blue-50">현업관서 적정 소요 인력, 규정대로 계산해 드립니다</h2>
        <p className="mt-3 leading-7 text-blue-950/90 dark:text-blue-100/90">
          국가법령정보센터에 올라 있는 「{REGULATION_FULL_NAME}」에 따라, 현업관서의 규모와 업무량을 분석하고 적정 인력 운영기준을 판단해 주는
          서비스입니다.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => goTo("calc")}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            소요 인력 계산하러 가기
          </button>
          <button
            type="button"
            onClick={() => goTo("reference")}
            className="rounded-md border border-blue-300 bg-white px-4 py-2 text-sm font-medium text-blue-900 hover:bg-blue-100 dark:bg-blue-900 dark:text-blue-100"
          >
            규정 별표 보기
          </button>
        </div>
        <p className="mt-4 text-sm text-blue-900/80 dark:text-blue-200/80">
          지금 담겨 있는 자료: 전남지방우정청 총괄국 {groupCount}곳과 소속국, 총 {officeCount}개 관서
        </p>
      </section>

      {/* 누가, 왜 쓰나요? */}
      <section id="home-why" className="scroll-mt-4">
        <h2 className="mb-3 text-xl font-bold">누가, 왜 쓰나요?</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
            <h3 className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">누가</h3>
            <p className="mt-1 leading-7">현업관서의 소요 인력을 산정하고 정리하는 담당 직원</p>
          </div>
          <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
            <h3 className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">왜</h3>
            <p className="mt-1 leading-7">
              현재는 담당 직원이 약 2,478개 우체국의 소요 인력을 일일이 모아 정리하느라 시간을 많이 쓰고 있습니다. 공문과 엑셀로 자료를 받아 규정에 따라
              계산하는 데 전체를 모으는 것만 약 1개월이 걸립니다. 이 서비스는 그 계산을 규정에 따라 자동으로 하고, 근거까지 함께 보여 줍니다.
            </p>
          </div>
        </div>
      </section>

      {/* 할 수 있는 일 */}
      <section id="home-features" className="scroll-mt-4">
        <h2 className="mb-3 text-xl font-bold">할 수 있는 일</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
              <h3 className="font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm leading-6 text-zinc-700 dark:text-zinc-300">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 사용 방법 */}
      <section id="home-steps" className="scroll-mt-4">
        <h2 className="mb-3 text-xl font-bold">사용 방법</h2>
        <ol className="space-y-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">{i + 1}</span>
              <div>
                <p className="font-semibold">{s.title}</p>
                <p className="text-sm leading-6 text-zinc-700 dark:text-zinc-300">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* 목차 */}
      <section id="home-toc" className="scroll-mt-4">
        <h2 className="mb-1 text-xl font-bold">목차</h2>
        <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">항목을 누르면 해당 화면의 그 위치로 이동합니다.</p>
        <div className="grid gap-4 lg:grid-cols-3">
          {TOC.map((g) => (
            <nav key={g.no} aria-label={`${g.title} 목차`} className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
              <h3 className="font-semibold">
                <button type="button" onClick={() => goTo(g.tab)} className="text-left hover:text-blue-700 hover:underline dark:hover:text-blue-300">
                  {g.no}. {g.title}
                </button>
              </h3>
              <p className="mt-1 text-xs leading-5 text-zinc-600 dark:text-zinc-400">{g.desc}</p>
              <ul className="mt-3 space-y-1.5 border-t border-zinc-100 pt-3 text-sm dark:border-zinc-900">
                {g.items.map((item, i) => (
                  <li key={item.label}>
                    <button
                      type="button"
                      onClick={() => goTo(item.tab, { targetId: item.targetId, refSection: item.refSection })}
                      className="flex w-full gap-2 text-left text-zinc-800 hover:text-blue-700 hover:underline dark:text-zinc-200 dark:hover:text-blue-300"
                    >
                      <span className="shrink-0 text-zinc-400">
                        {g.no}-{i + 1}
                      </span>
                      <span>{item.label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </section>

      {/* 알아 두실 점 */}
      <section id="home-notes" className="scroll-mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950">
        <h2 className="mb-2 text-lg font-bold text-amber-950 dark:text-amber-100">알아 두실 점</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm leading-6 text-amber-950/90 dark:text-amber-100/90">
          {NOTES.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
