# Fork Automation Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this
> plan inline, task by task. Steps use checkbox syntax for tracking.

**Goal:** Keep the fork updated and publish an automatically built Windows x64
portable ZIP.

**Architecture:** One sync workflow merges upstream without overwriting fork
changes. It explicitly calls a reusable portable workflow with the synced SHA.
The portable workflow also handles direct main pushes and manual builds.

**Tech Stack:** GitHub Actions, Git, Bash, PowerShell, Tauri, pnpm 11, Node 22,
stable Rust, existing Vitest.

**Spec:** `docs/superpowers/specs/2026-11-02-fork-automation-design.md`

## Global Constraints

- Upstream: `l0ng-ai/openidea`, branch `main`; destination: `caojcm/openidea/main`.
- Never force-push or reset `main`.
- Keep upstream application source, CI, release workflow and lockfiles unchanged.
- Windows x64 only; use the system WebView2 and existing per-user data paths.
- Disable upstream updater only in the portable build.
- Fixed prerelease tag: `windows-portable`.
- Tests execute production scripts rather than copying their logic.

## Task 1: Upstream Sync

**Files:** `scripts/sync-upstream.sh`, `scripts/fork-automation.test.ts`,
`.github/workflows/sync-upstream.yml`.

**Interface:** `bash scripts/sync-upstream.sh <upstream-url>` runs in a clean
clone of main, pushes to origin/main and writes `changed` and `sha` to
`GITHUB_OUTPUT`.

- [ ] Create real local Git repositories in Vitest fixtures. Test an unchanged
      upstream, a new upstream commit alongside a fork-only file, and conflicting
      edits. Assert origin/main and output values after executing the script.
- [ ] Run `pnpm test scripts/fork-automation.test.ts` and confirm the missing
      script fails.
- [ ] Implement fetch, ancestor check, ordinary merge, push and outputs. Abort
      conflicting merges and exit nonzero without pushing.
- [ ] Add a six-hour schedule and manual dispatch. Use checkout main with full
      history and `contents: write`. Call the portable workflow only when changed,
      passing the exact SHA.
- [ ] Run the Git integration tests and confirm all three behaviors.

## Task 2: Portable Packaging

**Files:** `scripts/package-windows-portable.ps1`,
`src-tauri/tauri.portable.conf.json`, `docs/windows-portable.txt`,
`scripts/fork-automation.test.ts`.

**Interface:** `pwsh -NoProfile -File scripts/package-windows-portable.ps1
-BinaryPath <exe> -OutputDirectory <dir>` writes
`OpenIDEA-windows-x64-portable.zip` and its `.sha256`.

- [ ] Add a Windows test fixture with an executable and a DLL. Execute the real
      script, extract the ZIP, assert contents and compute the checksum independently.
      Add a missing-executable test that requires nonzero exit and no ZIP.
- [ ] Run the tests and confirm failure because packaging is not implemented.
- [ ] Implement copying executable, DLLs, licenses and usage guide, compression
      and SHA-256 output.
- [ ] Add portable config with `bundle.active: false`,
      `bundle.createUpdaterArtifacts: false`, and `plugins.updater.endpoints: []`.
- [ ] Run packaging tests, script lint and config validation.

## Task 3: Build, Publish and Verify

**Files:** `.github/workflows/windows-portable.yml`, `docs/fork-automation.md`.

- [ ] Add workflow_call with a required source SHA, main push and manual
      triggers, fork-only gating and one portable-build concurrency group.
- [ ] Reuse upstream setup actions, frozen pnpm install and
      `pnpm tauri build --target x86_64-pc-windows-msvc --no-bundle
  --config src-tauri/tauri.portable.conf.json -- --locked`.
- [ ] Package, extract and launch the packaged executable hidden for ten seconds.
      Fail on early exit and stop only that process after the check.
- [ ] Upload ZIP and checksum artifacts. Create or update the prerelease tag and
      assets using the workflow token, marking the release as a prerelease.
- [ ] Document schedule, fixed download URL, manual operations, conflict handling,
      unsigned builds and the system WebView2 requirement.
- [ ] Run targeted tests, formatting, lint, TypeScript checks, frontend build,
      workflow syntax validation and `git diff --check`.
- [ ] Commit only task files and push the completed commits to origin/main.
      Observe the first portable build and a manual sync run with the GitHub API.
- [ ] Export a patch and setup notes to the chat's outputs directory if useful.

## Self-Review

Every approved requirement is assigned to a task. There are no new runtime
dependencies, secret requirements, installer changes or extra architectures.
The tag may move, but main always uses an ordinary merge and ordinary push.
