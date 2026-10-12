"use client";

import { useState, type ReactNode } from "react";

const TABS = [
  { id: "calc", label: "소요 인력 계산" },
  { id: "reference", label: "참고자료" },
] as const;

// 맨 위 탭. 탭을 바꿔도 계산 화면에 입력한 값이 사라지지 않도록, 두 화면을 모두 그려 두고 안 보이는 쪽만 숨긴다.
export default function AppTabs({ calc, reference }: { calc: ReactNode; reference: ReactNode }) {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("calc");

  return (
    <div>
      <div role="tablist" aria-label="화면 선택" className="mb-6 flex gap-1 border-b border-zinc-300 dark:border-zinc-700">
        {TABS.map((t) => {
          const active = t.id === tab;
          return (
            <button
              key={t.id}
              id={`tab-${t.id}`}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls={`panel-${t.id}`}
              onClick={() => setTab(t.id)}
              className={`-mb-px rounded-t-md border px-4 py-2 text-sm font-medium ${
                active
                  ? "border-zinc-300 border-b-white bg-white text-blue-700 dark:border-zinc-700 dark:border-b-zinc-950 dark:bg-zinc-950 dark:text-blue-300"
                  : "border-transparent text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>
      <div id="panel-calc" role="tabpanel" aria-labelledby="tab-calc" hidden={tab !== "calc"}>
        {calc}
      </div>
      <div id="panel-reference" role="tabpanel" aria-labelledby="tab-reference" hidden={tab !== "reference"}>
        {reference}
      </div>
    </div>
  );
}
