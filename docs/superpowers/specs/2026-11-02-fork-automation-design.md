# Fork Sync and Windows Portable Builds

Approved by the repository owner on 2026-11-02.

## Scope

Add independent GitHub Actions to `caojcm/openidea`. Keep the upstream CI,
release workflow, application source, package versions and lockfiles unchanged.

## Upstream Sync

- Check `l0ng-ai/openidea` branch `main` every six hours and on manual dispatch.
- Merge upstream into the fork's `main`; preserve fork-only commits and files.
- Do not force-push or reset `main`. A merge conflict fails without pushing.
- An unchanged upstream produces no commit, push or portable build.
- Pass the exact newly pushed commit to the portable build through a reusable
  workflow. Pushes made with `GITHUB_TOKEN` do not trigger other push workflows.

## Windows Portable

- Build Windows x64 with the upstream's pnpm 11, Node 22 and stable Rust setup.
- Build on `main` pushes, after a successful sync, and on manual dispatch.
- Use a separate Tauri configuration to disable installer bundling and the
  upstream updater only for this build.
- Zip `openidea.exe`, adjacent runtime DLLs, licenses and a short usage guide.
- Use the system WebView2 runtime; do not bundle or install another runtime.
- Leave settings and caches in the existing per-user directories.
- Extract the ZIP and check that the packaged application stays running for
  ten seconds on the Windows runner before publishing.

## Distribution

Upload the ZIP and SHA-256 checksum as workflow artifacts. After a successful
build and smoke check, create or update the fork's `windows-portable`
prerelease, its tag and assets. Use a stable ZIP filename for a fixed download
URL. Release notes identify the application version and source commit.

The unsigned application may trigger Windows SmartScreen. No signing keys,
personal access tokens, installer, ARM64 build or portable-profile mode are
introduced.

## Verification

Use the existing Vitest setup to execute the real sync and packaging scripts.
Verify unchanged upstream, merged upstream with fork-only changes, merge
conflict without a push, ZIP contents and checksum. Validate workflow syntax
and the portable config. Run the first GitHub-hosted build to verify the actual
Windows binary and publication.
