"use client";

import { useState } from "react";
import {
  REFERENCE_SECTIONS,
  REGULATION_FULL_NAME,
  REGULATION_VERSION,
  type RefBlock,
  type RefTable,
} from "@/lib/reference";

// 표 하나를 그린다. 좁은 화면에서는 표 안에서만 옆으로 밀린다.
function Table({ table }: { table: RefTable }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[30rem] text-left text-sm">
        <thead className="text-zinc-600 dark:text-zinc-400">
          <tr className="border-b border-zinc-200 dark:border-zinc-800">
            {table.headers.map((h) => (
              <th key={h} className="py-1.5 pr-3 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, i) => (
            <tr key={i} className="border-b border-zinc-100 align-top dark:border-zinc-900">
              {row.map((cell, j) => (
                <td key={j} className={`py-1.5 pr-3 ${j === 0 ? "whitespace-nowrap font-medium" : "text-zinc-700 dark:text-zinc-300"}`}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Block({ block }: { block: RefBlock }) {
  return (
    <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <h4 className="mb-2 text-sm font-semibold">{block.heading}</h4>
      {block.table ? <Table table={block.table} /> : null}
      {block.notes && block.notes.length > 0 ? (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-zinc-600 dark:text-zinc-400">
          {block.notes.map((n, i) => (
            <li key={i}>{n}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export default function ReferenceTab() {
  const [sectionId, setSectionId] = useState(REFERENCE_SECTIONS.find((s) => s.ready)?.id ?? REFERENCE_SECTIONS[0].id);
  const section = REFERENCE_SECTIONS.find((s) => s.id === sectionId) ?? REFERENCE_SECTIONS[0];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">참고자료 — {REGULATION_FULL_NAME}</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          규정의 별표에 나오는 기준을 정리한 자료입니다. ({REGULATION_VERSION}) 계산 화면은 이 중 ①우편창구와 ②우편마케팅만
          사용합니다.
        </p>
      </div>

      {/* 별표 고르기 */}
      <div role="tablist" aria-label="참고자료 별표" className="flex flex-wrap gap-2">
        {REFERENCE_SECTIONS.map((s) => {
          const active = s.id === section.id;
          return (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setSectionId(s.id)}
              className={`rounded-full border px-3 py-1.5 text-sm ${
                active
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-zinc-300 bg-white hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
              }`}
            >
              {s.title}
              {!s.ready ? <span className={`ml-1 text-xs ${active ? "text-blue-100" : "text-amber-700"}`}>(원문 대기)</span> : null}
            </button>
          );
        })}
      </div>

      <section className="space-y-4">
        <div>
          <h3 className="text-base font-semibold">{section.title}</h3>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{section.summary}</p>
          <p className="text-xs text-zinc-500">출처: {section.source}</p>
        </div>

        {section.appNote ? (
          <p className="rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-900 dark:bg-blue-950 dark:text-blue-200">{section.appNote}</p>
        ) : null}

        {!section.ready ? (
          <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
            {section.pendingNote}
          </p>
        ) : null}

        {section.parts.length > 1 ? (
          <nav aria-label="분야 바로가기" className="flex flex-wrap gap-2 text-xs">
            {section.parts.map((p) => (
              <a
                key={p.title}
                href={`#ref-${section.id}-${p.title}`}
                className="rounded-md border border-zinc-300 px-2 py-1 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                {p.title}
              </a>
            ))}
          </nav>
        ) : null}

        {section.parts.map((part) => (
          <div key={part.title} id={`ref-${section.id}-${part.title}`} className="space-y-3 scroll-mt-4">
            <h4 className="flex flex-wrap items-center gap-2 border-b border-zinc-300 pb-1 text-base font-semibold dark:border-zinc-700">
              {part.title}
              {part.usedInApp ? (
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                  계산 화면에서 사용
                </span>
              ) : (
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                  참고용 (이번 계산에는 쓰지 않음)
                </span>
              )}
            </h4>
            {part.blocks.map((b) => (
              <Block key={b.heading} block={b} />
            ))}
          </div>
        ))}
      </section>
    </div>
  );
}
