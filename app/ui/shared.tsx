"use client";

// 계산 화면과 직접 입력 계산 화면이 함께 쓰는 화면 부품들.

import { useState } from "react";
import type { CalcKind, CalcResult } from "@/lib/calc";
import type { FieldDef } from "@/lib/fields";
import { citationFor, REGULATION_NAME } from "@/lib/regulation";

// 같은 소제목(section)끼리 묶는다.
export function groupBySection(fields: FieldDef[]) {
  const result: { section: string; items: FieldDef[] }[] = [];
  for (const f of fields) {
    const last = result[result.length - 1];
    if (last && last.section === f.section) last.items.push(f);
    else result.push({ section: f.section, items: [f] });
  }
  return result;
}

export const fmt = (n: number, digits = 3) =>
  n.toLocaleString("ko-KR", { minimumFractionDigits: digits, maximumFractionDigits: digits });

// 숫자 입력칸. 입력 중에는 있는 그대로 보여 주고, 칸을 벗어나면 천 단위 쉼표를 붙여 읽기 쉽게 보여 준다.
// 저장하는 값은 쉼표 없는 글자이며, 숫자인지·음수인지는 lib/validate.ts가 점검한다.
export function NumberInput({
  value,
  onChange,
  invalid,
  edited,
}: {
  value: string;
  onChange: (value: string) => void;
  invalid: boolean;
  edited: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const n = Number(value);
  const canFormat = value.trim() !== "" && Number.isFinite(n);
  const shown = !focused && canFormat ? n.toLocaleString("ko-KR", { maximumFractionDigits: 6 }) : value;

  return (
    <input
      type="text"
      inputMode="decimal"
      autoComplete="off"
      value={shown}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onChange={(e) => onChange(e.target.value.replace(/[,\s]/g, ""))}
      aria-invalid={invalid}
      className={`rounded-md border px-2 py-1.5 text-right tabular-nums dark:bg-zinc-900 ${
        invalid
          ? "border-red-500 bg-red-50 dark:bg-red-950"
          : edited
            ? "border-blue-500"
            : "border-zinc-300 dark:border-zinc-700"
      }`}
    />
  );
}

// 산출 결과 표(안내 문구 + 항목별 인력 + 계산식·근거 조문).
export function ResultBody({ result, kind }: { result: CalcResult; kind: CalcKind }) {
  return (
    <>
      {result.lines
        .filter((l) => l.unsupported)
        .map((l) => (
          <div
            key={`unsupported-${l.section}-${l.name}`}
            role="status"
            className="mb-2 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200"
          >
            <p className="font-semibold">규정에 있으나 미지원: {l.section} · {l.name}</p>
            <p className="mt-0.5">{l.unsupported}</p>
          </div>
        ))}
      {result.warnings.map((w) => (
        <p key={w} className="mb-2 rounded bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
          {w}
        </p>
      ))}
      <p className="mb-2 text-xs text-zinc-600 dark:text-zinc-400">근거 규정: {REGULATION_NAME}</p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[32rem] text-left text-sm">
          <thead className="text-zinc-600 dark:text-zinc-400">
            <tr className="border-b border-zinc-200 dark:border-zinc-800">
              <th className="py-1.5 pr-3 font-medium">분야</th>
              <th className="py-1.5 pr-3 font-medium">항목</th>
              <th className="py-1.5 pr-3 text-right font-medium">소요 인력(명)</th>
              <th className="py-1.5 font-medium">적용 산출식 · 근거 조문</th>
            </tr>
          </thead>
          <tbody>
            {result.lines.map((l) => {
              // Plan SC: 모든 산출 결과 줄에 근거 조문을 붙인다. 못 찾으면 빈칸 대신 "확인 필요"로 알린다.
              const cite = citationFor(kind, l.section, l.name);
              return (
                <tr key={`${l.section}-${l.name}`} className="border-b border-zinc-100 align-top dark:border-zinc-900">
                  <td className="py-1.5 pr-3">{l.section}</td>
                  <td className="py-1.5 pr-3">{l.name}</td>
                  <td className="py-1.5 pr-3 text-right tabular-nums">
                    {l.unsupported ? <span className="text-amber-700">계산 안 함</span> : fmt(l.value)}
                  </td>
                  <td className="py-1.5 text-xs text-zinc-600 dark:text-zinc-400">
                    {l.formula}
                    <span className="mt-0.5 block font-medium text-zinc-800 dark:text-zinc-200">
                      근거 조문: {cite ? `[별표 2] ${cite.article}` : "확인 필요"}
                    </span>
                    {cite?.remark ? <span className="block text-zinc-500">비고: {cite.remark}</span> : null}
                    {l.note ? <span className="block text-zinc-500">※ {l.note}</span> : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="font-semibold">
            <tr>
              <td className="pt-2" colSpan={2}>
                우편창구 {fmt(result.counterTotal)} + 우편마케팅 {fmt(result.marketingTotal)}
              </td>
              <td className="pt-2 pr-3 text-right tabular-nums">{fmt(result.total)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </>
  );
}
