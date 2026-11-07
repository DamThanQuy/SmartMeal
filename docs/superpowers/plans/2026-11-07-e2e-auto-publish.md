# One-command E2E report publication

**Goal:** `npm run test:e2e` runs the existing suites and updates the existing public Playwright URL without a chat session or a Sites deployment credential.

**Architecture:** Deploy a small Worker once to the existing Site, backed by its R2 binding. The runner uploads content-addressed report files using a locally stored publishing key, verifies every upload, then atomically switches the latest-report pointer. Public readers use immutable run URLs so an update cannot mix assets from different runs.

**Scope:** Keep the current Playwright UI, QA isolation, test outcomes and public Site identity. No new account, frontend redesign or dependency is needed. Publishing is required by default; `--no-publish` explicitly opts out. A failing test run still publishes its report, while publication failures keep the command failing.

**Files:** `tests/system/publish.mjs` owns configuration/upload/readback; `tests/system/report-site/worker.mjs` owns authenticated writes and public reads; `tests/system/publish.test.mjs` tests the HTTP contract; `tests/system/run.mjs` records publication as a required stage. Update the root runner-test command and system-test README.

- [x] Write tests for authenticated publication, incomplete uploads, binary assets, immutable runs, missing configuration and network errors; observe failure.
- [x] Implement uploader and Worker; run all runner tests (19 pass, including concurrent conflicting commits).
- [x] Wire publication into the runner, including failed-run reporting and explicit local-only mode.
- [x] Deploy the Worker to the existing public Site and store its publishing key only in ignored local configuration and hosted secret storage.
- [x] Run the complete E2E command and verify the hosted latest run matches the new local run: `20261107075911-20368-d2e0f690`, 1241/1241 tests, Playwright 28/28, publication passed, exit 0.

Review focus: unauthorized callers cannot change reports; missing assets cannot replace a working report; failed tests remain failures; interrupted runs do not publish incomplete evidence; keys never enter reports or tracked source.
