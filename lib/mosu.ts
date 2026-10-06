import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Mosu } from "./calc";

// 내부용 모수 자료(data/mosu.json)를 읽는다. 파일이 없으면 null을 돌려준다.
export async function loadMosu(): Promise<Mosu | null> {
  try {
    const file = path.join(process.cwd(), "data", "mosu.json");
    return JSON.parse(await readFile(file, "utf8")) as Mosu;
  } catch {
    return null;
  }
}
