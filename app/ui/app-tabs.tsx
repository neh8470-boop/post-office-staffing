"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import { REFERENCE_SECTIONS } from "@/lib/reference";
import { NavContext, type GoToOptions, type TabId } from "./nav";

const TABS: { id: TabId; label: string }[] = [
  { id: "home", label: "처음 화면" },
  { id: "calc", label: "소요 인력 계산" },
  { id: "reference", label: "참고자료" },
];

// 맨 위 탭. 탭을 바꿔도 계산 화면에 입력한 값이 사라지지 않도록, 세 화면을 모두 그려 두고 안 보이는 쪽만 숨긴다.
export default function AppTabs({
  home,
  calc,
  reference,
}: {
  home: ReactNode;
  calc: ReactNode;
  reference: ReactNode;
}) {
  const [tab, setTab] = useState<TabId>("home"); // 처음 접속하면 홈 화면이 보인다
  const [refSection, setRefSection] = useState(REFERENCE_SECTIONS[0].id);

  // 목차에서 다른 화면의 특정 위치로 이동한다. 탭이 보이게 된 뒤에 그 위치로 스크롤한다.
  const goTo = useCallback((next: TabId, options?: GoToOptions) => {
    if (options?.refSection) setRefSection(options.refSection);
    setTab(next);
    window.setTimeout(() => {
      const el = options?.targetId ? document.getElementById(options.targetId) : null;
      // 부드러운 이동(smooth)은 창이 가려져 있으면 멈추므로, 어떤 환경에서도 확실히 이동하도록 바로 이동한다.
      if (el) el.scrollIntoView({ block: "start" });
      else window.scrollTo({ top: 0 });
    }, 80);
  }, []);

  const nav = useMemo(() => ({ tab, refSection, setRefSection, goTo }), [tab, refSection, goTo]);

  const panels: Record<TabId, ReactNode> = { home, calc, reference };

  return (
    <NavContext.Provider value={nav}>
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
                onClick={() => goTo(t.id)}
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
        {TABS.map((t) => (
          <div key={t.id} id={`panel-${t.id}`} role="tabpanel" aria-labelledby={`tab-${t.id}`} hidden={tab !== t.id}>
            {panels[t.id]}
          </div>
        ))}
      </div>
    </NavContext.Provider>
  );
}
