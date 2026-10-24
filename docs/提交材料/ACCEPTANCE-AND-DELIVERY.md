# Acceptance and delivery assessment — October 24, 2026

**Decision: local review candidate; NOT accepted for final competition submission.** Scope is frozen. No feature expansion, public deployment or automated payment has been added.

## Repairs in this candidate

1. Open issues now independently block invoicing even if the model omits a PENDING billing row. An observed unanswered-poster response previously had a payable USD 100 total despite explicitly saying the poster was unresolved. The accepted subtotal may remain visible, but the final amount is null and both browser and server block financial creation. A resolved checkbox cannot bypass this boundary.
2. USD output requires an exact original currency citation explicitly containing USD or 美元. Existing unsupported citations fail. Missing coverage alone may use the existing constrained citation selector; that selector cannot rewrite prices or other facts.
3. The model prompt restates the incomplete-agreement/null-total invariant, explicit currency evidence and cancellation rules. Temperature is set to zero, which is not a guarantee of deterministic or correct responses.
4. Generated statements recover in the same tab after reload or language switching only after a server status query. Offline status, stale versions and customer corrections remain blocked. Recovery never repeats confirmations or financial writes.
5. Browser regression fixtures no longer depend on private historical work files. An authored synthetic E13 fixture is distributed with the source. Optional checks can use a normal local Playwright installation.

## Verification performed

| Check | Result | What it proves and excludes |
|---|---|---|
| Node local suite | 66/66 pass | Covered validation, arithmetic, evidence, locks and recovery invariants; zero real provider calls |
| Source scan | 31 JS/module files, 5 JSON fixtures, 2 page binding scans; no findings | Syntax/JSON/static DOM bindings only; not a security audit |
| Full-flow browser test | Pass | Isolated HTTP and temporary stores, separate browser contexts, restart before creation, draft/reload, separate send consent, simulated PAID query/reload, mobile width; one simulated create and one simulated send |
| Separate-party browser test | Pass | Same USD 310 statement, seller alone blocked, both acknowledgements required, customer correction, invalid old tokens and edit invalidation |
| Stability, expiry and session recovery | Pass | Consent revocation, failed regeneration, stale state, withdrawal recovery, uncertain sends, exact expiry, offline restore and language switching |
| Historical live PayPal read | PAID, USD 100; checked 2026-10-24T01:47:39.279Z | Existing older transaction only; no new create/send/payment |

The full-flow test uses a saved synthetic model response and simulated payment provider. Its PAID state is not a PayPal receipt. A new latest-build live Sandbox round trip is still outstanding.

## Latest candidate result

Complete current-source run: `evaluation-2026-10-24T02-46-55-144Z`, 18 synthetic cases. **15 automated passes requiring manual review; 3 request/validation failures; release gate remains BLOCKED_OR_INCOMPLETE.** E10 and E11 hit HTTP 429 limits despite the existing bounded transport retry. E12 returned invalid/missing itemized structure after its bounded correction. No further bulk retries were initiated after this run.

E16 now returned the correct two-line USD 86.75 result. E13/E14 returned USD 310/USD 210 with the exact expected components. Passing these cases does not cancel the other failures. This candidate is not formally frozen. No latest-build live Sandbox draft/send/payment was initiated because the complete release gate did not pass. The guarded acceptance harness does not bypass that gate. Final video/YouTube upload and Devpost submission are not complete.

See `RELEASE-STATUS.json` for the concise machine-readable status. The public repository contains a review candidate, not an accepted production or competition release.

## Current candidate changes

The current evaluation suite has 18 cases, retaining E01–E14 and adding E15–E18 (conditional acceptance, a one-off character package, explicit quantity reduction, ambiguous reply after two alternatives). The compact extraction prompt returns message IDs; the server copies original text. At most one full source re-extraction may address a structural or contextual defect, within the same 90-second deadline. Missing citation coverage remains a separate constrained selection; no financial write is retried.

Known unsupported USD is downgraded to unknown, never inferred or promoted. String decimals such as 100 are losslessly padded; numeric/negative/excess-precision prices and unsupported prices are rejected. Seller messages cannot serve as buyer acceptance references. Contextual acknowledgements and later agreed recaps are handled separately; unresolved interpretations are blocked rather than programmatically promoted to ACCEPTED.

A held-out example exposed a serious omitted-component failure: a model subtotal of USD 80 matched its own incomplete ledger while the buyer's final accepted total was USD 86.75. The candidate now checks financial tail coverage and compares the latest explicit buyer total with the independent calculation. Mismatch blocks creation; it never inserts an invented balancing fee. The explicit total is retained in the server-confirmed snapshot and checked again at invoice creation/sending. Local regression covers this defect; it must not be described as successful live extraction merely because it is blocked.

The latest completed intermediate runs were `evaluation-2026-10-24T02-19-04-211Z` (14/18), `02-29-14-802Z` (16/18), `02-33-29-008Z` (14/18) and `02-37-26-900Z` (14/18). Failures include provider timeout, output shape errors, missed components and misinterpreted acceptance. They are retained, not replaced by targeted successes. The latest result is recorded above. The candidate remains BLOCKED_OR_INCOMPLETE and is not formally frozen.

## Previous complete live model regression

Previous baseline full run: `evaluation-2026-10-24T01-47-27-375Z`; 14 synthetic cases; same Agnes model, direct strategy. **9 automated passes requiring manual review, 3 review results, 2 request/validation failures. Release gate: BLOCKED_OR_INCOMPLETE.** These results are not an accuracy estimate. Do not combine targeted successes from other runs into a fictitious complete pass.

| Case | Latest outcome | Remaining defect or limitation |
|---|---|---|
| E06, two offers without acceptance | Review required; invoice blocked | Explicit USD was omitted; no billing rows were retained |
| E07, currency absent | Review required; invoice blocked | Currency correctly null, but model omitted an explanatory open issue; the program still blocks unknown currency |
| E08, instruction injection | Output rejected | Format/source validation failed; this is fail-closed behavior, not successful extraction |
| E11, changed poster quantity | Output rejected | Incomplete JSON; no derived statement or payment action |
| E12, contextual acceptance | Review required; invoice blocked | The poster accepted by contextual “okay” was incorrectly left pending; accepted subtotal was USD 100 rather than USD 150 |

E13 and E14 passed exact settled-component checks: logo 100, posters 3 × 50 or 1 × 50, one-off text fee 60; totals USD 310 and USD 210 respectively. This does not prove arbitrary negotiation understanding.

Earlier complete runs are retained locally: `evaluation-2026-10-24T01-40-58-670Z` (9/14 original checks) and `evaluation-2026-10-24T01-44-18-240Z` (10/14). The intermediate run exposed a validation regression that prematurely rejected missing currency citations before the allowed coverage-selection step; that validator ordering was corrected and tested before the latest full run.

Evaluation changes are explicit: unresolved injection warnings now block invoicing; a fully cancelled job may explain cancellation in issues or leave issues empty, but must have no accepted items, no accepted service and no payable amount. Component-state and exact quantity checks were strengthened for E11–E14. No test criterion was changed to permit billing an unresolved order.

## Reproduce

Run `npm test`. Optional Playwright checks and setup are listed in README.md. `node scripts/check-release-flow.cjs` tests the complete simulated-provider flow without credentials. `node --env-file=work/agnes-model.env scripts/evaluate-app-model.mjs` runs the full live synthetic evaluation and writes diagnostic files under ignored work/. Blocked/incomplete evaluations return a failing process exit code. No PayPal call is made by the evaluator.

## Submission checklist

Official rules rechecked on October 24, 2026: https://paypalaihackathon.devpost.com/rules . The local project combines AI and PayPal Sandbox. Public hosting is optional if complete setup/run access is provided. A public open-source repository and public YouTube demo video under three minutes are required, as are English materials or translations. Submission closes November 12, 2026 at noon PST (November 13 at 04:00 in China).

| Item | State |
|---|---|
| Runnable source, MIT license, English setup, description and demo script | Prepared locally |
| Private credential/state exclusion and clean archive verification | Recorded by the archive's adjacent build report and MANIFEST.json |
| Complete model regression release gate | BLOCKED; failures above remain |
| Latest-build live Sandbox create → send → buyer payment → API PAID | Outstanding; buyer payment requires explicit action on PayPal |
| Public repository URL | https://github.com/vivayang911/chat-to-invoice ; candidate source publication |
| Final functioning-app video and public YouTube URL | Script prepared; final video not recorded or uploaded |
| Judge access, correct submission fields and public URL verification | Outstanding |

The archive is a review deliverable, not evidence of passing all acceptance criteria or completing submission. Original Chinese working notes and private diagnostic responses remain in the development workspace; only current English submission documents are selected for this archive. No real-user trial has been conducted.
