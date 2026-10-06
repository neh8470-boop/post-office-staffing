"use client";

import { useMemo, useState } from "react";
import { calcOffice, type CalcResult, type Mosu } from "@/lib/calc";
import { FIELDS, FIELD_GROUPS, type FieldDef } from "@/lib/fields";
import type { Office } from "@/lib/offices";
import { citationFor, REGULATION_NAME, ROUNDING_CITATION } from "@/lib/regulation";
import { validateInputs, validateReferences, type Issue } from "@/lib/validate";

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

// 관서 하나의 점검·계산 결과. 점검에서 문제가 나오면 계산하지 않으므로 result는 비어 있다.
type OfficeOutcome = { issues: Issue[]; result: CalcResult | null };

// 합계 카드에서 문제가 있는 관서로 바로 이동하는 이름 버튼 목록
function OfficeChips({ list, onPick }: { list: Office[]; onPick: (code: string) => void }) {
  return (
    <ul className="mt-2 flex flex-wrap gap-2">
      {list.map((o) => (
        <li key={o.code}>
          <button
            type="button"
            onClick={() => onPick(o.code)}
            className="rounded-full border border-blue-300 bg-white px-3 py-0.5 text-xs text-blue-900 hover:bg-blue-100 dark:bg-blue-900 dark:text-blue-100"
          >
            {o.name}
          </button>
        </li>
      ))}
    </ul>
  );
}

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

  // Design Ref: §2.3 — 관서마다 "입력 점검 → 계산" 순서로 처리한다. 점검을 통과해야만 계산한다.
  const outcomes = useMemo(() => {
    const map = new Map<string, OfficeOutcome>();
    for (const o of offices) {
      const kind = kindOf(o);
      const raw: Record<string, string> = {};
      for (const [key, value] of Object.entries(o.values)) raw[key] = String(value);
      Object.assign(raw, edits[o.code] ?? {});

      const issues = [
        ...validateInputs(FIELDS.filter((f) => f.kinds.includes(kind)), raw),
        ...validateReferences(kind, mosu, REGION, workdays),
      ];
      if (issues.length > 0) {
        map.set(o.code, { issues, result: null });
        continue;
      }
      const merged: Record<string, number> = {};
      for (const [key, text] of Object.entries(raw)) merged[key] = Number(text);
      map.set(o.code, { issues, result: calcOffice(kind, merged, mosu, REGION, workdays) });
    }
    return map;
  }, [offices, edits, mosu, workdays]);

  const outcome = outcomes.get(office.code)!;
  const result = outcome.result;
  const invalidKeys = new Set(outcome.issues.map((i) => i.key).filter(Boolean));
  const officesWithIssues = offices.filter((o) => outcomes.get(o.code)!.issues.length > 0);

  // 규정에는 있지만 이 화면이 아직 지원하지 않아 계산하지 않은 항목이 있는 관서
  const unsupportedOffices = offices.filter((o) =>
    outcomes.get(o.code)!.result?.lines.some((l) => l.unsupported),
  );
  const hasUnsupported = result?.lines.some((l) => l.unsupported) ?? false;

  // 28개 관서가 모두 점검을 통과하고 빠진 항목 없이 계산됐을 때만 합계를 낸다.
  const readyResults = Array.from(outcomes.values())
    .map((o) => o.result)
    .filter((r): r is CalcResult => r !== null);
  const allReady = readyResults.length === offices.length && unsupportedOffices.length === 0;
  const counterAll = allReady ? readyResults.reduce((s, r) => s + r.counterTotal, 0) : 0;
  const marketingAll = allReady ? readyResults.reduce((s, r) => s + r.marketingTotal, 0) : 0;

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
            const hasIssue = outcomes.get(o.code)!.issues.length > 0;
            const isUnsupported = unsupportedOffices.includes(o);
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
                  <span>
                    {o.name}
                    {hasIssue ? (
                      <span
                        className={`ml-1 text-xs font-semibold ${active ? "text-amber-200" : "text-red-600"}`}
                        title="입력 점검이 필요합니다"
                      >
                        ⚠ 점검
                      </span>
                    ) : isUnsupported ? (
                      <span
                        className={`ml-1 text-xs font-semibold ${active ? "text-amber-200" : "text-amber-700"}`}
                        title="규정에는 있으나 이 화면이 아직 지원하지 않는 항목이 있습니다"
                      >
                        ⚠ 미지원
                      </span>
                    ) : null}
                  </span>
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
          {allReady ? (
            <>
              <p className="mt-1 text-3xl font-bold text-blue-900 dark:text-blue-100">
                {Math.round(counterAll + marketingAll)}명
              </p>
              <p className="mt-1 text-sm text-blue-900/80 dark:text-blue-200/80">
                우편창구 {fmt(counterAll)} + 우편마케팅 {fmt(marketingAll)} = {fmt(counterAll + marketingAll)}명을
                합산해 반올림했습니다. (연간 근무일수 {workdays}일 기준)
              </p>
              <p className="mt-1 text-xs text-blue-900/70 dark:text-blue-200/70">
                근거: [별표 2] {ROUNDING_CITATION.article} — {ROUNDING_CITATION.remark}
              </p>
            </>
          ) : (
            <div className="mt-1 text-sm text-blue-900 dark:text-blue-100">
              <p className="text-lg font-bold">합계를 계산할 수 없습니다</p>
              {officesWithIssues.length > 0 ? (
                <>
                  <p className="mt-1">
                    입력 점검이 필요한 관서가 {officesWithIssues.length}곳 있습니다. 해당 관서의 입력을 고치면
                    합계가 다시 계산됩니다.
                  </p>
                  <OfficeChips list={officesWithIssues} onPick={setSelectedCode} />
                </>
              ) : null}
              {unsupportedOffices.length > 0 ? (
                <>
                  <p className="mt-2">
                    규정에는 있지만 이 화면이 아직 지원하지 않아 계산하지 않은 항목이 있는 관서가{" "}
                    {unsupportedOffices.length}곳 있습니다. 빠진 항목이 있는 합계는 보여 주지 않습니다.
                  </p>
                  <OfficeChips list={unsupportedOffices} onPick={setSelectedCode} />
                </>
              ) : null}
            </div>
          )}
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

        {/* 입력 점검 안내: 문제가 있을 때만 보인다 */}
        {outcome.issues.length > 0 ? (
          <section
            role="alert"
            className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
          >
            <h3 className="font-semibold">입력 점검이 필요합니다 ({outcome.issues.length}건)</h3>
            <p className="mt-1">아래 항목을 고치기 전까지는 이 관서의 소요 인력을 계산하지 않습니다.</p>
            <ul className="mt-2 list-disc space-y-0.5 pl-5">
              {outcome.issues.map((i, idx) => (
                <li key={`${i.key ?? "ref"}-${idx}`}>
                  <span className="font-medium">{i.label}</span>: {i.message}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* 소요 인력 산출 결과 */}
        <section className="rounded-lg border border-zinc-300 p-4 dark:border-zinc-700">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-semibold">소요 인력 산출 결과</h3>
            {result ? (
              <p className="text-lg font-bold">
                {fmt(result.total)}명
                {hasUnsupported ? <span className="ml-1 text-xs font-normal text-amber-700">(미지원 항목 제외)</span> : null}
              </p>
            ) : null}
          </div>
          {result ? (
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
                      const cite = citationFor(kindOf(office), l.section, l.name);
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
                      <td className="pt-2" colSpan={2}>우편창구 {fmt(result.counterTotal)} + 우편마케팅 {fmt(result.marketingTotal)}</td>
                      <td className="pt-2 pr-3 text-right tabular-nums">{fmt(result.total)}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          ) : (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              입력 점검에서 문제가 나와 계산하지 않았습니다. 위 안내의 항목을 고치면 결과가 표시됩니다.
            </p>
          )}
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
                    const invalid = invalidKeys.has(f.key);
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
                          aria-invalid={invalid}
                          className={`rounded-md border px-2 py-1.5 text-right tabular-nums dark:bg-zinc-900 ${
                            invalid
                              ? "border-red-500 bg-red-50 dark:bg-red-950"
                              : edited
                                ? "border-blue-500"
                                : "border-zinc-300 dark:border-zinc-700"
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
