"use client";

import { useMemo, useState } from "react";
import { calcOffice, type CalcResult, type Mosu } from "@/lib/calc";
import { FIELDS, FIELD_GROUPS, type FieldDef } from "@/lib/fields";
import type { Office } from "@/lib/offices";

const REGION = "전남청"; // 목포우체국이 속한 지방우정청

// 같은 소제목(section)끼리 묶는다.
function groupBySection(fields: FieldDef[]) {
  const result: { section: string; items: FieldDef[] }[] = [];
  for (const f of fields) {
    const last = result[result.length - 1];
    if (last && last.section === f.section) last.items.push(f);
    else result.push({ section: f.section, items: [f] });
  }
  return result;
}

const fmt = (n: number, digits = 3) =>
  n.toLocaleString("ko-KR", { minimumFractionDigits: digits, maximumFractionDigits: digits });

// 별정국도 소속국과 같은 산출식을 쓴다.
const kindOf = (o: Office) => (o.kind === "총괄국" ? "총괄국" : "소속국");

export default function OfficeForm({
  offices,
  mosu,
  workdays,
}: {
  offices: Office[];
  mosu: Mosu;
  workdays: number;
}) {
  const [selectedCode, setSelectedCode] = useState(offices[0].code);
  // 사용자가 고친 값만 관서별로 보관한다. 고치지 않은 항목은 원본 자료 값을 쓴다.
  const [edits, setEdits] = useState<Record<string, Record<string, string>>>({});

  const office = offices.find((o) => o.code === selectedCode) ?? offices[0];
  const officeEdits = edits[office.code] ?? {};
  const editedCount = Object.keys(officeEdits).length;

  // 관서별 값(원본 + 수정)으로 소요 인력을 계산한다.
  const results = useMemo(() => {
    const map = new Map<string, CalcResult>();
    for (const o of offices) {
      const merged: Record<string, number> = { ...o.values };
      for (const [key, text] of Object.entries(edits[o.code] ?? {})) {
        const n = Number(text);
        merged[key] = Number.isFinite(n) ? n : 0;
      }
      map.set(o.code, calcOffice(kindOf(o), merged, mosu, REGION, workdays));
    }
    return map;
  }, [offices, edits, mosu, workdays]);

  const result = results.get(office.code)!;
  const sum = (pick: (r: CalcResult) => number) =>
    Array.from(results.values()).reduce((s, r) => s + pick(r), 0);
  const counterAll = sum((r) => r.counterTotal);
  const marketingAll = sum((r) => r.marketingTotal);

  function valueOf(key: string) {
    return officeEdits[key] ?? String(office.values[key] ?? 0);
  }

  function changeValue(key: string, value: string) {
    setEdits((prev) => ({
      ...prev,
      [office.code]: { ...prev[office.code], [key]: value },
    }));
  }

  function resetOffice() {
    setEdits((prev) => {
      const next = { ...prev };
      delete next[office.code];
      return next;
    });
  }

  const visibleFields = FIELDS.filter((f) => f.kinds.includes(kindOf(office)));

  return (
    <div className="grid gap-6 lg:grid-cols-[16rem_1fr]">
      {/* 관서 선택 */}
      <aside className="lg:sticky lg:top-6 lg:self-start">
        <h2 className="mb-2 text-sm font-semibold text-zinc-600 dark:text-zinc-400">
          관서 선택 ({offices.length}곳)
        </h2>
        <ul className="max-h-[70vh] overflow-y-auto rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          {offices.map((o) => {
            const active = o.code === office.code;
            return (
              <li key={o.code}>
                <button
                  type="button"
                  onClick={() => setSelectedCode(o.code)}
                  aria-current={active}
                  className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm ${
                    active ? "bg-blue-600 text-white" : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  }`}
                >
                  <span>{o.name}</span>
                  <span className={`text-xs ${active ? "text-blue-100" : "text-zinc-500"}`}>
                    {o.kind}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      <div className="min-w-0 space-y-6">
        {/* 목포우체국 전체 합계 */}
        <section className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950">
          <h2 className="text-sm font-semibold text-blue-900 dark:text-blue-200">
            목포우체국 전체 소요 인력 (총괄국 + 소속국 {offices.length - 1}국 합산)
          </h2>
          <p className="mt-1 text-3xl font-bold text-blue-900 dark:text-blue-100">
            {Math.round(counterAll + marketingAll)}명
          </p>
          <p className="mt-1 text-sm text-blue-900/80 dark:text-blue-200/80">
            우편창구 {fmt(counterAll)} + 우편마케팅 {fmt(marketingAll)} = {fmt(counterAll + marketingAll)}명을
            합산해 반올림했습니다. (연간 근무일수 {workdays}일 기준)
          </p>
        </section>

        {/* 선택한 관서 */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">{office.name}</h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {office.kind} · 금융국기호 {office.code}
            </p>
          </div>
          <button
            type="button"
            onClick={resetOffice}
            disabled={editedCount === 0}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm disabled:opacity-40 dark:border-zinc-700"
          >
            원본 값으로 되돌리기{editedCount > 0 ? ` (${editedCount}개 항목 수정됨)` : ""}
          </button>
        </div>

        {/* 소요 인력 산출 결과 */}
        <section className="rounded-lg border border-zinc-300 p-4 dark:border-zinc-700">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-semibold">소요 인력 산출 결과</h3>
            <p className="text-lg font-bold">{fmt(result.total)}명</p>
          </div>
          {result.warnings.map((w) => (
            <p key={w} className="mb-2 rounded bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
              {w}
            </p>
          ))}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[32rem] text-left text-sm">
              <thead className="text-zinc-600 dark:text-zinc-400">
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <th className="py-1.5 pr-3 font-medium">분야</th>
                  <th className="py-1.5 pr-3 font-medium">항목</th>
                  <th className="py-1.5 pr-3 text-right font-medium">소요 인력(명)</th>
                  <th className="py-1.5 font-medium">적용 산출식 (별표 2)</th>
                </tr>
              </thead>
              <tbody>
                {result.lines.map((l) => (
                  <tr key={`${l.section}-${l.name}`} className="border-b border-zinc-100 align-top dark:border-zinc-900">
                    <td className="py-1.5 pr-3">{l.section}</td>
                    <td className="py-1.5 pr-3">{l.name}</td>
                    <td className="py-1.5 pr-3 text-right tabular-nums">{fmt(l.value)}</td>
                    <td className="py-1.5 text-xs text-zinc-600 dark:text-zinc-400">
                      {l.formula}
                      {l.note ? <span className="block text-zinc-500">※ {l.note}</span> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="font-semibold">
                <tr>
                  <td className="pt-2" colSpan={2}>우편창구 {fmt(result.counterTotal)} + 우편마케팅 {fmt(result.marketingTotal)}</td>
                  <td className="pt-2 pr-3 text-right tabular-nums">{fmt(result.total)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        {/* 입력 항목 */}
        {FIELD_GROUPS.map((group) => (
          <section key={group} className="space-y-4">
            <h3 className="border-b border-zinc-300 pb-1 text-lg font-semibold dark:border-zinc-700">
              {group} 입력
            </h3>
            {groupBySection(visibleFields.filter((f) => f.group === group)).map(({ section, items }) => (
              <fieldset key={section} className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
                <legend className="px-2 text-sm font-medium">{section}</legend>
                <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
                  {items.map((f) => {
                    const edited = f.key in officeEdits;
                    return (
                      <label key={`${group}-${f.key}`} className="flex flex-col gap-1 text-sm">
                        <span className="text-zinc-700 dark:text-zinc-300">
                          {f.label} <span className="text-zinc-500">({f.unit})</span>
                        </span>
                        <input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          value={valueOf(f.key)}
                          onChange={(e) => changeValue(f.key, e.target.value)}
                          className={`rounded-md border px-2 py-1.5 text-right tabular-nums dark:bg-zinc-900 ${
                            edited ? "border-blue-500" : "border-zinc-300 dark:border-zinc-700"
                          }`}
                        />
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}
