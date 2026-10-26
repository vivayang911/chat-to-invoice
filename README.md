# Chat to Invoice

Turn a negotiated conversation into an itemized fee statement and a PayPal Sandbox collection request. Local Node.js prototype; synthetic examples; English submission interface by default; optional Chinese trial mode.

**Candidate status (October 26, 2026):** Explicit Groq application integration passed a complete final-code 20-case live regression. All 100 local tests pass. A new USD 1.00 current-build Sandbox invoice is SENT, awaiting buyer payment and API PAID verification. Formal freeze, final video and competition submission remain incomplete. See RELEASE-STATUS.json and the dated integration report.

## Scope

One problem: keep negotiated charges reviewable before invoicing. The configured provider (Agnes `agnes-3.0-flash` or Groq `qwen/qwen3.8-27b`) extracts charges and original-message references. The program calculates prices × quantities in integer cents. Pending financial items, open issues, missing currency and conflicts with an explicitly accepted customer total block invoicing. The program is responsible for arithmetic; model-only addition errors are retained in an audit when corrected. A checkbox cannot override an unresolved issue: clarify the conversation and analyze again.

Seller and customer acknowledge the same fixed statement on separate pages. Editing or requesting changes withdraws that version. The server checks both acknowledgements before creating a PayPal draft and again before sending. Buyer payment occurs on PayPal; only a PayPal status query establishes PAID. The AI has no payment tools.

Supported scope: USD, one merchant, generated sandbox personal recipients, one final invoice total built from itemized charges. Chat is a simulation, not an Amazon or other messaging integration. Confirmation links are bearer access links, not identity verification or legal signatures. The server and customer links work on the same computer only.

## Requirements and setup

- Node.js 22 or later (development validation: Node.js 24).
- Your own Agnes API key with access to `agnes-3.0-flash`, or a Groq key for the explicit Groq startup below.
- Your own PayPal Sandbox REST application, business merchant and separate personal buyer.
- Network access to both providers. No third-party runtime packages are needed.

For a **new installation only**, create local configuration files. Do not overwrite existing credentials.

PowerShell:

```powershell
New-Item -ItemType Directory -Path work -Force | Out-Null
Copy-Item agnes-model.env.example work/agnes-model.env
Copy-Item paypal-sandbox.env.example work/paypal-sandbox.env
```

macOS/Linux:

```sh
mkdir -p work
cp agnes-model.env.example work/agnes-model.env
cp paypal-sandbox.env.example work/paypal-sandbox.env
```

Edit the private copies to set `AGNES_API_KEY`, `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET`. Use sandbox credentials. Do not publish `work/`, paste keys into chat, or record credentials in videos.

```sh
npm test
npm start
```

The first visit defaults to English. Open [English](http://127.0.0.1:4187/?lang=en) or [Chinese](http://127.0.0.1:4187/?lang=zh). Use `127.0.0.1`, not `localhost`, because the server enforces the exact loopback origin. The fixed provider endpoint is PayPal Sandbox; there is no live-payment switch.

## Workflow

1. Select a synthetic example or add Seller / Customer messages. Check consent for external AI processing. Avoid sensitive data; provider retention has not been independently verified.
2. Analyze the agreement. The whole model workflow has a 90-second budget, including at most one complete source re-extraction for a structural/contextual defect, any constrained citation coverage selection and one shared transient-network retry. Invalid output is rejected.
3. Review prices, quantities, pricing basis, acceptance sources and included revisions. The service and total summaries are read-only. Correct the chat and analyze again if anything is wrong or unresolved.
4. Enter your generated sandbox personal buyer address, such as `sb-youraccount@personal.example.com`, acknowledge the review and save the fixed statement.
5. Confirm as seller. Open the customer confirmation link in a separate browser/context on the same computer. The customer reviews and confirms that version. Query both-party status from the seller page.
6. Create the PayPal sandbox draft. Creating does not send it. Review the saved snapshot and separately confirm sending.
7. Open the PayPal sandbox buyer page, sign in as the personal buyer (not merchant), and approve payment. Query actual PayPal status afterward. A return link does not establish payment.

## Recovery and data handling

Generated statements are temporarily stored in the same tab's `sessionStorage`, including the conversation, analysis and private statement links. Refresh or language switching restores the statement only after querying its server status. Unverified/offline state cannot create an invoice. Closing the tab may lose the session. Ungenerated chat edits are not autosaved.

The browser stores the latest invoice operation ID in local storage. The server persists confirmation and invoice records under ignored `work/` directories. It does not save web-submitted chat text or log its content. Synthetic evaluation scripts intentionally save authored inputs and responses for diagnosis.

Saved invoice recovery is read-only. Uncertain creation or sending never triggers a blind repeat. Query status and reconcile the invoice number in the sandbox merchant dashboard; do not delete operation records to force a retry. A completed invoice must not be repaid. The app supports one current saved operation per browser profile, not a multi-account dashboard.

The model normally selects source IDs; the server copies original messages instead of asking the model to rewrite long quotations. If it supplies a quotation, a fabricated quotation is still rejected. A missing USD label is never promoted to USD; unsupported invented USD is downgraded to unknown and blocks invoicing. Lossless decimal string padding changes formatting only, while numeric values, negative prices, excessive precision and unsupported prices remain rejected. A confirmed ledger cannot silently omit later financial messages. When the latest buyer explicitly accepts a total, the program compares it with the item sum; a mismatch blocks invoicing rather than inventing an adjustment. These checks also run at the invoice boundary. Numeric-source follow-up: adjacent labels such as 100USD are recognized without confusing USDT/USDA with USD. If a quote explicitly marks monetary amounts, a character count elsewhere in that message cannot prove a different price. Unsupported or conflicting explicitly accepted totals are blocked, rather than parsed as truncated numbers or treated as absent totals. Source checks establish quotation presence and specified structural invariants. They do not prove that AI understood the scope, contextual acceptance or every later change. Both-party review remains necessary.

## Verification

`npm test` runs 71 local tests without provider calls. Optional browser regression requires a developer-only installation:

```sh
npm install --no-save --package-lock=false playwright
npx playwright install chromium
node scripts/check-release-flow.cjs
node scripts/check-statement-session.cjs
node scripts/check-separate-confirmation.cjs
node scripts/check-stability-ui.cjs
node scripts/check-expiry-uncertainty.cjs
```

These checks start isolated servers and use synthetic model data and simulated payment providers. A simulated PAID state is not a PayPal receipt. The full-flow check covers separate browser contexts, restart, statement recovery, draft creation/reload, separate send consent, status recovery and mobile overflow. Playwright is not required to run the app or `npm test`.

Live synthetic model regression (may consume your provider quota):

```sh
node --env-file=work/agnes-model.env scripts/evaluate-app-model.mjs
```

The evaluator waits 3 seconds between cases by default. Set `MODEL_EVAL_PAUSE_MS` to an integer from 0 to 30000 to adjust pacing; this does not bypass provider quotas. A selected-case run remains an incomplete release gate even if every selected case passes.

Optional selected IDs follow the command, for example `E02 E11 E12`. Results are saved in `work/evaluation-*`. The evaluator now includes 20 cases: the original 14 plus conditional acceptance, a one-off character package, an explicitly accepted quantity reduction and an ambiguous reply to alternative offers, plus a user-observed identical-cup configuration with separately priced inscription and logo, plus bulk cup variants with a per-cup logo on all units. The evaluator never imports PayPal or initiates invoices/payments. Automated passes are not statistical accuracy estimates or proof of semantic correctness. Read [the dated acceptance and delivery report](docs/submission/ACCEPTANCE-AND-DELIVERY.md) for current failures and release status.

A historical USD 100 application invoice was paid in Sandbox and queried again on October 24, 2026. It predates the latest separate-acknowledgement workflow and is not a fresh payment test of this build.

## Delivery

See [quick start](docs/submission/QUICKSTART.md), [project description](docs/submission/PROJECT.md) and [English recording script](docs/submission/DEMO-SCRIPT.md). The archive excludes credentials, private transaction state and rehearsal videos. Its manifest records file hashes; packaging runs tests and startup checks after clean extraction.

The public source repository is https://github.com/vivayang911/chat-to-invoice . Publication of source is not a completed competition submission. Final YouTube video, latest-build live payment verification and judging-access arrangements must be verified before submission. No real-user trial or measured time savings are claimed. Keep the scope frozen; fix identified defects rather than adding payment products or automatic decisions.

Arithmetic authority: the model extracts source-linked rows and should return `amount: null`. The program computes line amounts and totals using integer cents. A legacy model-only sum error is recorded and recalculated only when no other blocker exists. Explicit customer-total conflicts, missing approval, pending components and unresolved scope continue to block. See the dated acceptance report for the captured USD 4400 versus USD 3900 regression.

Optional isolated free-model comparison: `node scripts/compare-free-models.mjs` reads the existing private Agnes, Zhipu and Groq keys, calls only their fixed endpoints with synthetic cases, and does not change application routing. It stops a provider after a rate-limit error. See [the comparison report](docs/submission/FREE-MODEL-COMPARISON.md). Both evaluator entry points use the same scenario checks.

For an isolated Groq comparison on Windows, run `powershell -File scripts/run-groq-comparison.ps1` (Node 24.15.0 verified). This reuses an existing system proxy for the child process without changing system settings. It does not switch the application model. Use `-ProbeOnly` for connectivity only.


## Explicit Groq application startup

The existing `npm start` selects the Agnes baseline unless MODEL_PROVIDER is explicitly set. To run the application with Groq on Windows (Node 24.15.0 verified), create work/groq-model.env from groq-model.env.example only if that private file does not already exist, enter your key locally, then run:

```powershell
npm run start:groq
```

This launcher selects only Groq/qwen3.8-27b, uses the existing Windows system proxy in its process when configured, and restores its environment on exit. It does not change system settings. The page displays the configured provider before enabling processing consent, and analysis responses identify that fixed model. A missing key or unexpected returned model stops analysis; there is no automatic fallback.

On other platforms, set MODEL_PROVIDER=groq and run `node --env-file=work/groq-model.env --env-file=work/paypal-sandbox.env src/server.mjs`; configure network access for your own environment. Proxy support via NODE_USE_ENV_PROXY requires a compatible Node runtime.

Groq's token-reset pacing is shared across analyses in one server process. Quota waits use the existing request abort signal; Retry-After can use at most one shared retry and up to 60 seconds, only if the original 90-second analysis deadline permits it. Other provider retry behavior is unchanged. Multi-process or external account usage can still exhaust quota; no availability guarantee is implied. Creating or sending invoices remains a separate confirmed action.

Detailed application integration evidence: [Groq application acceptance](docs/submission/GROQ-APPLICATION-ACCEPTANCE.md).
