// 입력 항목 정의. 이름은 「(기초자료1) 우편창구(마케팅) 업무량」 파일의 머리글을 따랐고,
// 별표 2 산출식에서 쓰는 이름과 연결해 둔다. (key는 data/offices.json의 값 이름)

export type FieldGroup = "우편창구" | "우편마케팅";
export type OfficeKind = "총괄국" | "소속국";

export type FieldDef = {
  key: string;
  label: string;
  unit: "통" | "건" | "원" | "개";
  group: FieldGroup;
  section: string; // 같은 묶음끼리 소제목으로 모아 보여 주기 위한 이름
  kinds: OfficeKind[]; // 이 항목을 입력받는 관서 종류
};

const G: OfficeKind[] = ["총괄국"];
const S: OfficeKind[] = ["소속국"];
const GS: OfficeKind[] = ["총괄국", "소속국"];

export const FIELDS: FieldDef[] = [
  // ── 우편창구 · 일반통상 ──
  { key: "domGeneralRev", label: "국내 일반통상 세입", unit: "원", group: "우편창구", section: "일반통상", kinds: G },
  { key: "emailSelfRev", label: "전자우편 자체제작 세입", unit: "원", group: "우편창구", section: "일반통상", kinds: G },
  { key: "emailConsignRev", label: "전자우편 위탁제작 세입", unit: "원", group: "우편창구", section: "일반통상", kinds: G },
  { key: "intlGeneralRev", label: "국제 일반통상 세입", unit: "원", group: "우편창구", section: "일반통상", kinds: G },
  // ── 우편창구 · 특수통상 ──
  { key: "domSpecialVol", label: "국내 특수통상 물량", unit: "통", group: "우편창구", section: "특수통상", kinds: G },
  { key: "specialHubVol", label: "국내 특수통상 Hub·사업자포털 물량", unit: "통", group: "우편창구", section: "특수통상", kinds: G },
  { key: "contentCertVol", label: "내용증명 물량", unit: "통", group: "우편창구", section: "특수통상", kinds: G },
  { key: "intlSpecialVol", label: "국제 특수통상 물량", unit: "통", group: "우편창구", section: "특수통상", kinds: G },
  { key: "labelingVol", label: "추가정보 라벨링(접수정보+라벨링) 물량", unit: "통", group: "우편창구", section: "특수통상", kinds: G },
  // ── 우편창구 · 소포 ──
  { key: "parcelRegularVol", label: "보통소포 물량", unit: "통", group: "우편창구", section: "소포", kinds: G },
  { key: "parcelRegisteredCounterVol", label: "창구접수 등기소포 물량", unit: "통", group: "우편창구", section: "소포", kinds: G },
  { key: "intlParcelVol", label: "국제 소포 물량", unit: "통", group: "우편창구", section: "소포", kinds: G },
  { key: "intlAirParcelVol", label: "국제 항공소포 물량", unit: "통", group: "우편창구", section: "소포", kinds: G },
  // ── 우편창구 · 국제특급 ──
  { key: "kpacketVol", label: "Kpacket 물량", unit: "통", group: "우편창구", section: "국제특급", kinds: G },
  { key: "intlExpressVol", label: "국제특급 물량", unit: "통", group: "우편창구", section: "국제특급", kinds: G },
  // ── 우편창구 · 소속국 세입 ──
  { key: "totalRevenue", label: "소속국 총세입", unit: "원", group: "우편창구", section: "소속국 세입", kinds: S },
  // 같은 값을 우편창구 연간세입(총세입에서 뺌)과 우편마케팅 계약소포 연간세입에 함께 쓰므로 한 곳에만 둔다.
  { key: "contractParcelRevAffiliate", label: "소속국 계약소포 세입 (우편창구·우편마케팅 공통)", unit: "원", group: "우편창구", section: "소속국 세입", kinds: S },
  // ── 우편창구 · 기타업무(공통) ──
  { key: "mvnoCount", label: "알뜰폰 판매실적(가입건수)", unit: "건", group: "우편창구", section: "기타업무(공통)", kinds: GS },
  { key: "parcelBoxCount", label: "소포상자 판매물량", unit: "개", group: "우편창구", section: "기타업무(공통)", kinds: GS },
  // ── 우편마케팅 · 계약소포 세입 ──
  { key: "contractParcelRev", label: "계약소포 세입", unit: "원", group: "우편마케팅", section: "계약소포 세입", kinds: G },
  { key: "storePartnerRev", label: "입점업체 세입", unit: "원", group: "우편마케팅", section: "계약소포 세입", kinds: G },
  // ── 우편마케팅 · 픽업물량 ──
  { key: "contractIndividualVol", label: "개별 픽업물량", unit: "통", group: "우편마케팅", section: "픽업물량", kinds: G },
  { key: "pickupIndividualVol", label: "집배원 개별 픽업물량", unit: "통", group: "우편마케팅", section: "픽업물량", kinds: G },
  { key: "contractVol", label: "계약업체 물량", unit: "통", group: "우편마케팅", section: "픽업물량", kinds: G },
  { key: "storePartnerVol", label: "입점업체 물량", unit: "통", group: "우편마케팅", section: "픽업물량", kinds: G },
  { key: "simpleReceiptVol", label: "간편접수 물량", unit: "통", group: "우편마케팅", section: "픽업물량", kinds: G },
  { key: "directShipVol", label: "직발송 물량", unit: "통", group: "우편마케팅", section: "픽업물량", kinds: G },
  { key: "manualLabelVol", label: "수기기표지 물량", unit: "통", group: "우편마케팅", section: "픽업물량", kinds: G },
  { key: "returnParcelPickupVol", label: "반품 픽업물량", unit: "통", group: "우편마케팅", section: "픽업물량", kinds: G },
  { key: "returnDeliveryVol", label: "반품 배달물량", unit: "통", group: "우편마케팅", section: "픽업물량", kinds: G },
  { key: "intlExpressVisitVol", label: "국제특급 방문접수 물량", unit: "통", group: "우편마케팅", section: "픽업물량", kinds: G },
  { key: "collectAgentVol", label: "수집대행업체 물량", unit: "통", group: "우편마케팅", section: "픽업물량", kinds: G },
  { key: "collectAgentCounterVol", label: "수집대행업체 중 창구접수 물량", unit: "통", group: "우편마케팅", section: "픽업물량", kinds: G },
];

export const FIELD_GROUPS: FieldGroup[] = ["우편창구", "우편마케팅"];
