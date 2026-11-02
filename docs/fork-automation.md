# Fork Automation

This fork adds Windows x64 portable builds without changing upstream release
packaging.

## Download

- [Portable ZIP](https://github.com/caojcm/openidea/releases/download/windows-portable/OpenIDEA-windows-x64-portable.zip)
- [SHA-256 checksum](https://github.com/caojcm/openidea/releases/download/windows-portable/OpenIDEA-windows-x64-portable.zip.sha256)
- [Build details and source commit](https://github.com/caojcm/openidea/releases/tag/windows-portable)

These links become available after the first successful build. The
`windows-portable` tag and prerelease are updated with each successful build;
they are not immutable versioned releases.

Extract the entire ZIP and run `openidea.exe`. Windows 10/11 x64 and the system
Microsoft Edge WebView2 Runtime are required. The package is unsigned, so
Windows SmartScreen may warn about it. Settings and caches use the original
per-user AppData locations, not the extracted directory.

The portable build disables the upstream's installer-based updater. Close the
application and extract a new ZIP to update. It does not bundle SDKs, language
servers, Git or other external development tools.

## Automatic Upstream Sync

`Sync Upstream` merges `l0ng-ai/openidea/main` into this fork's `main` every six
hours. The scheduled times are 00:17, 06:17, 12:17 and 18:17 UTC, or **02:17,
08:17, 14:17 and 20:17 Asia/Shanghai**. GitHub may delay scheduled runs.

Fork-only commits are preserved. If upstream is already included, no commit
or build is created. A conflicting merge fails and leaves remote `main`
untouched; resolve the conflict manually and rerun the workflow.

After an upstream update is pushed, the sync workflow explicitly calls the
portable build with that exact commit. This is necessary because a push made
with `GITHUB_TOKEN` does not trigger other push workflows. No personal access
token or extra secret is required.

## Manual Runs

In the repository's **Actions** tab:

1. Select **Sync Upstream**, then **Run workflow** on `main` to check upstream
   immediately.
2. Select **Windows Portable**, then **Run workflow** on `main` to rebuild and
   publish without waiting for an upstream update.

Direct pushes to `main` also trigger portable builds. The Windows workflow
builds with the upstream's toolchain, packages the executable and runtime DLLs,
extracts the ZIP and checks that the application stays running for ten seconds.
Only then does it publish the prerelease. ZIP and checksum artifacts are kept
for 30 days.

GitHub Actions must remain enabled. Both added workflows explicitly request
`contents: write` to push merges and publish assets. Branch protection requiring
pull requests can prevent automatic sync pushes. GitHub may disable scheduled
workflows in public repositories after 60 days without repository activity;
reenable `Sync Upstream` from Actions if that happens.

## Local Checks

```sh
pnpm install --frozen-lockfile
pnpm test scripts/fork-automation.test.ts
```

The tests run the real sync script against temporary local repositories.
Windows also runs the real packaging script and verifies extracted contents
and SHA-256. Git Bash and PowerShell 7 are used on Windows.
