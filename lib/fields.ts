// 입력 항목 정의. 이름은 「(기초자료1) 우편창구(마케팅) 업무량」 파일의 머리글을 따랐다.
// 산출식(별표 2)과의 연결은 아직 확정 전이므로 여기서는 화면 표시용 정보만 둔다.

export type FieldGroup = "우편창구" | "우편마케팅";

export type FieldDef = {
  key: string; // data/offices.json의 값 이름
  label: string; // 화면에 보이는 항목 이름
  unit: "통" | "건" | "원" | "개";
  group: FieldGroup;
  section: string; // 같은 묶음끼리 소제목으로 모아 보여 주기 위한 이름
};

export const FIELDS: FieldDef[] = [
  // ── 우편창구 · 국내우편 일반통상 ──
  { key: "domGeneralVol", label: "일반통상 물량", unit: "통", group: "우편창구", section: "국내 일반통상" },
  { key: "emailSelfVol", label: "전자우편 자체제작 물량", unit: "통", group: "우편창구", section: "국내 일반통상" },
  { key: "emailConsignVol", label: "전자우편 위탁제작 물량", unit: "통", group: "우편창구", section: "국내 일반통상" },
  { key: "emailLinkVol", label: "연계실적(Hub+사업자포털) 물량", unit: "통", group: "우편창구", section: "국내 일반통상" },
  // ── 우편창구 · 국내우편 특수통상 ──
  { key: "domSpecialVol", label: "특수통상 물량", unit: "통", group: "우편창구", section: "국내 특수통상" },
  { key: "specialHubVol", label: "Hub+사업자포털 물량", unit: "통", group: "우편창구", section: "국내 특수통상" },
  { key: "specialHubEmailVol", label: "Hub+사업자포털+전자우편위탁 물량", unit: "통", group: "우편창구", section: "국내 특수통상" },
  { key: "labelingVol", label: "접수정보+라벨링 물량", unit: "통", group: "우편창구", section: "국내 특수통상" },
  { key: "courtSpecialIndividualVol", label: "법원우체국 특수통상 개별접수 물량", unit: "통", group: "우편창구", section: "국내 특수통상" },
  // ── 우편창구 · 국내우편 소포 ──
  { key: "parcelRegularVol", label: "보통소포 물량", unit: "통", group: "우편창구", section: "국내 소포" },
  { key: "parcelRegisteredCounterVol", label: "등기소포 창구 물량", unit: "통", group: "우편창구", section: "국내 소포" },
  // ── 우편창구 · 국제우편 ──
  { key: "intlGeneralVol", label: "국제 일반통상 물량", unit: "통", group: "우편창구", section: "국제우편" },
  { key: "intlSpecialVol", label: "국제 특수통상 물량", unit: "통", group: "우편창구", section: "국제우편" },
  { key: "intlParcelVol", label: "국제 소포 물량", unit: "통", group: "우편창구", section: "국제우편" },
  { key: "kpacketVol", label: "Kpacket 물량", unit: "통", group: "우편창구", section: "국제우편" },
  { key: "intlExpressVol", label: "국제특급 물량", unit: "통", group: "우편창구", section: "국제우편" },
  // ── 우편창구 · 기타 ──
  { key: "mvnoCount", label: "알뜰폰 가입건수", unit: "건", group: "우편창구", section: "기타업무" },
  { key: "parcelBoxCount", label: "소포상자 판매물량", unit: "개", group: "우편창구", section: "기타업무" },
  { key: "totalRevenue", label: "총세입", unit: "원", group: "우편창구", section: "세입" },
  { key: "revenueBS", label: "세입 (원본 열 BS)", unit: "원", group: "우편창구", section: "세입" },
  { key: "revenueBU", label: "세입 (원본 열 BU)", unit: "원", group: "우편창구", section: "세입" },
  // ── 우편마케팅 · 소포 계약·픽업 ──
  { key: "parcelRegisteredVol", label: "등기소포 소포 물량", unit: "통", group: "우편마케팅", section: "소포 계약·픽업" },
  { key: "contractVol", label: "계약 기준 계약업체 물량", unit: "통", group: "우편마케팅", section: "소포 계약·픽업" },
  { key: "contractIndividualVol", label: "계약 기준 개별 물량", unit: "통", group: "우편마케팅", section: "소포 계약·픽업" },
  { key: "storePartnerVol", label: "입점업체 물량", unit: "통", group: "우편마케팅", section: "소포 계약·픽업" },
  { key: "simpleReceiptVol", label: "간편접수 물량", unit: "통", group: "우편마케팅", section: "소포 계약·픽업" },
  { key: "directShipVol", label: "직발송 물량", unit: "통", group: "우편마케팅", section: "소포 계약·픽업" },
  { key: "eLabelVol", label: "전자기표지 사용물량", unit: "통", group: "우편마케팅", section: "소포 계약·픽업" },
  { key: "pickupReturnVol", label: "집배원 픽업 반품 물량", unit: "통", group: "우편마케팅", section: "소포 계약·픽업" },
  { key: "pickupIndividualVol", label: "집배원 픽업 개별 물량", unit: "통", group: "우편마케팅", section: "소포 계약·픽업" },
  { key: "returnParcelPickupVol", label: "반품소포 픽업물량", unit: "통", group: "우편마케팅", section: "소포 계약·픽업" },
  // ── 우편마케팅 · 국제특급·수집대행 ──
  { key: "intlExpressCounterVol", label: "국제특급 창구접수 물량", unit: "통", group: "우편마케팅", section: "국제특급·수집대행" },
  { key: "intlExpressVisitVol", label: "국제특급 방문접수 물량", unit: "통", group: "우편마케팅", section: "국제특급·수집대행" },
  { key: "collectAgentVol", label: "수집대행업체 물량", unit: "통", group: "우편마케팅", section: "국제특급·수집대행" },
  { key: "collectAgentCounterVol", label: "수집대행업체 중 창구접수실적(감액 전)", unit: "통", group: "우편마케팅", section: "국제특급·수집대행" },
];

export const FIELD_GROUPS: FieldGroup[] = ["우편창구", "우편마케팅"];
