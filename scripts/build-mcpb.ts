import { spawn } from "node:child_process";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { findProjectRoot } from "../src/lib/paths.js";

function installRuntimeDependencies(stage: string, cache: string): Promise<void> {
  const npmArgs = ["ci", "--omit=dev", "--ignore-scripts", "--cache", cache];
  const command = process.platform === "win32" ? process.execPath : "npm";
  const args = process.platform === "win32"
    ? [join(dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js"), ...npmArgs]
    : npmArgs;
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: stage, stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`MCPB 실행 의존성 설치 실패(exit ${code ?? "unknown"})`));
    });
  });
}

async function main(): Promise<void> {
  const root = findProjectRoot();
  const stage = join(root, ".tmp", "mcpb");
  const pkg = JSON.parse(await readFile(join(root, "package.json"), "utf8")) as {
    name: string;
    version: string;
    type: string;
    engines: Record<string, string>;
    dependencies: Record<string, string>;
    devDependencies: Record<string, string>;
    overrides?: Record<string, string>;
  };
  const manifest = JSON.parse(await readFile(join(root, "mcpb", "manifest.json"), "utf8")) as {
    version?: string;
  };
  if (manifest.version !== pkg.version) {
    throw new Error(`MCPB 버전(${manifest.version})과 package 버전(${pkg.version})이 다릅니다.`);
  }

  await rm(stage, { recursive: true, force: true });
  await mkdir(join(stage, "server"), { recursive: true });
  await cp(join(root, "dist", "src"), join(stage, "server"), { recursive: true });

  await cp(join(root, "data", "core"), join(stage, "data", "core"), { recursive: true });
  await mkdir(join(stage, "sources", "official"), { recursive: true });
  await cp(
    join(root, "sources", "official", "source-catalog.json"),
    join(stage, "sources", "official", "source-catalog.json")
  );
  for (const fileName of [
    "ACKNOWLEDGEMENTS.md",
    "LICENSE",
    "LICENSES.md",
    "PROVENANCE.md",
    "README.md",
    "THIRD_PARTY_NOTICES.md"
  ]) {
    await cp(join(root, fileName), join(stage, fileName));
  }
  await cp(join(root, "mcpb", "manifest.json"), join(stage, "manifest.json"));
  await writeFile(
    join(stage, "package.json"),
    `${JSON.stringify({
      name: pkg.name,
      version: pkg.version,
      private: true,
      type: pkg.type,
      engines: pkg.engines,
      dependencies: pkg.dependencies,
      devDependencies: pkg.devDependencies,
      overrides: pkg.overrides
    }, null, 2)}\n`,
    "utf8"
  );
  await cp(join(root, "package-lock.json"), join(stage, "package-lock.json"));
  await installRuntimeDependencies(stage, join(root, ".tmp", "npm-cache"));
  await mkdir(join(root, "artifacts"), { recursive: true });
  process.stdout.write(`${stage}\n`);
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
