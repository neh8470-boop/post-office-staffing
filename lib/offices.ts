import { readFile } from "node:fs/promises";
import path from "node:path";

export type Office = {
  code: string; // 금융국기호
  name: string; // 우체국명
  kind: "총괄국" | "일반국" | "별정국" | "소속국";
  values: Record<string, number>;
};

// 내부용 자료(data 폴더)에서 관서 목록을 읽는다. 파일이 없으면 null을 돌려준다.
export async function loadOffices(): Promise<Office[] | null> {
  try {
    const file = path.join(process.cwd(), "data", "offices.json");
    const text = await readFile(file, "utf8");
    return JSON.parse(text) as Office[];
  } catch {
    return null;
  }
}
