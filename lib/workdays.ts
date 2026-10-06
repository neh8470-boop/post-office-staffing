// 연간 근무일수 = 2026년 연간 총 일수 − 공제일수(토·일요일 + 공휴일(대체공휴일 포함))
// 공휴일은 법정 공휴일 기준으로 직접 적은 값이다. 실제 기준과 다르면 이 목록만 고치면 된다.
export const HOLIDAYS_2026: string[] = [
  "2026-01-01", // 신정
  "2026-02-16", "2026-02-17", "2026-02-18", // 설날 연휴
  "2026-03-01", "2026-03-02", // 삼일절(일요일) + 대체공휴일
  "2026-05-05", // 어린이날
  "2026-05-24", "2026-05-25", // 부처님오신날(일요일) + 대체공휴일
  "2026-06-03", // 지방선거일
  "2026-06-06", // 현충일(토요일, 대체공휴일 없음)
  "2026-08-15", "2026-08-17", // 광복절(토요일) + 대체공휴일
  "2026-09-24", "2026-09-25", "2026-09-26", // 추석 연휴
  "2026-10-03", "2026-10-05", // 개천절(토요일) + 대체공휴일
  "2026-10-09", // 한글날
  "2026-12-25", // 성탄절
];

export function countWorkdays2026(holidays: string[] = HOLIDAYS_2026): number {
  const holidaySet = new Set(holidays);
  let count = 0;
  for (let d = new Date(Date.UTC(2026, 0, 1)); d.getUTCFullYear() === 2026; d.setUTCDate(d.getUTCDate() + 1)) {
    const day = d.getUTCDay(); // 0 일요일, 6 토요일
    const iso = d.toISOString().slice(0, 10);
    if (day !== 0 && day !== 6 && !holidaySet.has(iso)) count += 1;
  }
  return count;
}
