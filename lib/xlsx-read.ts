// 아주 작은 엑셀(.xlsx) 읽기. 새 라이브러리 없이 zip을 풀고 XML에서 값만 꺼낸다.
// 브라우저(와 Node 24)에 들어 있는 DecompressionStream을 쓰므로 파일은 서버로 보내지 않고 그 자리에서 읽는다.
// 읽는 대상은 첫 번째 시트의 셀 값(글자·숫자)이며, 수식은 엑셀이 저장해 둔 계산 결과를 읽는다.

export type SheetRows = Map<number, Record<string, string>>; // 행 번호 → { 열 글자: 값 }

type ZipEntry = { name: string; method: number; compSize: number; offset: number };

const utf8 = new TextDecoder("utf-8");

// zip 파일 끝의 목차(central directory)를 읽어 파일 목록을 만든다.
function listEntries(view: DataView): Map<string, ZipEntry> {
  let eocd = -1;
  for (let i = view.byteLength - 22; i >= Math.max(0, view.byteLength - 22 - 65535); i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("엑셀(.xlsx) 파일이 아닙니다.");

  const count = view.getUint16(eocd + 10, true);
  let p = view.getUint32(eocd + 16, true);
  const entries = new Map<string, ZipEntry>();
  for (let n = 0; n < count; n++) {
    if (view.getUint32(p, true) !== 0x02014b50) throw new Error("엑셀 파일의 목차가 올바르지 않습니다.");
    const method = view.getUint16(p + 10, true);
    const compSize = view.getUint32(p + 20, true);
    const nameLen = view.getUint16(p + 28, true);
    const extraLen = view.getUint16(p + 30, true);
    const commentLen = view.getUint16(p + 32, true);
    const offset = view.getUint32(p + 42, true);
    const name = utf8.decode(new Uint8Array(view.buffer, view.byteOffset + p + 46, nameLen));
    entries.set(name, { name, method, compSize, offset });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

// 파일 하나를 꺼내 글자로 돌려준다. (압축 없음 또는 deflate만 지원)
async function readText(view: DataView, entry: ZipEntry): Promise<string> {
  if (entry.compSize === 0xffffffff) throw new Error("너무 큰 엑셀 파일(zip64)은 읽을 수 없습니다.");
  const nameLen = view.getUint16(entry.offset + 26, true);
  const extraLen = view.getUint16(entry.offset + 28, true);
  const start = view.byteOffset + entry.offset + 30 + nameLen + extraLen;
  const data = new Uint8Array(view.buffer, start, entry.compSize);

  if (entry.method === 0) return utf8.decode(data);
  if (entry.method !== 8) throw new Error("지원하지 않는 엑셀 압축 방식입니다.");
  const stream = new Blob([data.slice()]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return utf8.decode(await new Response(stream).arrayBuffer());
}

const entityMap: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
function decodeXml(s: string) {
  return s.replace(/&(#x[0-9a-fA-F]+|#\d+|\w+);/g, (m, e: string) => {
    if (e[0] === "#") {
      const code = e[1] === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return entityMap[e] ?? m;
  });
}

// <t>글자</t> 조각을 이어 붙인다. (네임스페이스 접두어가 붙어 있어도 읽는다. 예: <x:t>)
function collectText(xml: string): string {
  const withoutPhonetic = xml.replace(/<(?:\w+:)?rPh\b[\s\S]*?<\/(?:\w+:)?rPh>/g, "");
  let out = "";
  for (const m of withoutPhonetic.matchAll(/<(?:\w+:)?t\b[^>]*>([\s\S]*?)<\/(?:\w+:)?t>/g)) out += m[1];
  return decodeXml(out);
}

function parseSharedStrings(xml: string): string[] {
  const list: string[] = [];
  for (const m of xml.matchAll(/<(?:\w+:)?si\b[^>]*>([\s\S]*?)<\/(?:\w+:)?si>/g)) list.push(collectText(m[1]));
  return list;
}

// 첫 번째 시트의 파일 경로를 찾는다. 못 찾으면 보통 이름인 sheet1.xml을 쓴다.
function findFirstSheetPath(workbookXml: string, relsXml: string): string {
  const sheet = workbookXml.match(/<(?:\w+:)?sheet\b[^>]*>/);
  const rid = sheet?.[0].match(/\br:id="([^"]+)"/)?.[1];
  if (rid) {
    for (const m of relsXml.matchAll(/<Relationship\b[^>]*>/g)) {
      if (m[0].includes(`Id="${rid}"`)) {
        const target = m[0].match(/Target="([^"]+)"/)?.[1];
        if (target) return target.startsWith("/") ? target.slice(1) : `xl/${target}`;
      }
    }
  }
  return "xl/worksheets/sheet1.xml";
}

export async function readFirstSheet(buffer: ArrayBuffer): Promise<SheetRows> {
  const view = new DataView(buffer);
  const entries = listEntries(view);
  const need = (name: string) => {
    const e = entries.get(name);
    if (!e) throw new Error(`엑셀 파일 안에 ${name}이(가) 없습니다.`);
    return e;
  };

  const workbookXml = await readText(view, need("xl/workbook.xml"));
  const relsEntry = entries.get("xl/_rels/workbook.xml.rels");
  const relsXml = relsEntry ? await readText(view, relsEntry) : "";
  const sharedEntry = entries.get("xl/sharedStrings.xml");
  const shared = sharedEntry ? parseSharedStrings(await readText(view, sharedEntry)) : [];
  const sheetXml = await readText(view, need(findFirstSheetPath(workbookXml, relsXml)));

  const rows: SheetRows = new Map();
  for (const rowMatch of sheetXml.matchAll(/<(?:\w+:)?row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/(?:\w+:)?row>)/g)) {
    const body = rowMatch[2];
    if (!body) continue;
    for (const c of body.matchAll(/<(?:\w+:)?c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/(?:\w+:)?c>)/g)) {
      const attrs = c[1];
      const inner = c[2];
      if (!inner) continue; // 비어 있는 셀
      const ref = attrs.match(/\br="([A-Z]+)(\d+)"/);
      if (!ref) continue;
      const type = attrs.match(/\bt="(\w+)"/)?.[1];

      let value: string | undefined;
      if (type === "inlineStr") {
        value = collectText(inner.match(/<(?:\w+:)?is\b[^>]*>([\s\S]*?)<\/(?:\w+:)?is>/)?.[1] ?? "");
      } else {
        const raw = inner.match(/<(?:\w+:)?v\b[^>]*>([\s\S]*?)<\/(?:\w+:)?v>/)?.[1];
        if (raw === undefined) continue;
        value = type === "s" ? (shared[Number(raw)] ?? "") : decodeXml(raw);
      }
      const rowNo = Number(ref[2]);
      const row = rows.get(rowNo) ?? {};
      row[ref[1]] = value;
      rows.set(rowNo, row);
    }
  }
  return rows;
}
