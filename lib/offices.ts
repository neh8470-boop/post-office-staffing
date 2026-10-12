import { readFile } from "node:fs/promises";
import path from "node:path";

export type Office = {
  code: string; // 금융국기호 (없는 관서는 'p' + 우편국기호)
  name: string; // 우체국명
  // 형태. 별정국·출장소·시간제는 소속국과 같은 산출식을 쓰고, 법원국(법원구내우체국)은 따로 계산한다.
  kind: "총괄국" | "별정국" | "소속국" | "법원국" | "출장소" | "시간제";
  values: Record<string, number>;
};

// 총괄국 하나와 그 소속국들의 묶음. 합계는 묶음 안에서 합산해 반올림한다.
export type OfficeGroup = {
  id: string;
  name: string; // 총괄국 이름
  offices: Office[]; // 첫 번째가 총괄국
};

// 내부용 자료(data 폴더, git 제외)에서 총괄국 묶음들을 읽는다. 파일이 없거나 비어 있으면 null을 돌려준다.
export async function loadOfficeGroups(): Promise<OfficeGroup[] | null> {
  try {
    const text = await readFile(path.join(process.cwd(), "data", "groups.json"), "utf8");
    const groups = JSON.parse(text) as OfficeGroup[];
    return groups.length > 0 ? groups : null;
  } catch {
    return null;
  }
}
