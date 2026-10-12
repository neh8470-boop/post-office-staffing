"use client";

import { useMemo, useRef, useState } from "react";
import { calcOffice, type CalcKind, type Mosu } from "@/lib/calc";
import { fieldsFor, FIELD_GROUPS } from "@/lib/fields";
import { listOfficesFromSheet, type SheetOffice } from "@/lib/import-offices";
import { validateInputs, validateReferences } from "@/lib/validate";
import { countWorkdays, HOLIDAYS, WORK_YEAR } from "@/lib/workdays";
import { readFirstSheet } from "@/lib/xlsx-read";
import { fmt, groupBySection, NumberInput, ResultBody } from "./shared";

const KIND_OPTIONS: { value: CalcKind; label: string; hint: string }[] = [
  { value: "총괄국", label: "총괄국", hint: "총괄국 산출식으로 계산합니다. 입력칸이 가장 많습니다." },
  { value: "소속국", label: "소속국 · 별정국 · 출장소 등", hint: "소속국 산출식으로 계산합니다. 입력칸이 4개입니다." },
  { value: "법원구내", label: "법원구내우체국", hint: "법원 안에 있는 우체국 산출식으로 계산합니다." },
];

const YEARS = Object.keys(HOLIDAYS).map(Number).sort();

// 엑셀의 국형태·이름으로 계산 종류를 짐작한다. (맞지 않으면 화면에서 직접 바꾸면 된다.)
function guessKind(office: SheetOffice): CalcKind {
  if (office.kind === "총괄국") return "총괄국";
  if (office.name.includes("법원")) return "법원구내";
  return "소속국";
}

type BasketItem = {
  id: number;
  name: string;
  kindLabel: string;
  region: string;
  counter: number;
  marketing: number;
  total: number;
};

export default function FreeCalc({ mosu }: { mosu: Mosu }) {
  const regions = useMemo(() => Object.keys(mosu.counter), [mosu]);

  // 계산할 관서의 정보
  const [name, setName] = useState("");
  const [kind, setKind] = useState<CalcKind>("소속국");
  const [region, setRegion] = useState(regions.includes("전남청") ? "전남청" : regions[0]);
  const [year, setYear] = useState(WORK_YEAR);
  const [workdaysText, setWorkdaysText] = useState(String(countWorkdays(WORK_YEAR)));
  const [raw, setRaw] = useState<Record<string, string>>({}); // 입력칸 값(글자)

  // 합산 목록
  const [basket, setBasket] = useState<BasketItem[]>([]);

  // 엑셀에서 불러오기
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sheetOffices, setSheetOffices] = useState<SheetOffice[] | null>(null);
  const [fileName, setFileName] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const fields = fieldsFor(kind, raw);
  const workdays = Number(workdaysText);

  // 입력 점검 → 통과해야만 계산한다. (계산 화면과 같은 규칙)
  const issues = [...validateInputs(fields, raw), ...validateReferences(kind, mosu, region, workdays)];
  const blankIssues = issues.filter((i) => i.key && i.message.startsWith("값이 비어"));
  const otherIssues = issues.filter((i) => !(i.key && i.message.startsWith("값이 비어")));
  const invalidKeys = new Set(issues.map((i) => i.key).filter(Boolean));

  // 점검을 통과했을 때만 계산한다. (계산은 가벼워서 매번 새로 한다.)
  let result: ReturnType<typeof calcOffice> | null = null;
  if (issues.length === 0) {
    const merged: Record<string, number> = {};
    for (const [key, text] of Object.entries(raw)) merged[key] = Number(text);
    result = calcOffice(kind, merged, mosu, region, workdays);
  }

  function changeYear(next: number) {
    setYear(next);
    setWorkdaysText(String(countWorkdays(next)));
  }

  function fillBlanksWithZero() {
    setRaw((prev) => {
      const next = { ...prev };
      for (const f of fields) if ((next[f.key] ?? "").trim() === "") next[f.key] = "0";
      return next;
    });
  }

  function loadOffice(o: SheetOffice) {
    const next: Record<string, string> = {};
    for (const [key, value] of Object.entries(o.values)) next[key] = String(value);
    setRaw(next);
    setName(o.name);
    setKind(guessKind(o));
    if (regions.includes(o.region)) setRegion(o.region);
    setMessage({
      kind: "ok",
      text: `${o.name}(${o.region || "청 없음"} · ${o.kind})의 값을 불러왔습니다. 종류와 지방청이 맞는지 확인해 주세요.`,
    });
  }

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setLoading(true);
    setMessage(null);
    try {
      const list = listOfficesFromSheet(await readFirstSheet(await file.arrayBuffer()));
      if (list.length === 0) throw new Error("이 파일에서 관서를 찾지 못했습니다.");
      setSheetOffices(list);
      setFileName(file.name);
      setSearch("");
      setMessage({ kind: "ok", text: `${file.name}에서 관서 ${list.length.toLocaleString("ko-KR")}곳을 읽었습니다. 아래에서 이름으로 찾아 불러오세요.` });
    } catch (err) {
      setMessage({ kind: "error", text: err instanceof Error ? err.message : "엑셀 파일을 읽지 못했습니다." });
    } finally {
      setLoading(false);
    }
  }

  const matches = useMemo(() => {
    if (!sheetOffices) return [];
    const q = search.trim();
    const list = q === "" ? sheetOffices : sheetOffices.filter((o) => `${o.name} ${o.parent} ${o.region} ${o.code}`.includes(q));
    return list;
  }, [sheetOffices, search]);

  function addToBasket() {
    if (!result) return;
    setBasket((prev) => [
      ...prev,
      {
        id: Date.now() + prev.length,
        name: name.trim() || "(이름 없음)",
        kindLabel: KIND_OPTIONS.find((k) => k.value === kind)!.label,
        region,
        counter: result.counterTotal,
        marketing: result.marketingTotal,
        total: result.total,
      },
    ]);
  }

  const basketTotal = basket.reduce((s, b) => s + b.total, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">직접 입력 계산</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          전남청 자료에 없는 <strong>전국 어느 관서든</strong> 값을 직접 넣거나 엑셀에서 불러오면 소요 인력을 계산합니다. 기준값은 선택한 지방청의 모수(2025년
          자료)를 씁니다. 입력한 값은 저장되지 않고, 새로고침하면 사라집니다.
        </p>
      </div>

      {/* 관서 정보 */}
      <section id="free-info" className="scroll-mt-4 rounded-lg border border-zinc-300 p-4 dark:border-zinc-700">
        <h3 className="mb-3 font-semibold">1. 관서 정보</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-700 dark:text-zinc-300">관서 이름 (선택)</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 서울광화문우체국"
              className="rounded-md border border-zinc-300 px-2 py-1.5 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-700 dark:text-zinc-300">지방우정청 (기준값을 가져올 곳)</span>
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 dark:border-zinc-700 dark:bg-zinc-900"
            >
              {regions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-700 dark:text-zinc-300">관서 종류</span>
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as CalcKind)}
              className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 dark:border-zinc-700 dark:bg-zinc-900"
            >
              {KIND_OPTIONS.map((k) => (
                <option key={k.value} value={k.value}>
                  {k.label}
                </option>
              ))}
            </select>
            <span className="text-xs text-zinc-500">{KIND_OPTIONS.find((k) => k.value === kind)!.hint}</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-zinc-700 dark:text-zinc-300">기준 연도</span>
              <select
                value={year}
                onChange={(e) => changeYear(Number(e.target.value))}
                className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 dark:border-zinc-700 dark:bg-zinc-900"
              >
                {YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y}년
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-zinc-700 dark:text-zinc-300">연간 근무일수(일)</span>
              <NumberInput value={workdaysText} onChange={setWorkdaysText} invalid={!(workdays > 0)} edited={workdaysText !== String(countWorkdays(year))} />
            </label>
          </div>
        </div>
        <p className="mt-2 text-xs text-zinc-500">
          연간 근무일수는 선택한 연도의 평일에서 공휴일을 뺀 값이며, 필요하면 직접 고칠 수 있습니다. (우편마케팅 픽업물량 계산에 쓰입니다.)
        </p>
      </section>

      {/* 엑셀에서 불러오기 */}
      <section id="free-import" className="scroll-mt-4 rounded-lg border border-zinc-300 p-4 dark:border-zinc-700">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="mr-auto font-semibold">2. 엑셀에서 관서 불러오기 (선택)</h3>
          <input ref={fileInputRef} type="file" accept=".xlsx" onChange={handleFile} className="sr-only" aria-label="업무량 엑셀 파일 선택" />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {loading ? "읽는 중…" : "엑셀 파일 올리기"}
          </button>
        </div>
        <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
          「(기초자료1) 우편창구(마케팅) 업무량」 형식의 .xlsx 파일을 올리면 파일 안의 모든 관서를 목록으로 읽습니다. 전국 관서가 들어 있는 파일도 됩니다. 파일은
          서버로 보내지 않고 이 브라우저 안에서만 읽습니다.
        </p>
        {message ? (
          <p
            role={message.kind === "error" ? "alert" : "status"}
            className={`mt-2 rounded px-3 py-2 text-sm ${
              message.kind === "error"
                ? "bg-red-50 text-red-900 dark:bg-red-950 dark:text-red-200"
                : "bg-green-50 text-green-900 dark:bg-green-950 dark:text-green-200"
            }`}
          >
            {message.text}
          </p>
        ) : null}
        {sheetOffices ? (
          <div className="mt-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-zinc-700 dark:text-zinc-300">관서 찾기 — {fileName}</span>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="우체국 이름·총괄국·청 이름으로 검색 (예: 광화문, 서울청)"
                className="rounded-md border border-zinc-300 px-2 py-1.5 dark:border-zinc-700 dark:bg-zinc-900"
              />
            </label>
            <p className="mt-1 text-xs text-zinc-500">
              {matches.length.toLocaleString("ko-KR")}곳{matches.length > 50 ? " (앞의 50곳만 보여 줍니다. 검색어를 더 넣어 보세요.)" : ""}
            </p>
            <ul className="mt-2 max-h-64 divide-y divide-zinc-100 overflow-y-auto rounded-md border border-zinc-200 text-sm dark:divide-zinc-900 dark:border-zinc-800">
              {matches.slice(0, 50).map((o) => (
                <li key={o.key}>
                  <button
                    type="button"
                    onClick={() => loadOffice(o)}
                    className="flex w-full flex-wrap items-center justify-between gap-2 px-3 py-1.5 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  >
                    <span className="font-medium">{o.name}</span>
                    <span className="text-xs text-zinc-500">
                      {o.kind} · {o.region} · 총괄국 {o.parent}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      {/* 결과 */}
      <section id="free-result" className="scroll-mt-4 rounded-lg border border-zinc-300 p-4 dark:border-zinc-700">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-semibold">3. 소요 인력 산출 결과{name.trim() ? ` — ${name.trim()}` : ""}</h3>
          {result ? <p className="text-lg font-bold">{fmt(result.total)}명</p> : null}
        </div>
        {result ? (
          <>
            <ResultBody result={result} kind={kind} />
            <div className="mt-3">
              <button type="button" onClick={addToBasket} className="rounded-md border border-blue-600 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-950">
                이 관서를 합산 목록에 추가
              </button>
            </div>
          </>
        ) : (
          <div className="space-y-2 text-sm">
            <p className="text-zinc-600 dark:text-zinc-400">아래 입력칸을 모두 채우면 결과가 표시됩니다. (해당이 없는 칸은 0을 넣어 주세요.)</p>
            {blankIssues.length > 0 ? (
              <p className="rounded bg-amber-50 px-3 py-2 text-amber-900 dark:bg-amber-950 dark:text-amber-200">
                아직 입력하지 않은 칸이 {blankIssues.length}개 있습니다.{" "}
                <button type="button" onClick={fillBlanksWithZero} className="font-semibold underline">
                  빈칸을 모두 0으로 채우기
                </button>
              </p>
            ) : null}
            {otherIssues.length > 0 ? (
              <ul role="alert" className="list-disc space-y-0.5 rounded bg-red-50 py-2 pl-8 pr-3 text-red-900 dark:bg-red-950 dark:text-red-200">
                {otherIssues.map((i, idx) => (
                  <li key={`${i.key ?? "ref"}-${idx}`}>
                    <span className="font-medium">{i.label}</span>: {i.message}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        )}
      </section>

      {/* 입력칸 */}
      <div id="free-inputs" className="scroll-mt-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold">4. 입력 항목 ({fields.length}개)</h3>
          <div className="flex gap-2">
            <button type="button" onClick={fillBlanksWithZero} className="rounded-md border border-zinc-300 px-3 py-1 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800">
              빈칸을 0으로 채우기
            </button>
            <button type="button" onClick={() => setRaw({})} className="rounded-md border border-zinc-300 px-3 py-1 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800">
              입력 모두 지우기
            </button>
          </div>
        </div>
        {FIELD_GROUPS.map((group) => {
          const groupFields = fields.filter((f) => f.group === group);
          if (groupFields.length === 0) return null;
          return (
            <section key={group} className="space-y-4">
              <h4 className="border-b border-zinc-300 pb-1 text-base font-semibold dark:border-zinc-700">{group} 입력</h4>
              {groupBySection(groupFields).map(({ section, items }) => (
                <fieldset key={section} className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
                  <legend className="px-2 text-sm font-medium">{section}</legend>
                  <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
                    {items.map((f) => (
                      <label key={`${group}-${f.key}`} className="flex flex-col gap-1 text-sm">
                        <span className="text-zinc-700 dark:text-zinc-300">
                          {f.label} <span className="text-zinc-500">({f.unit})</span>
                        </span>
                        <NumberInput
                          value={raw[f.key] ?? ""}
                          onChange={(text) => setRaw((prev) => ({ ...prev, [f.key]: text }))}
                          invalid={invalidKeys.has(f.key) && (raw[f.key] ?? "").trim() !== ""}
                          edited={(raw[f.key] ?? "") !== ""}
                        />
                      </label>
                    ))}
                  </div>
                </fieldset>
              ))}
            </section>
          );
        })}
      </div>

      {/* 합산 목록 */}
      <section id="free-basket" className="scroll-mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950">
        <h3 className="font-semibold text-blue-900 dark:text-blue-100">5. 합산 목록 (총괄국 + 소속국 합계)</h3>
        <p className="mt-1 text-xs text-blue-900/80 dark:text-blue-200/80">
          관서를 하나씩 계산해 목록에 추가하면 합계를 보여 줍니다. 규정에 따라 총괄국과 소속국의 결과를 합산한 뒤 반올림합니다.
        </p>
        {basket.length === 0 ? (
          <p className="mt-3 text-sm text-blue-900/80 dark:text-blue-200/80">아직 추가한 관서가 없습니다. 결과 아래의 ‘합산 목록에 추가’ 버튼을 눌러 보세요.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[30rem] text-left text-sm">
              <thead className="text-blue-900/80 dark:text-blue-200/80">
                <tr className="border-b border-blue-200 dark:border-blue-900">
                  <th className="py-1.5 pr-3 font-medium">관서</th>
                  <th className="py-1.5 pr-3 font-medium">종류 · 청</th>
                  <th className="py-1.5 pr-3 text-right font-medium">우편창구</th>
                  <th className="py-1.5 pr-3 text-right font-medium">우편마케팅</th>
                  <th className="py-1.5 pr-3 text-right font-medium">합계</th>
                  <th className="py-1.5" />
                </tr>
              </thead>
              <tbody>
                {basket.map((b) => (
                  <tr key={b.id} className="border-b border-blue-100 dark:border-blue-900">
                    <td className="py-1.5 pr-3">{b.name}</td>
                    <td className="py-1.5 pr-3 text-xs">
                      {b.kindLabel} · {b.region}
                    </td>
                    <td className="py-1.5 pr-3 text-right tabular-nums">{fmt(b.counter)}</td>
                    <td className="py-1.5 pr-3 text-right tabular-nums">{fmt(b.marketing)}</td>
                    <td className="py-1.5 pr-3 text-right tabular-nums">{fmt(b.total)}</td>
                    <td className="py-1.5 text-right">
                      <button type="button" onClick={() => setBasket((prev) => prev.filter((x) => x.id !== b.id))} className="text-xs underline">
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="font-semibold">
                <tr>
                  <td className="pt-2" colSpan={4}>
                    합계 {basket.length}곳 ({fmt(basketTotal)}명을 반올림)
                  </td>
                  <td className="pt-2 pr-3 text-right text-lg tabular-nums">{Math.round(basketTotal)}명</td>
                  <td className="pt-2 text-right">
                    <button type="button" onClick={() => setBasket([])} className="text-xs font-normal underline">
                      목록 비우기
                    </button>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
