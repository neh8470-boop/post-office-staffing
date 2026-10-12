// 소요 인력 산출 (우편창구·우편마케팅). 별표 2의 산출식을 그대로 옮긴 순수 함수들이다.
// 같은 입력이면 항상 같은 결과가 나오며, 화면 코드와 분리해 둔다.
//
// 청별 기준값: 모수 파일(우편창구마케팅 모수 현황)의 지방청별 값은 '전체 평균 2 : 지방청 1' 같은 가중 계산이
// 이미 끝난 최종 기준값이다. 담당자 산출 파일도 이 값을 그대로 나눗셈에 쓰므로, 여기서도 다시 평균을 섞지 않고 그대로 쓴다.

export type Values = Record<string, number>;

// 관서 종류. 별정국은 소속국과 같은 산출식을 쓰고, 법원구내우체국(예: 광주법원우체국)은 따로 계산한다.
export type CalcKind = "총괄국" | "소속국" | "법원구내";

type CounterMosu = { generalRev: number; specialVol: number; parcelVol: number; intlVol: number; mvno: number; box: number };
type AffiliateMosu = { generalRev: number; mvno: number; box: number };
type MarketingMosu = { parcelRev: number; pickupVol: number; affiliateParcelRev: number };
type CourtMosu = {
  generalRev: number;
  specialCounterVol: number;
  specialLinkVol: number;
  intlExpressVol: number;
  mvno: number;
  box: number;
};

export type Mosu = {
  counter: Record<string, CounterMosu>;
  affiliate: Record<string, AffiliateMosu>;
  marketing: Record<string, MarketingMosu>;
  court: CourtMosu; // 법원구내우체국 기준값 (지방청과 관계없이 하나)
  // 우편마케팅 전체 평균 기준값. 소속국 계약소포 세입이 3억 원을 넘을 때 총괄국 산출기준에 쓴다.
  marketingAllAvg: { parcelRev: number; pickupVol: number };
};

export type CalcLine = {
  section: "우편창구" | "우편마케팅";
  name: string;
  formula: string; // 적용한 산출식(근거)
  value: number; // 소요 인력(명). unsupported가 있으면 계산하지 않은 것이므로 0이고 합계에도 반영하지 않는다.
  note?: string;
  // 규정에는 있지만 이 화면이 아직 지원하지 않아 계산하지 않은 경우의 이유. (규정에 없는 경우와 구분한다.)
  unsupported?: string;
};

// 별표 2 우편마케팅 > 소속국: 계약소포 연간세입이 3억 원을 초과하면 총괄국 산출기준을 따른다.
export const AFFILIATE_PARCEL_REV_LIMIT = 300_000_000;

export type CalcResult = {
  lines: CalcLine[];
  counterTotal: number;
  marketingTotal: number;
  total: number;
  warnings: string[];
};

// 0으로 나누지 않도록 막는다. 기준값이 0이면 0명으로 본다. (기준값 0은 입력 점검에서 먼저 막는다.)
function div(a: number, b: number) {
  return b === 0 ? 0 : a / b;
}

const v = (values: Values, key: string) => values[key] ?? 0;

// 우편마케팅 "계약소포 연간세입" 줄 (총괄국 산출기준): [계약소포세입−(입점업체세입×0.5)]÷기준세입
function contractRevenueLine(contract: number, storeRev: number, refRev: number, note?: string): CalcLine {
  return {
    section: "우편마케팅",
    name: "계약소포 연간세입",
    formula: "[계약소포세입−(입점업체세입×0.5)]÷청별기준세입",
    value: div(contract - storeRev * 0.5, refRev),
    note,
  };
}

// 우편마케팅 "픽업물량" 줄 (총괄국 산출기준)
function pickupLine(values: Values, refPickup: number, workdays: number, note?: string): CalcLine {
  const store = v(values, "storePartnerVol");
  const simple = v(values, "simpleReceiptVol");
  const direct = v(values, "directShipVol");
  const manual = v(values, "manualLabelVol");
  const sum =
    (v(values, "contractIndividualVol") - v(values, "pickupIndividualVol")) * 2 +
    (v(values, "contractVol") - store - simple - direct - manual) +
    store * 0.7 +
    simple * 0.6 +
    direct * 0.4 +
    manual * 2 +
    v(values, "returnParcelPickupVol") * 2 +
    v(values, "returnDeliveryVol") * 0.8 +
    (v(values, "intlExpressVisitVol") - v(values, "collectAgentVol")) * 3 +
    (v(values, "collectAgentVol") - v(values, "collectAgentCounterVol")) * 0.5;
  return {
    section: "우편마케팅",
    name: "픽업물량",
    formula:
      "【[(개별픽업−집배원개별픽업)×2]+(계약업체−입점업체−간편접수−직발송−수기기표지)+(입점업체×0.7)+(간편접수×0.6)+(직발송×0.4)+(수기기표지×2)+(반품픽업×2)+(반품배달×0.8)+[(국제특급방문접수−수집대행업체)×3]+[(수집대행업체−수집대행 중 창구접수)×0.5]】÷(청별기준물량×연간근무일수×2)",
    value: div(sum, refPickup * workdays * 2),
    note: [note, `연간근무일수 ${workdays}일`].filter(Boolean).join(" · "),
  };
}

// 소속국·법원구내우체국의 우편마케팅. 계약소포 세입이 3억 원 이하면 "계약소포 연간세입÷소속국 기준세입"이고,
// 3억 원을 초과하면 별표 2에 따라 총괄국 산출기준(계약소포 연간세입 + 픽업물량)을 전체 평균 기준값으로 적용한다.
function affiliateMarketingLines(values: Values, mosu: Mosu, region: string, workdays: number): CalcLine[] {
  const contract = v(values, "contractParcelRevAffiliate");
  if (contract > AFFILIATE_PARCEL_REV_LIMIT) {
    const note = "계약소포 세입 3억 원 초과 → 총괄국 산출기준(기준값은 전체 평균) 적용";
    return [
      contractRevenueLine(contract, v(values, "storePartnerRev"), mosu.marketingAllAvg.parcelRev, note),
      pickupLine(values, mosu.marketingAllAvg.pickupVol, workdays, note),
    ];
  }
  return [
    {
      section: "우편마케팅",
      name: "계약소포 연간세입",
      formula: "계약소포 연간세입÷청별기준세입",
      value: div(contract, mosu.marketing[region].affiliateParcelRev),
    },
  ];
}

export function calcOffice(
  kind: CalcKind,
  values: Values,
  mosu: Mosu,
  region: string,
  workdays: number,
): CalcResult {
  const lines: CalcLine[] = [];
  const warnings: string[] = [];
  const add = (l: CalcLine) => lines.push(l);

  if (kind === "총괄국") {
    // ── 우편창구 ──
    const c = mosu.counter[region];

    const email = v(values, "emailSelfRev") + v(values, "emailConsignRev"); // 전자우편세입
    const general = div(
      v(values, "domGeneralRev") - email + email * 3.5 + v(values, "intlGeneralRev"),
      c.generalRev,
    );
    add({
      section: "우편창구",
      name: "일반통상",
      formula:
        "{(국내일반통상세입−전자우편세입)+[(전자우편자체제작세입+전자우편위탁제작세입)×3.5]+국제일반통상세입}÷청별기준세입",
      value: general,
    });

    const content = v(values, "contentCertVol");
    const label = v(values, "labelingVol");
    const special =
      div(
        v(values, "domSpecialVol") - v(values, "specialHubVol") - content + content * 5 + v(values, "intlSpecialVol") - label,
        c.specialVol,
      ) + div(label, c.specialVol * 5);
    add({
      section: "우편창구",
      name: "특수통상",
      formula:
        "{(국내특수통상물량−HUB·사업자포털물량−내용증명)+(내용증명×5)+국제특수통상물량−추가정보라벨링물량}÷청별기준물량+{추가정보라벨링물량÷(청별기준물량×5)}",
      value: special,
    });

    const air = v(values, "intlAirParcelVol");
    const parcel = div(
      v(values, "parcelRegularVol") + v(values, "parcelRegisteredCounterVol") + v(values, "intlParcelVol") - air,
      c.parcelVol,
    );
    add({
      section: "우편창구",
      name: "소포",
      formula: "(보통소포물량+창구접수등기소포물량+국제소포물량−국제항공소포물량)÷청별기준물량",
      value: parcel,
    });

    // 국제특급은 "창구접수 限"이라서 국제특급 전체 물량이 아니라 창구접수 물량만 쓴다.
    const express = div(air + v(values, "kpacketVol") + v(values, "intlExpressCounterVol"), c.intlVol);
    add({
      section: "우편창구",
      name: "국제특급",
      formula: "(국제항공소포물량+Kpacket물량+국제특급물량(창구접수))÷청별기준물량",
      value: express,
    });

    const mvno = div(v(values, "mvnoCount"), c.mvno);
    const box = div(v(values, "parcelBoxCount"), c.box);
    // "기본인력 외 우편분야 산출인력"에는 알뜰폰·소포상자 인력도 포함된다. (담당자 산출 파일과 같은 기준)
    const postal = general + special + parcel + express + mvno + box;
    const basic = 1 + (postal >= 3 ? 1 : 0);
    add({
      section: "우편창구",
      name: "기본인력",
      formula: "1명 + 1명(기본인력 외 우편분야 산출인력 3명 이상 限)",
      value: basic,
      note: `우편분야 산출인력(일반통상+특수통상+소포+국제특급+알뜰폰+소포상자) ${postal.toFixed(2)}명`,
    });

    add({ section: "우편창구", name: "알뜰폰", formula: "판매실적÷청별기준건수", value: mvno });
    add({ section: "우편창구", name: "소포상자", formula: "판매물량÷청별기준건수", value: box });

    // ── 우편마케팅 ──
    const mk = mosu.marketing[region];

    const contractLine = contractRevenueLine(v(values, "contractParcelRev"), v(values, "storePartnerRev"), mk.parcelRev);
    const pickup = pickupLine(values, mk.pickupVol, workdays);
    add(contractLine);
    add(pickup);

    const mkBase = contractLine.value + pickup.value;
    add({
      section: "우편마케팅",
      name: "마케팅 지원",
      formula: "1명(마케팅분야 산출인력 3명 이상 限)",
      value: mkBase >= 3 ? 1 : 0,
      note: `마케팅분야 산출인력(계약소포 연간세입+픽업물량) ${mkBase.toFixed(2)}명`,
    });
  } else if (kind === "소속국") {
    // ── 소속국 우편창구 ──
    const a = mosu.affiliate[region];
    add({
      section: "우편창구",
      name: "연간세입",
      formula: "(소속국총세입−소속국계약소포세입)÷소속국 기준세입",
      value: div(v(values, "totalRevenue") - v(values, "contractParcelRevAffiliate"), a.generalRev),
    });
    add({ section: "우편창구", name: "기본인력", formula: "0.5명 (우편·금융창구 공통 인력)", value: 0.5 });
    add({ section: "우편창구", name: "알뜰폰", formula: "판매실적÷청별기준건수", value: div(v(values, "mvnoCount"), a.mvno) });
    add({ section: "우편창구", name: "소포상자", formula: "판매물량÷청별기준건수", value: div(v(values, "parcelBoxCount"), a.box) });

    // ── 소속국 우편마케팅 ──
    affiliateMarketingLines(values, mosu, region, workdays).forEach(add);
  } else {
    // ── 법원구내우체국 우편창구 ──
    const court = mosu.court;
    // 법원구내우체국은 특수통상·국제특급 세입을 총세입에서 빼고 따로 물량으로 계산한다.
    const generalRev =
      v(values, "totalRevenue") - (v(values, "domSpecialRev") + v(values, "intlSpecialRev") + v(values, "intlExpressRev"));
    add({
      section: "우편창구",
      name: "연간세입",
      formula: "[소속국총세입−(국내특수통상세입+국제특수통상세입+국제특급세입)]÷법원구내우체국기준세입",
      value: div(generalRev, court.generalRev),
    });
    add({
      section: "우편창구",
      name: "특수통상(창구접수)",
      formula: "법원우체국특수통상개별접수물량÷법원구내우체국기준물량",
      value: div(v(values, "courtSpecialIndividualVol"), court.specialCounterVol),
    });
    add({
      section: "우편창구",
      name: "특수통상(연계접수)",
      formula: "법원우체국특수통상시스템연계물량÷법원구내우체국기준물량",
      value: div(v(values, "courtSystemLinkVol"), court.specialLinkVol),
    });
    add({
      section: "우편창구",
      name: "국제특급",
      formula: "국제특급물량÷법원구내우체국기준물량",
      value: div(v(values, "intlExpressVol"), court.intlExpressVol),
    });
    add({ section: "우편창구", name: "기본인력", formula: "0.5명 (우편·금융창구 공통 인력)", value: 0.5 });
    add({ section: "우편창구", name: "알뜰폰", formula: "판매실적÷법원구내우체국기준건수", value: div(v(values, "mvnoCount"), court.mvno) });
    add({ section: "우편창구", name: "소포상자", formula: "판매물량÷법원구내우체국기준건수", value: div(v(values, "parcelBoxCount"), court.box) });

    // ── 법원구내우체국 우편마케팅 (소속국과 같은 산출식) ──
    affiliateMarketingLines(values, mosu, region, workdays).forEach(add);
  }

  const counterTotal = lines.filter((l) => l.section === "우편창구").reduce((s, l) => s + l.value, 0);
  const marketingTotal = lines.filter((l) => l.section === "우편마케팅").reduce((s, l) => s + l.value, 0);
  return { lines, counterTotal, marketingTotal, total: counterTotal + marketingTotal, warnings };
}
