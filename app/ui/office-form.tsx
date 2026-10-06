"use client";

import { useMemo, useRef, useState } from "react";
import { calcOffice, type CalcResult, type Mosu } from "@/lib/calc";
import { FIELDS, FIELD_GROUPS, type FieldDef } from "@/lib/fields";
import { officesFromSheet } from "@/lib/import-offices";
import type { Office } from "@/lib/offices";
import { citationFor, REGULATION_NAME, ROUNDING_CITATION } from "@/lib/regulation";
import { validateInputs, validateReferences, type Issue } from "@/lib/validate";
import { readFirstSheet } from "@/lib/xlsx-read";

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

// 숫자 입력칸. 입력 중에는 있는 그대로 보여 주고, 칸을 벗어나면 천 단위 쉼표를 붙여 읽기 쉽게 보여 준다.
// 저장하는 값은 쉼표 없는 글자이며, 숫자인지·음수인지는 lib/validate.ts가 점검한다.
function NumberInput({
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

// 엑셀로 불러온 값. 파일은 서버로 보내지 않고 이 브라우저 안에서만 읽는다.
type Uploaded = { fileName: string; values: Record<string, Record<string, number>> };
type UploadMessage = { kind: "ok" | "error"; text: string };

export default function OfficeForm({
  offices: baseOffices,
  mosu,
  workdays,
}: {
  offices: Office[];
  mosu: Mosu;
  workdays: number;
}) {
  const [uploaded, setUploaded] = useState<Uploaded | null>(null);
  const [uploadMessage, setUploadMessage] = useState<UploadMessage | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 엑셀을 올렸으면 그 값으로, 아니면 data 폴더의 원본 값으로 관서 목록을 만든다.
  const offices = useMemo(
    () =>
      uploaded
        ? baseOffices.map((o) => ({ ...o, values: { ...o.values, ...(uploaded.values[o.code] ?? {}) } }))
        : baseOffices,
    [baseOffices, uploaded],
  );

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

  // 업무량 엑셀을 읽어 28개 관서의 값을 바꾼다. 직접 고친 값은 새 파일 기준으로 다시 시작하도록 지운다.
  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // 같은 파일을 다시 골라도 동작하도록 비운다
    if (!file) return;

    setUploading(true);
    setUploadMessage(null);
    try {
      const rows = await readFirstSheet(await file.arrayBuffer());
      const result = officesFromSheet(rows, baseOffices);
      if (result.matched.length === 0) {
        throw new Error("이 파일에서 목포우체국과 소속국의 금융국기호를 찾지 못했습니다. 올바른 업무량 파일인지 확인해 주세요.");
      }
      setUploaded({ fileName: file.name, values: result.updates });
      setEdits({});
      const names = baseOffices.filter((o) => result.missing.includes(o.code)).map((o) => o.name);
      setUploadMessage({
        kind: "ok",
        text:
          `${file.name}에서 ${result.matched.length}곳의 값을 불러왔습니다.` +
          (names.length > 0 ? ` 파일에서 찾지 못한 관서(${names.join(", ")})는 기존 값을 그대로 씁니다.` : ""),
      });
    } catch (err) {
      setUploadMessage({
        kind: "error",
        text: err instanceof Error ? err.message : "엑셀 파일을 읽지 못했습니다.",
      });
    } finally {
      setUploading(false);
    }
  }

  function clearUploaded() {
    setUploaded(null);
    setEdits({});
    setUploadMessage(null);
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
        <ul className="max-h-56 overflow-y-auto rounded-lg lg:max-h-[70vh] border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
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
        {/* 엑셀 올리기: 담당자가 업무량 엑셀을 나중에라도 바꿔 올릴 수 있다 */}
        <section className="rounded-lg border border-zinc-300 p-4 dark:border-zinc-700">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="mr-auto text-sm font-semibold">업무량 엑셀 파일</h2>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx"
              onChange={handleFile}
              className="sr-only"
              aria-label="업무량 엑셀 파일 선택"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {uploading ? "읽는 중…" : "엑셀 파일 올리기"}
            </button>
            {uploaded ? (
              <button
                type="button"
                onClick={clearUploaded}
                className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700"
              >
                처음 자료로 되돌리기
              </button>
            ) : null}
          </div>
          <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
            「(기초자료1) 우편창구(마케팅) 업무량」 형식의 .xlsx 파일을 올리면 목포우체국과 소속국 27국의 값을 읽어 옵니다.
            파일은 서버로 보내지 않고 이 브라우저 안에서만 읽으며, 새로고침하면 처음 자료로 돌아갑니다.
          </p>
          {uploaded ? (
            <p className="mt-1 text-xs font-medium text-blue-800 dark:text-blue-300">
              현재 사용 중인 값: 업로드한 파일 ({uploaded.fileName})
            </p>
          ) : null}
          {uploadMessage ? (
            <p
              role={uploadMessage.kind === "error" ? "alert" : "status"}
              className={`mt-2 rounded px-3 py-2 text-sm ${
                uploadMessage.kind === "error"
                  ? "bg-red-50 text-red-900 dark:bg-red-950 dark:text-red-200"
                  : "bg-green-50 text-green-900 dark:bg-green-950 dark:text-green-200"
              }`}
            >
              {uploadMessage.text}
            </p>
          ) : null}
        </section>

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
        {FIELD_GROUPS.map((group) => {
          const groupFields = visibleFields.filter((f) => f.group === group);
          // 이 관서 종류에서 입력받는 칸이 없는 분야(예: 소속국의 우편마케팅)는 제목도 보이지 않게 한다.
          if (groupFields.length === 0) return null;
          return (
          <section key={group} className="space-y-4">
            <h3 className="border-b border-zinc-300 pb-1 text-lg font-semibold dark:border-zinc-700">
              {group} 입력
            </h3>
            {groupBySection(groupFields).map(({ section, items }) => (
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
                        <NumberInput
                          value={valueOf(f.key)}
                          onChange={(text) => changeValue(f.key, text)}
                          invalid={invalid}
                          edited={edited}
                        />
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            ))}
          </section>
          );
        })}
      </div>
    </div>
  );
}
