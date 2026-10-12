"use client";

import { createContext, useContext } from "react";

// 화면 맨 위 탭 이름. 홈(처음 화면) · 소요 인력 계산 · 참고자료
export type TabId = "home" | "calc" | "reference";

export type GoToOptions = {
  targetId?: string; // 이동한 뒤 화면에서 찾아갈 곳의 id (없으면 맨 위로)
  refSection?: string; // 참고자료 탭에서 열 별표의 id
};

export type Nav = {
  tab: TabId;
  refSection: string; // 참고자료 탭에서 지금 열려 있는 별표
  setRefSection: (id: string) => void;
  goTo: (tab: TabId, options?: GoToOptions) => void; // 목차에서 다른 화면으로 이동
};

export const NavContext = createContext<Nav | null>(null);

export function useNav(): Nav {
  const value = useContext(NavContext);
  if (!value) throw new Error("useNav는 AppTabs 안에서만 쓸 수 있습니다.");
  return value;
}
