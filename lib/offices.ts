import { readFile } from "node:fs/promises";
import path from "node:path";

export type Office = {
  code: string; // 금융국기호
  name: string; // 우체국명
  kind: "총괄국" | "별정국" | "소속국" | "법원국";
  values: Record<string, number>;
};

// 총괄국 하나와 그 소속국들의 묶음. 합계는 묶음 안에서 합산해 반올림한다.
export type OfficeGroup = {
  id: string;
  name: string; // 총괄국 이름
  offices: Office[]; // 첫 번째가 총괄국
};

// 화면에 보여 줄 묶음과 자료 파일. 파일은 data 폴더(내부용, git 제외)에 있다.
const GROUP_FILES = [
  { id: "mokpo", name: "목포우체국", file: "offices.json" },
  { id: "gwangju", name: "광주우체국", file: "gwangju-offices.json" },
];

// 내부용 자료(data 폴더)에서 관서 묶음들을 읽는다. 읽을 수 있는 파일이 하나도 없으면 null을 돌려준다.
export async function loadOfficeGroups(): Promise<OfficeGroup[] | null> {
  const groups: OfficeGroup[] = [];
  for (const g of GROUP_FILES) {
    try {
      const text = await readFile(path.join(process.cwd(), "data", g.file), "utf8");
      const offices = JSON.parse(text) as Office[];
      if (offices.length > 0) groups.push({ id: g.id, name: g.name, offices });
    } catch {
      // 파일이 없는 묶음은 건너뛴다.
    }
  }
  return groups.length > 0 ? groups : null;
}
