// 「(기초자료1) 우편창구(마케팅) 업무량」 형식의 엑셀에서 관서별 입력값을 꺼낸다.
// 관서는 금융국기호(E열)로 찾고, 열 글자와 입력칸 이름의 연결은 아래 표를 따른다.

import type { SheetRows } from "./xlsx-read";

// 엑셀 열 글자 → 입력값 이름(data/offices.json과 같은 이름). 머리글 기준은 업무량 파일의 3~9행.
export const UPLOAD_COLUMNS: Record<string, string> = {
  I: "domGeneralVol", J: "domGeneralRev", K: "emailSelfVol", L: "emailSelfRev",
  M: "emailConsignVol", N: "emailConsignRev", O: "emailLinkVol", P: "emailLinkRev",
  S: "domSpecialVol", T: "domSpecialRev", U: "specialHubVol", W: "specialHubEmailVol",
  Y: "parcelRegularVol", AA: "parcelRegisteredCounterVol", AC: "contractParcelVol", AD: "contractParcelRev",
  AE: "contractVol", AG: "contractIndividualVol", AI: "pickupReturnVol", AK: "pickupIndividualVol",
  AM: "storePartnerVol", AN: "storePartnerRev", AO: "intlGeneralVol", AP: "intlGeneralRev",
  AQ: "intlSpecialVol", AR: "intlSpecialRev", AS: "intlParcelVol", AU: "kpacketVol", AW: "intlExpressVol", AX: "intlExpressRev",
  AY: "intlExpressCounterVol", BA: "intlExpressVisitVol", BC: "collectAgentVol", BE: "mvnoCount",
  BF: "parcelBoxCount", BG: "collectAgentCounterVol", BI: "totalRevenue", BJ: "contractParcelRevAffiliate",
  BK: "labelingVol", BM: "courtSpecialIndividualVol", BN: "courtSystemLinkVol", BR: "intlAirParcelVol", BV: "contentCertVol",
  BW: "simpleReceiptVol", BY: "directShipVol", CA: "eLabelVol", CB: "manualLabelVol",
  CC: "returnParcelPickupVol", CD: "returnDeliveryVol",
};

export type ImportResult = {
  updates: Record<string, Record<string, number>>; // 금융국기호 → { 입력값 이름: 숫자 }
  matched: string[]; // 파일에서 찾은 관서의 금융국기호
  missing: string[]; // 파일에서 찾지 못한 관서의 금융국기호
};

// 머리글 행(총괄국명·금융국기호·국형태)으로 업무량 파일 형식인지 확인한다.
function hasExpectedHeader(rows: SheetRows): boolean {
  for (let r = 1; r <= 10; r++) {
    const row = rows.get(r);
    if (row && row.C?.trim() === "총괄국명" && row.E?.trim() === "금융국기호" && row.G?.trim() === "국형태") return true;
  }
  return false;
}

// 엑셀에 들어 있는 관서 하나. 전국 어느 관서든 골라서 계산해 볼 수 있도록 값을 그대로 담는다.
export type SheetOffice = {
  key: string; // 목록에서 구별하는 이름(행 번호)
  code: string; // 금융국기호 (없으면 빈칸)
  name: string; // 우체국명
  region: string; // 청명 (예: 전남청)
  parent: string; // 총괄국명
  kind: string; // 국형태 (총괄국·소속국·별정국·취급국 등)
  values: Record<string, number>;
};

// 업무량 엑셀의 모든 관서(총괄국·소속국·별정국·취급국 등)를 목록으로 읽는다. 전국 관서가 들어 있는 파일도 읽을 수 있다.
export function listOfficesFromSheet(rows: SheetRows): SheetOffice[] {
  if (!hasExpectedHeader(rows)) {
    throw new Error(
      "「(기초자료1) 우편창구(마케팅) 업무량」 형식이 아닙니다. 3행 머리글에 총괄국명·금융국기호·국형태가 있는 파일을 올려 주세요.",
    );
  }
  const list: SheetOffice[] = [];
  for (const [rowNo, row] of rows) {
    if (rowNo <= 9) continue; // 머리글 행
    const name = row.D?.trim();
    const kind = row.G?.trim();
    if (!name || !kind) continue;

    const values: Record<string, number> = {};
    for (const [col, key] of Object.entries(UPLOAD_COLUMNS)) {
      const text = row[col]?.trim();
      values[key] = text === undefined || text === "" ? 0 : Number(text);
    }
    list.push({ key: `r${rowNo}`, code: row.E?.trim() ?? "", name, region: row.B?.trim() ?? "", parent: row.C?.trim() ?? "", kind, values });
  }
  return list;
}

export function officesFromSheet(rows: SheetRows, targets: { code: string }[]): ImportResult {
  if (!hasExpectedHeader(rows)) {
    throw new Error(
      "「(기초자료1) 우편창구(마케팅) 업무량」 형식이 아닙니다. 3행 머리글에 총괄국명·금융국기호·국형태가 있는 파일을 올려 주세요.",
    );
  }

  const wanted = new Set(targets.map((t) => t.code));
  const updates: ImportResult["updates"] = {};
  for (const [rowNo, row] of rows) {
    if (rowNo <= 9) continue; // 머리글 행
    const code = row.E?.trim();
    if (!code || !wanted.has(code) || updates[code]) continue; // 같은 기호가 또 나오면 처음 값을 쓴다

    const values: Record<string, number> = {};
    for (const [col, key] of Object.entries(UPLOAD_COLUMNS)) {
      const text = row[col]?.trim();
      values[key] = text === undefined || text === "" ? 0 : Number(text); // 글자가 들어 있으면 NaN이 되어 입력 점검에서 안내한다
    }
    updates[code] = values;
  }

  const matched = Object.keys(updates);
  const missing = targets.map((t) => t.code).filter((c) => !updates[c]);
  return { updates, matched, missing };
}
