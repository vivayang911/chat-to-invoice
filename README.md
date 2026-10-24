# Chat to Invoice

Turn a negotiated conversation into an itemized fee statement and a PayPal Sandbox collection request. Local Node.js prototype; synthetic examples; English and Chinese interfaces.

**Candidate status (October 24, 2026):** 66 local tests pass; the latest 18-case live model run has 15 automated passes and 3 failures (two rate limits, one invalid response). Formal freeze, latest-build live payment acceptance and final submission remain blocked. See the dated acceptance report.

## Scope

One problem: keep negotiated charges reviewable before invoicing. Agnes `agnes-3.0-flash` extracts charges and original-message references. The program calculates prices × quantities in integer cents. Pending financial items, open issues, missing currency and inconsistent totals block invoicing. A checkbox cannot override an unresolved issue: clarify the conversation and analyze again.

Seller and customer acknowledge the same fixed statement on separate pages. Editing or requesting changes withdraws that version. The server checks both acknowledgements before creating a PayPal draft and again before sending. Buyer payment occurs on PayPal; only a PayPal status query establishes PAID. The AI has no payment tools.

Supported scope: USD, one merchant, generated sandbox personal recipients, one final invoice total built from itemized charges. Chat is a simulation, not an Amazon or other messaging integration. Confirmation links are bearer access links, not identity verification or legal signatures. The server and customer links work on the same computer only.

## Requirements and setup

- Node.js 22 or later (development validation: Node.js 24).
- Your own Agnes API key with access to `agnes-3.0-flash`.
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

Open [English](http://127.0.0.1:4187/?lang=en) or [Chinese](http://127.0.0.1:4187/?lang=zh). Use `127.0.0.1`, not `localhost`, because the server enforces the exact loopback origin. The fixed provider endpoint is PayPal Sandbox; there is no live-payment switch.

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

The model normally selects source IDs; the server copies original messages instead of asking the model to rewrite long quotations. If it supplies a quotation, a fabricated quotation is still rejected. A missing USD label is never promoted to USD; unsupported invented USD is downgraded to unknown and blocks invoicing. Lossless decimal string padding changes formatting only, while numeric values, negative prices, excessive precision and unsupported prices remain rejected. A confirmed ledger cannot silently omit later financial messages. When the latest buyer explicitly accepts a total, the program compares it with the item sum; a mismatch blocks invoicing rather than inventing an adjustment. These checks also run at the invoice boundary. Source checks establish quotation presence and specified structural invariants. They do not prove that AI understood the scope, contextual acceptance or every later change. Both-party review remains necessary.

## Verification

`npm test` runs 66 local tests without provider calls. Optional browser regression requires a developer-only installation:

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

Optional selected IDs follow the command, for example `E02 E11 E12`. Results are saved in `work/evaluation-*`. The evaluator now includes 18 cases: the original 14 plus conditional acceptance, a one-off character package, an explicitly accepted quantity reduction and an ambiguous reply to alternative offers. The evaluator never imports PayPal or initiates invoices/payments. Automated passes are not statistical accuracy estimates or proof of semantic correctness. Read [the dated acceptance and delivery report](docs/提交材料/ACCEPTANCE-AND-DELIVERY.md) for current failures and release status.

A historical USD 100 application invoice was paid in Sandbox and queried again on October 24, 2026. It predates the latest separate-acknowledgement workflow and is not a fresh payment test of this build.

## Delivery

See [quick start](docs/提交材料/QUICKSTART.md), [project description](docs/提交材料/PROJECT.md) and [English recording script](docs/提交材料/DEMO-SCRIPT.md). The archive excludes credentials, private transaction state and rehearsal videos. Its manifest records file hashes; packaging runs tests and startup checks after clean extraction.

The public source repository is https://github.com/vivayang911/chat-to-invoice . Publication of source is not a completed competition submission. Final YouTube video, latest-build live payment verification and judging-access arrangements must be verified before submission. No real-user trial or measured time savings are claimed. Keep the scope frozen; fix identified defects rather than adding payment products or automatic decisions.
