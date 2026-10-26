# Judge setup and verification

This is a working local Node application, not a hosted demo. Use your own provider and PayPal Sandbox credentials. Private operation records are excluded from the repository and archive, so the recorded paid transaction cannot be restored from a clean package. You can reproduce the workflow with your own Sandbox accounts.

## Quick run

1. Use Node.js 24; version 24.15.0 was validated for the Windows Groq launcher. Extract into a new folder and open a terminal there.
2. Run `npm test`. The 100 local tests do not contact a model or PayPal. No runtime dependency installation is needed.
3. Create work/ if absent. Copy groq-model.env.example to work/groq-model.env and paypal-sandbox.env.example to work/paypal-sandbox.env only if those private files do not already exist.
4. Enter your Groq API key and PayPal Sandbox REST client ID/secret into the private files. The fixed Groq model is qwen/qwen3.8-27b. Use a Sandbox business merchant and a distinct generated personal buyer; real email recipients are rejected.
5. On Windows run `npm run start:groq`. Other environments can use the explicit provider startup in README. The launcher uses an existing Windows proxy in its own process and does not change system settings. Follow your organization's approved process for running local scripts.
6. Open http://127.0.0.1:4187/?lang=en . Confirm the provider label is Groq / qwen/qwen3.8-27b. Use 127.0.0.1 rather than localhost. Customer links work on this computer only.

## What to check

- Analyze Extra poster / Not agreed. The accepted logo remains reviewable but the unresolved poster blocks collection.
- Analyze Revised price / Awaiting acceptance. A withdrawn quote must not remain collectible.
- Add agreed extras and review individual quantities, unit prices, subtotals and original-message references. The program calculates totals in integer cents.
- Enter your generated personal Sandbox recipient, review the statement and save it. Seller confirmation alone must not allow a draft.
- Open the separate customer link, review that fixed version and confirm. Query both-party status on the seller page.
- Before creating an invoice, request a customer correction. The old version must be blocked. Resolve the conversation and generate a new statement to continue.

## Reproduce payment with Sandbox funds

Use a new synthetic USD 1.00 agreement, such as a conversation-summary service with one included revision and explicit buyer acceptance. Review the extracted amounts, sources and generated recipient. Both test roles acknowledge the fixed statement. Create a Sandbox draft, review its saved snapshot, then separately confirm sending. Sign into PayPal as the generated personal buyer, not the merchant, and pay on the hosted Sandbox page. Back in the app, query actual PayPal status. Only PAID counts as payment evidence.

These acknowledgements are test role actions, not identity verification or legal signatures. Use synthetic data and Sandbox funds. Retain uncertain-operation records and never repeat a completed payment. Configuration or quota failures stop analysis; there is no automatic model fallback. Quota waits and one shared retry remain bounded by the original analysis deadline.

## Evidence and limits

The current application passed one complete authored 20-case live Groq regression and 100 local tests. A current-build USD1 Sandbox invoice was verified PAID through the PayPal API on October 26, 2026. See GROQ-APPLICATION-ACCEPTANCE.md. Known cases sampled once do not establish general accuracy. No real-user trial or measured time saving is claimed. The prototype is USD-only, one merchant, local-only and a simulated chat, not an Amazon messaging integration.
