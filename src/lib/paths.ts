import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageName = "korean-special-education-curriculum-mcp";

export function findProjectRoot(fromUrl: string = import.meta.url): string {
  let current = dirname(fileURLToPath(fromUrl));

  while (true) {
    const packagePath = join(current, "package.json");
    if (existsSync(packagePath)) {
      try {
        const pkg = JSON.parse(readFileSync(packagePath, "utf8")) as { name?: string };
        if (pkg.name === packageName) return current;
      } catch {
        // 상위 디렉터리를 계속 탐색한다.
      }
    }

    const parent = resolve(current, "..");
    if (parent === current) break;
    current = parent;
  }

  throw new Error(`${packageName} 프로젝트 루트를 찾지 못했습니다.`);
}
