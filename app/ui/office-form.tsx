"use client";

import { useState } from "react";
import { FIELDS, FIELD_GROUPS, type FieldDef } from "@/lib/fields";
import type { Office } from "@/lib/offices";

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

export default function OfficeForm({ offices }: { offices: Office[] }) {
  const [selectedCode, setSelectedCode] = useState(offices[0].code);
  // 사용자가 고친 값만 관서별로 보관한다. 고치지 않은 항목은 원본 자료 값을 쓴다.
  const [edits, setEdits] = useState<Record<string, Record<string, string>>>({});

  const office = offices.find((o) => o.code === selectedCode) ?? offices[0];
  const officeEdits = edits[office.code] ?? {};
  const editedCount = Object.keys(officeEdits).length;

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
                    active
                      ? "bg-blue-600 text-white"
                      : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  }`}
                >
                  <span>{o.name}</span>
                  <span
                    className={`text-xs ${active ? "text-blue-100" : "text-zinc-500"}`}
                  >
                    {o.kind}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      {/* 입력 항목 */}
      <div className="min-w-0 space-y-6">
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

        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
          항목 이름은 업무량 파일의 머리글을 따랐습니다. 소요 인력 계산은 산출식과 입력
          항목의 연결을 확인한 뒤 추가합니다.
        </p>

        {FIELD_GROUPS.map((group) => (
          <section key={group} className="space-y-4">
            <h3 className="border-b border-zinc-300 pb-1 text-lg font-semibold dark:border-zinc-700">
              {group}
            </h3>
            {groupBySection(FIELDS.filter((f) => f.group === group)).map(
              ({ section, items }) => (
                <fieldset key={section} className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
                  <legend className="px-2 text-sm font-medium">{section}</legend>
                  <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
                    {items.map((f) => {
                      const edited = f.key in officeEdits;
                      return (
                        <label key={f.key} className="flex flex-col gap-1 text-sm">
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
                              edited
                                ? "border-blue-500"
                                : "border-zinc-300 dark:border-zinc-700"
                            }`}
                          />
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              ),
            )}
          </section>
        ))}

        {/* 계산 결과 자리 */}
        <section className="rounded-lg border border-dashed border-zinc-400 p-4 text-sm text-zinc-600 dark:text-zinc-400">
          <h3 className="mb-1 font-semibold text-zinc-800 dark:text-zinc-200">
            소요 인력 산출 결과
          </h3>
          산출식 연결을 확인한 뒤 이곳에 분야별 소요 인력과 적용한 산출식·근거 조문을
          표시합니다.
        </section>
      </div>
    </div>
  );
}
