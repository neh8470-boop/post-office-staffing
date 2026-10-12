// Design Ref: §2.3 ① 입력 점검, §5 오류·예외 처리
// Plan SC: 필수 항목 누락 시 계산하지 않고 어떤 항목이 문제인지 즉시 안내한다.
//
// 필수 입력값 = 선택한 관서 종류에서 화면에 보이는 입력칸 전부.
// 0은 허용하고, 빈칸·숫자가 아닌 값·음수는 허용하지 않는다.
// 기준값(모수)이 없거나 0 이하이면 계산 결과를 믿을 수 없으므로 같은 방식으로 멈춘다.

import type { CalcKind, Mosu } from "./calc";
import type { FieldDef } from "./fields";

export type Issue = {
  key?: string; // 문제가 있는 입력칸의 이름. 기준값 문제처럼 칸이 없으면 비어 있다.
  label: string; // 화면에 보여 줄 항목 이름
  message: string; // 무엇이 문제인지
};

type InputField = Pick<FieldDef, "key" | "label">;

// 입력칸 값(글자)을 하나씩 검사한다. 같은 칸이 여러 묶음에 보여도 한 번만 안내한다.
export function validateInputs(fields: InputField[], raw: Record<string, string>): Issue[] {
  const issues: Issue[] = [];
  const seen = new Set<string>();
  for (const f of fields) {
    if (seen.has(f.key)) continue;
    seen.add(f.key);

    const text = (raw[f.key] ?? "").trim();
    if (text === "") {
      issues.push({ key: f.key, label: f.label, message: "값이 비어 있습니다. 없으면 0을 입력하세요." });
      continue;
    }
    const n = Number(text);
    if (!Number.isFinite(n)) {
      issues.push({ key: f.key, label: f.label, message: "숫자가 아닙니다." });
    } else if (n < 0) {
      issues.push({ key: f.key, label: f.label, message: "음수는 입력할 수 없습니다." });
    }
  }
  return issues;
}

// 기준값(모수)과 연간 근무일수를 검사한다. 지방청 자료가 없거나 0 이하이면 계산하지 않는다.
export function validateReferences(
  kind: CalcKind,
  mosu: Mosu,
  region: string,
  workdays: number,
): Issue[] {
  const issues: Issue[] = [];
  const need = (label: string, value: number | undefined) => {
    if (value === undefined) {
      issues.push({ label, message: `${region} 모수 자료가 없습니다.` });
    } else if (!(value > 0)) {
      issues.push({ label, message: "기준값이 0 이하여서 계산할 수 없습니다." });
    }
  };

  if (kind === "총괄국") {
    const c = mosu.counter[region];
    need("기준값: 우편창구 일반통상 세입", c?.generalRev);
    need("기준값: 우편창구 특수통상 물량", c?.specialVol);
    need("기준값: 우편창구 소포 물량", c?.parcelVol);
    need("기준값: 우편창구 국제 물량", c?.intlVol);
    need("기준값: 알뜰폰 건수", c?.mvno);
    need("기준값: 소포상자 건수", c?.box);
    const m = mosu.marketing[region];
    need("기준값: 우편마케팅 택배 세입", m?.parcelRev);
    need("기준값: 우편마케팅 인당 픽업물량", m?.pickupVol);
    need("연간 근무일수", workdays);
  } else if (kind === "소속국") {
    const a = mosu.affiliate[region];
    need("기준값: 소속국 연간세입", a?.generalRev);
    need("기준값: 소속국 알뜰폰 건수", a?.mvno);
    need("기준값: 소속국 소포상자 건수", a?.box);
    need("기준값: 소속국 택배 세입", mosu.marketing[region]?.affiliateParcelRev);
    need("기준값: 마케팅 전체 평균 택배 세입", mosu.marketingAllAvg?.parcelRev);
    need("기준값: 마케팅 전체 평균 픽업물량", mosu.marketingAllAvg?.pickupVol);
    need("연간 근무일수", workdays);
  } else {
    const court = mosu.court;
    need("기준값: 법원구내 연간세입", court?.generalRev);
    need("기준값: 법원구내 특수통상(창구접수) 물량", court?.specialCounterVol);
    need("기준값: 법원구내 특수통상(연계접수) 물량", court?.specialLinkVol);
    need("기준값: 법원구내 국제특급 물량", court?.intlExpressVol);
    need("기준값: 법원구내 알뜰폰 건수", court?.mvno);
    need("기준값: 법원구내 소포상자 건수", court?.box);
    need("기준값: 소속국 택배 세입", mosu.marketing[region]?.affiliateParcelRev);
    need("기준값: 마케팅 전체 평균 택배 세입", mosu.marketingAllAvg?.parcelRev);
    need("기준값: 마케팅 전체 평균 픽업물량", mosu.marketingAllAvg?.pickupVol);
    need("연간 근무일수", workdays);
  }
  return issues;
}
