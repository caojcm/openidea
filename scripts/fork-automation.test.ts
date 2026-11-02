// @vitest-environment node
import { afterEach, describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const directories: string[] = [];
const bash =
  process.platform === "win32"
    ? join(dirname(dirname(execFileSync("where", ["git"], { encoding: "utf8" }).split(/\r?\n/)[0]!)), "bin", "bash.exe")
    : "bash";

afterEach(() => {
  for (const directory of directories.splice(0)) {
    const path = realpathSync(directory);
    if (dirname(path) !== realpathSync(tmpdir()) || !basename(path).startsWith("openidea-automation-")) {
      throw new Error(`Refusing to remove a directory outside the test fixtures: ${path}`);
    }
    rmSync(path, { recursive: true, force: true });
  }
});

function fixtureDirectory(): string {
  const directory = mkdtempSync(join(tmpdir(), "openidea-automation-"));
  directories.push(directory);
  return directory;
}

function git(cwd: string, ...args: string[]): string {
  return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

function commit(cwd: string, filename: string, content: string): string {
  writeFileSync(join(cwd, filename), content);
  git(cwd, "add", filename);
  git(cwd, "-c", "user.name=Test", "-c", "user.email=test@example.com", "commit", "-m", filename);
  return git(cwd, "rev-parse", "HEAD");
}

function syncFixture() {
  const directory = fixtureDirectory();
  const upstream = join(directory, "upstream");
  const origin = join(directory, "origin.git");
  const checkout = join(directory, "checkout");
  const output = join(directory, "outputs.txt");
  git(directory, "init", "-b", "main", upstream);
  git(upstream, "config", "core.autocrlf", "false");
  commit(upstream, "shared.txt", "base\n");
  git(directory, "clone", "--bare", upstream, origin);
  git(directory, "clone", origin, checkout);
  git(checkout, "config", "core.autocrlf", "false");
  writeFileSync(output, "");
  return { upstream, origin, checkout, output };
}

function sync(fixture: ReturnType<typeof syncFixture>) {
  return spawnSync(bash, [join(root, "scripts", "sync-upstream.sh").replaceAll("\\", "/"), fixture.upstream], {
    cwd: fixture.checkout,
    env: { ...process.env, GITHUB_OUTPUT: fixture.output.replaceAll("\\", "/") },
    encoding: "utf8",
  });
}

describe("fork upstream sync", () => {
  it("does not push or rebuild when main already contains upstream", () => {
    const fixture = syncFixture();
    const fork = commit(fixture.checkout, "fork.txt", "keep this file\n");
    git(fixture.checkout, "push", "origin", "HEAD:main");
    const result = sync(fixture);
    expect(result.status, result.stderr).toBe(0);
    expect(git(fixture.origin, "rev-parse", "main")).toBe(fork);
    expect(readFileSync(fixture.output, "utf8")).toBe(`changed=false\nsha=${fork}\n`);
  });

  it("merges and pushes upstream while retaining fork-only commits", () => {
    const fixture = syncFixture();
    const fork = commit(fixture.checkout, "fork.txt", "keep this file\n");
    git(fixture.checkout, "push", "origin", "HEAD:main");
    const upstream = commit(fixture.upstream, "new.txt", "upstream update\n");
    const result = sync(fixture);
    expect(result.status, result.stderr).toBe(0);
    const merged = git(fixture.checkout, "rev-parse", "HEAD");
    expect(git(fixture.origin, "rev-parse", "main")).toBe(merged);
    expect(git(fixture.checkout, "merge-base", "--is-ancestor", fork, merged)).toBe("");
    expect(git(fixture.checkout, "merge-base", "--is-ancestor", upstream, merged)).toBe("");
    expect(readFileSync(join(fixture.checkout, "fork.txt"), "utf8")).toBe("keep this file\n");
    expect(readFileSync(join(fixture.checkout, "new.txt"), "utf8")).toBe("upstream update\n");
    expect(readFileSync(fixture.output, "utf8")).toBe(`changed=true\nsha=${merged}\n`);
  });

  it("fails without changing origin/main when upstream conflicts", () => {
    const fixture = syncFixture();
    const fork = commit(fixture.checkout, "shared.txt", "fork edit\n");
    git(fixture.checkout, "push", "origin", "HEAD:main");
    commit(fixture.upstream, "shared.txt", "upstream edit\n");
    const result = sync(fixture);
    expect(result.status).toBe(1);
    expect(git(fixture.origin, "rev-parse", "main")).toBe(fork);
    expect(git(fixture.checkout, "rev-parse", "HEAD")).toBe(fork);
    expect(git(fixture.checkout, "status", "--porcelain")).toBe("");
    expect(readFileSync(fixture.output, "utf8")).toBe("");
    expect(`${result.stdout}${result.stderr}`).toContain("conflict");
  });
});

describe.skipIf(process.platform !== "win32")("Windows portable packaging", () => {
  it("packages the executable, DLLs, licenses and guide with a valid checksum", () => {
    const directory = fixtureDirectory();
    const binary = join(directory, "openidea.exe");
    const output = join(directory, "package with spaces");
    writeFileSync(binary, "executable fixture");
    writeFileSync(join(directory, "WebView2Loader.dll"), "DLL fixture");
    writeFileSync(join(directory, "openidea.pdb"), "not a runtime dependency");
    const result = spawnSync(
      "pwsh",
      [
        "-NoProfile",
        "-File",
        join(root, "scripts", "package-windows-portable.ps1"),
        "-BinaryPath",
        binary,
        "-OutputDirectory",
        output,
      ],
      { cwd: root, encoding: "utf8" },
    );
    expect(result.status, result.stderr).toBe(0);
    const archive = join(output, "OpenIDEA-windows-x64-portable.zip");
    const extracted = join(directory, "extracted");
    execFileSync(
      "pwsh",
      [
        "-NoProfile",
        "-Command",
        "Expand-Archive -LiteralPath $env:PORTABLE_ARCHIVE -DestinationPath $env:PORTABLE_EXTRACTED",
      ],
      { env: { ...process.env, PORTABLE_ARCHIVE: archive, PORTABLE_EXTRACTED: extracted } },
    );
    const packaged = join(extracted, "OpenIDEA-windows-x64-portable");
    expect(readdirSync(packaged).sort()).toEqual(
      ["openidea.exe", "WebView2Loader.dll", "LICENSE", "NOTICE", "THIRD_PARTY_LICENSES.md", "README.txt"].sort(),
    );
    expect(readFileSync(join(packaged, "openidea.exe"), "utf8")).toBe("executable fixture");
    expect(readFileSync(join(packaged, "WebView2Loader.dll"), "utf8")).toBe("DLL fixture");
    const checksum = createHash("sha256").update(readFileSync(archive)).digest("hex");
    expect(readFileSync(`${archive}.sha256`, "utf8").trim()).toBe(`${checksum}  ${basename(archive)}`);
  });

  it("fails without creating an archive when the executable is missing", () => {
    const directory = fixtureDirectory();
    const output = join(directory, "package");
    const result = spawnSync(
      "pwsh",
      [
        "-NoProfile",
        "-File",
        join(root, "scripts", "package-windows-portable.ps1"),
        "-BinaryPath",
        join(directory, "missing.exe"),
        "-OutputDirectory",
        output,
      ],
      { cwd: root, encoding: "utf8" },
    );
    expect(result.status).toBe(1);
    expect(existsSync(join(output, "OpenIDEA-windows-x64-portable.zip"))).toBe(false);
  });
});
