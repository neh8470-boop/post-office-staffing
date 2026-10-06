// 소요 인력 산출 (우편창구·우편마케팅). 별표 2의 산출식을 그대로 옮긴 순수 함수들이다.
// 같은 입력이면 항상 같은 결과가 나오며, 화면 코드와 분리해 둔다.

export type Values = Record<string, number>;

type CounterMosu = { generalRev: number; specialVol: number; parcelVol: number; intlVol: number; mvno: number; box: number };
type AffiliateMosu = { generalRev: number; mvno: number; box: number };
type MarketingMosu = { parcelRev: number; pickupVol: number; affiliateParcelRev: number };

export type Mosu = {
  counter: Record<string, CounterMosu>;
  affiliate: Record<string, AffiliateMosu>;
  marketing: Record<string, MarketingMosu>;
  marketingAllAvg: { parcelRev: number; pickupVol: number };
};

export type CalcLine = {
  section: "우편창구" | "우편마케팅";
  name: string;
  formula: string; // 적용한 산출식(근거)
  value: number; // 소요 인력(명)
  note?: string;
};

export type CalcResult = {
  lines: CalcLine[];
  counterTotal: number;
  marketingTotal: number;
  total: number;
  warnings: string[];
};

// 한 지방청 값과 전체 평균을 가중 평균한다. 예: 전체 평균 2 : 지방청 1
function weighted(all: number, region: number, wAll: number, wRegion: number) {
  return (all * wAll + region * wRegion) / (wAll + wRegion);
}

function mean(values: number[]) {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

// 0으로 나누지 않도록 막는다. 기준값이 0이면 0명으로 본다.
function div(a: number, b: number) {
  return b === 0 ? 0 : a / b;
}

const v = (values: Values, key: string) => values[key] ?? 0;

// 총괄국 우편창구 모수의 청별 기준값 (전체 평균 2 : 해당 지방청 1)
function counterRef(mosu: Mosu, region: string, field: keyof CounterMosu) {
  const all = mean(Object.values(mosu.counter).map((m) => m[field]));
  return weighted(all, mosu.counter[region][field], 2, 1);
}

// 소속국 우편창구 모수의 청별 기준값 (전체 평균 2 : 해당 지방청 1)
function affiliateRef(mosu: Mosu, region: string, field: keyof AffiliateMosu) {
  const all = mean(Object.values(mosu.affiliate).map((m) => m[field]));
  return weighted(all, mosu.affiliate[region][field], 2, 1);
}

export function calcOffice(
  kind: "총괄국" | "소속국",
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
    const refRev = counterRef(mosu, region, "generalRev");
    const refSpecial = counterRef(mosu, region, "specialVol");
    const refParcel = counterRef(mosu, region, "parcelVol");
    const refIntl = counterRef(mosu, region, "intlVol");
    const refMvno = counterRef(mosu, region, "mvno");
    const refBox = counterRef(mosu, region, "box");

    const email = v(values, "emailSelfRev") + v(values, "emailConsignRev"); // 전자우편세입
    const general = div(
      v(values, "domGeneralRev") - email + email * 3.5 + v(values, "intlGeneralRev"),
      refRev,
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
        refSpecial,
      ) + div(label, refSpecial * 5);
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
      refParcel,
    );
    add({
      section: "우편창구",
      name: "소포",
      formula: "(보통소포물량+창구접수등기소포물량+국제소포물량−국제항공소포물량)÷청별기준물량",
      value: parcel,
    });

    const express = div(air + v(values, "kpacketVol") + v(values, "intlExpressVol"), refIntl);
    add({
      section: "우편창구",
      name: "국제특급",
      formula: "(국제항공소포물량+Kpacket물량+국제특급물량)÷청별기준물량",
      value: express,
    });

    const postal = general + special + parcel + express;
    const basic = 1 + (postal >= 3 ? 1 : 0);
    add({
      section: "우편창구",
      name: "기본인력",
      formula: "1명 + 1명(기본인력 외 우편분야 산출인력 3명 이상 限)",
      value: basic,
      note: `우편분야 산출인력(일반통상+특수통상+소포+국제특급) ${postal.toFixed(2)}명`,
    });

    add({
      section: "우편창구",
      name: "알뜰폰",
      formula: "판매실적÷청별기준건수",
      value: div(v(values, "mvnoCount"), refMvno),
    });
    add({
      section: "우편창구",
      name: "소포상자",
      formula: "판매물량÷청별기준건수",
      value: div(v(values, "parcelBoxCount"), refBox),
    });

    // ── 우편마케팅 ──
    const mk = mosu.marketing[region];
    const refParcelRev = weighted(mosu.marketingAllAvg.parcelRev, mk.parcelRev, 1, 1);
    const refPickup = weighted(mosu.marketingAllAvg.pickupVol, mk.pickupVol, 1, 1);

    const contractRev = div(v(values, "contractParcelRev") - v(values, "storePartnerRev") * 0.5, refParcelRev);
    add({
      section: "우편마케팅",
      name: "계약소포 연간세입",
      formula: "[계약소포세입−(입점업체세입×0.5)]÷청별기준세입",
      value: contractRev,
    });

    const store = v(values, "storePartnerVol");
    const simple = v(values, "simpleReceiptVol");
    const direct = v(values, "directShipVol");
    const manual = v(values, "manualLabelVol");
    const pickupSum =
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
    const pickup = div(pickupSum, refPickup * workdays * 2);
    add({
      section: "우편마케팅",
      name: "픽업물량",
      formula:
        "【[(개별픽업−집배원개별픽업)×2]+(계약업체−입점업체−간편접수−직발송−수기기표지)+(입점업체×0.7)+(간편접수×0.6)+(직발송×0.4)+(수기기표지×2)+(반품픽업×2)+(반품배달×0.8)+[(국제특급방문접수−수집대행업체)×3]+[(수집대행업체−수집대행 중 창구접수)×0.5]】÷(청별기준물량×연간근무일수×2)",
      value: pickup,
      note: `연간근무일수 ${workdays}일`,
    });

    const mkBase = contractRev + pickup;
    add({
      section: "우편마케팅",
      name: "마케팅 지원",
      formula: "1명(마케팅분야 산출인력 3명 이상 限)",
      value: mkBase >= 3 ? 1 : 0,
      note: `마케팅분야 산출인력(계약소포 연간세입+픽업물량) ${mkBase.toFixed(2)}명`,
    });
  } else {
    // ── 소속국 우편창구 ──
    const allRev = mean(Object.values(mosu.affiliate).map((m) => m.generalRev));
    const revenue = div(v(values, "totalRevenue") - v(values, "contractParcelRevAffiliate"), allRev);
    add({
      section: "우편창구",
      name: "연간세입",
      formula: "(소속국총세입−소속국계약소포세입)÷전체 평균",
      value: revenue,
    });
    add({ section: "우편창구", name: "기본인력", formula: "0.5명 (우편·금융창구 공통 인력)", value: 0.5 });
    add({
      section: "우편창구",
      name: "알뜰폰",
      formula: "판매실적÷청별기준건수",
      value: div(v(values, "mvnoCount"), affiliateRef(mosu, region, "mvno")),
    });
    add({
      section: "우편창구",
      name: "소포상자",
      formula: "판매물량÷청별기준건수",
      value: div(v(values, "parcelBoxCount"), affiliateRef(mosu, region, "box")),
    });

    // ── 소속국 우편마케팅 ──
    const contract = v(values, "contractParcelRevAffiliate");
    const allAffiliateRev = mean(Object.values(mosu.marketing).map((m) => m.affiliateParcelRev));
    const ref = weighted(allAffiliateRev, mosu.marketing[region].affiliateParcelRev, 1, 1);
    add({
      section: "우편마케팅",
      name: "계약소포 연간세입",
      formula: "계약소포 연간세입÷청별기준세입",
      value: div(contract, ref),
    });
    if (contract > 300_000_000) {
      warnings.push(
        "소속국 계약소포 세입이 3억 원을 넘어 총괄국 산출기준을 따라야 하지만, 이 화면은 아직 지원하지 않습니다.",
      );
    }
  }

  const counterTotal = lines.filter((l) => l.section === "우편창구").reduce((s, l) => s + l.value, 0);
  const marketingTotal = lines.filter((l) => l.section === "우편마케팅").reduce((s, l) => s + l.value, 0);
  return { lines, counterTotal, marketingTotal, total: counterTotal + marketingTotal, warnings };
}
