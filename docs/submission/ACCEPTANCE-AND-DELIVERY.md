# Acceptance and delivery assessment — October 24, 2026

**Decision: local review candidate; NOT accepted for final competition submission.** Scope is frozen. No feature expansion, public deployment or automated payment has been added.

## Numeric-source follow-up — October 24, 2026

Three reproduced parser defects have been fixed without adding product features:

- `100USD` and `USD100` are recognized as USD while alphabetic extensions such as USDT/USDA are not treated as USD.
- For `50 characters cost USD 100`, the value 50 can no longer establish the unit price. Explicit currency-tagged amounts take precedence over counts elsewhere in that same source. Bare follow-up prices retain complete numeric-token validation.
- Accepted total parsing consumes complete monetary tokens. Exponents, negative values, malformed grouping and excess precision cannot become a truncated positive total. An explicitly stated but unsupported/ambiguous USD total is blocked as an open issue; it is not silently treated as an absent total. No balancing fee or guessed amount is inserted.

The 71 local tests pass. Isolated-provider full-flow, English default, session/language recovery and expiry/uncertainty browser checks pass. The source scan covers 31 JavaScript/module files, 5 JSON fixtures and 2 page-binding checks. No live model or PayPal calls were made during this follow-up, so the historical live model result below is not a new validation of the changed source. Formal freeze and final submission remain blocked.

## Repairs in this candidate

1. Open issues now independently block invoicing even if the model omits a PENDING billing row. An observed unanswered-poster response previously had a payable USD 100 total despite explicitly saying the poster was unresolved. The accepted subtotal may remain visible, but the final amount is null and both browser and server block financial creation. A resolved checkbox cannot bypass this boundary.
2. USD output requires an exact original currency citation explicitly containing USD or 美元. Existing unsupported citations fail. Missing coverage alone may use the existing constrained citation selector; that selector cannot rewrite prices or other facts.
3. The model prompt restates the incomplete-agreement/null-total invariant, explicit currency evidence and cancellation rules. Temperature is set to zero, which is not a guarantee of deterministic or correct responses.
4. Generated statements recover in the same tab after reload or language switching only after a server status query. Offline status, stale versions and customer corrections remain blocked. Recovery never repeats confirmations or financial writes.
5. Browser regression fixtures no longer depend on private historical work files. An authored synthetic E13 fixture is distributed with the source. Optional checks can use a normal local Playwright installation.

## Verification performed

| Check | Result | What it proves and excludes |
|---|---|---|
| Node local suite | 71/71 pass | Covered validation, arithmetic, evidence, locks and recovery invariants; zero real provider calls |
| Source scan | 31 JS/module files, 5 JSON fixtures, 2 page binding scans; no findings | Syntax/JSON/static DOM bindings only; not a security audit |
| Full-flow browser test | Pass | Isolated HTTP and temporary stores, separate browser contexts, restart before creation, draft/reload, separate send consent, simulated PAID query/reload, mobile width; one simulated create and one simulated send |
| Separate-party browser test | Pass | Same USD 310 statement, seller alone blocked, both acknowledgements required, customer correction, invalid old tokens and edit invalidation |
| Stability, expiry and session recovery | Pass | Consent revocation, failed regeneration, stale state, withdrawal recovery, uncertain sends, exact expiry, offline restore and language switching |
| Historical live PayPal read | PAID, USD 100; checked 2026-10-24T01:47:39.279Z | Existing older transaction only; no new create/send/payment |

The full-flow test uses a saved synthetic model response and simulated payment provider. Its PAID state is not a PayPal receipt. A new latest-build live Sandbox round trip is still outstanding.

## Latest candidate result

Most recent live run of the previous candidate: `evaluation-2026-10-24T02-46-55-144Z`, 18 synthetic cases. **15 automated passes requiring manual review; 3 request/validation failures; release gate remains BLOCKED_OR_INCOMPLETE.** E10 and E11 hit HTTP 429 limits despite the existing bounded transport retry. E12 returned invalid/missing itemized structure after its bounded correction. No further bulk retries were initiated after this run.

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


### October 25 chronology validation follow-up

Accepted quantities now require buyer acceptance at or after all cited quantity sources. Repeated matching price citations also require acceptance after all matching sources; an older matching quote cannot mask a later quotation. Regression coverage includes stale acceptance, later acceptance, same-message quantity acceptance, and non-billable pending rows. All 72 local tests pass. Source scan and isolated browser release flow pass (zero live model or PayPal calls). This does not establish semantic accuracy or complete live release acceptance.


### October 25 full acceptance attempt

All 75 local tests pass. Five isolated browser suites pass; release-flow and stability suites were repeated after the fixes. A complete 18-case live run at 2026-10-25T02:45:32Z produced 7 automated passes, 9 HTTP 429 failures (E09–E17), one source chronology rejection (E05), and one incorrect invoiceable interpretation (E18). This is a failed release gate, not an accuracy estimate.

E18 generic acknowledgement after multiple differently priced alternatives now fails closed. Replay of the saved incorrect output is blocked even after one simulated correction attempt. A single existing bounded source review now handles invalid chronological citations, without removing the final validation. These post-run fixes pass local regressions but have not completed another live suite. No new PayPal invoice, send, or payment was requested. Formal freeze remains blocked.


### Buyer link navigation regression

Browser simulation reproduced a stale statement when only the confirmation URL fragment changed. The confirmation page now clears actionable state and reloads on fragment navigation. The new check-buyer-link-navigation.cjs verifies switching links, browser back, fresh review consent, invalid-link blocking, and text-only rendering of HTML-like descriptions. It failed before the fix and passes after it. Invoice navigation, lost acknowledgements, invoice uncertainty recovery, expiry checks and isolated release flow also pass. All 75 unit tests pass. No real model or PayPal calls were made during this follow-up; the live release gate remains incomplete.


Targeted live follow-up (2026-10-25T02:52:32Z): E05 passes all automated checks after the source-review fix; E18 returns HTTP 429. This two-case probe is incomplete and does not replace the full release gate. No PayPal calls.


### Paced complete live run, October 25

Run 2026-10-25T02:54:24Z evaluated all 18 cases against the current source with a 3000 ms inter-case pause: 15 automated passes requiring review, and HTTP 429 failures for E03, E11 and E13. No returned result failed the scenario checks in this run. E05 and E18 both passed within this same complete run. This remains a blocked release gate because three cases did not complete; do not merge successes from other runs or infer a statistical accuracy rate. No new PayPal invoice, send or payment was requested. Local tests remain 75/75 passing.


### Itemized statement and chat handoff

Preview, shared statement and customer view now show work descriptions (including agreed revision scope), quantity, unit price and integer-cent line subtotals, followed by the existing total. Separately priced additions and paid revisions must remain separate sourced billing rows; included revision rounds stay in the package description, never receive invented prices. The model prompt now explicitly retains revision content and counts.

The Finish chat and share fee statement action generates a fixed version and posts a customer confirmation link in the local demo chat after item/recipient review. It does not send email or external messages, create a PayPal invoice, or authorize payment. Open issues block sharing. Editing the chat withdraws the prior statement and removes its card. The new isolated itemized-statement browser test verifies three rows, poster subtotal USD 150, total USD 310, customer handoff and recovery. Prompt changes invalidate the previous live-model release gate; fresh full live verification is pending.


### PayPal line-item mapping

New invoices use invoiceFormatVersion 2 and map each accepted statement row to its own PayPal item, preserving the description (including revisions), quantity and unit price. Existing historical single-line invoices keep their original reconciliation format. Before sending, the remote line count, ordered names/descriptions, quantities, unit prices, currency and aggregate total must match the saved snapshot. Equal-total price redistribution, missing/duplicate lines and changed scope are rejected. Numeric normalization accepts ordinary decimal unit prices and integer quantities with trailing decimal zeros, never exponents.

77 local tests pass. The isolated USD 310 browser acceptance checks the outgoing three-line PayPal request, separate customer confirmation, restart/recovery and simulated payment status. Zero real model or PayPal calls during this follow-up. Real PayPal itemization and a new payment are not yet verified.

API reference: https://developer.paypal.com/invoicing/object/ (items name, description, quantity and unit_amount).


### Invoice boundary follow-up

79 local tests pass. Remote invoice verification now rejects nonzero tax/discount/shipping/other breakdown adjustments even when they offset and preserve the total. Ordinary zero-valued provider adjustment fields remain accepted. Unit prices above the PayPal USD 1,000,000 item limit are rejected before persisting a creation attempt or issuing any PayPal request. Added regressions prove zero requests and safe correction after this validation error. Isolated itemized release flow and uncertain-send/expiry browser tests pass. No live model or PayPal calls during this follow-up.


### Selected inscription fee omission (user-observed cup scenario)

Model unchanged. Prompt now separates alternative product prices from additive fees, retains independently priced inscription, and copies all selected components when an identical configured item is ordered. A narrow deterministic coverage guard detects an explicitly selected short-text tier whose separately quoted price is absent from accepted text rows. This guard triggers at most the existing single source re-extraction; repeating the omission fails closed. It never invents fees, changes acceptance or sets a guessed total. It may conservatively block ambiguous packages and is not a general completeness proof.

81 local tests pass, including replay of the observed USD 10 omission, recovery to three separately sourced rows totaling USD 12, persistent-omission rejection and a changed tier price. The 19th evaluation case preserves the original user-operated Chinese cup conversation. Real-model E19 probe at 2026-10-25T03:25:06Z still omitted components; the updated guard rejected it. Correct live extraction to USD 12 has NOT been demonstrated. Existing isolated itemized browser flow passes. Hard-coded logo labels were replaced with neutral custom-order labels. No PayPal calls.


### Bulk-cup arithmetic repair and live rerun

Internal arithmetic mismatch and missing buyer evidence now enter the existing single bounded source review. A persistent disagreement still blocks invoicing. The client exposes model total versus independent subtotal and replaces the misleading no-issues text with the discrepancy. 83 local tests pass; isolated itemized and withdrawal flows pass. Two real browser reruns of the unmodified user scenario failed: missing buyer evidence first, then persistent model-total mismatch with correct USD 3900 component subtotal (43.8 seconds). This remains unresolved live acceptance; no payment requested. See MANUAL-DEMO-RECORD.md.


### Root cause established and arithmetic authority corrected

Captured raw response in diagnostic run 2026-10-25T11:24:13Z: valid lines USD 2500, 800, 600 but model amount string "4400.00". The old source-retry path timed out after 90 seconds. This was model arithmetic, not formatting. The prompt now requires amount=null and the program alone computes payment totals from validated line inputs. Legacy model-only total discrepancies are recalculated only if MODEL_TOTAL_MISMATCH is the sole blocker; original model amount remains in modelReportedAmount and an INTEGER_CENTS arithmeticCorrection audit is recorded. Any pending issue, unresolved item, missing acceptance, or explicitly accepted customer-total conflict still blocks. Financial draft validation independently recalculates and verifies the correction audit; no client override is accepted.

This supersedes the earlier policy of blocking an otherwise valid ledger solely because the model added it incorrectly. It does not relax semantic coverage or customer-total checks. 84 local tests pass, including captured 4400 versus 3900, audit validation, open-issue and explicit-customer-total blocking. Real E20 run 2026-10-25T11:26:38Z passes all scenario checks at USD 3900 in 29.875 seconds with model amount=null. This is a single-case pass, not a complete 20-case release gate. No PayPal calls.


### Acceptance-reference extraction repair

Missing buyer references now use a separate constrained ID-only selection step after validating every other row field. The only accepted response shape is acceptanceEvidence keyed by exactly the affected item IDs; values must be original buyer IDs drawn from chronology-qualified candidate messages. Candidates are not presumed accepted: the model must verify the full source context, and the original final validator still rejects ambiguous alternatives, wrong roles, unknown IDs and acceptance before price/quantity. Conditional and cancelled replies are excluded from candidates. No description, quantity, price or status can be returned or changed by this repair. Pending items are never promoted.

86 local tests pass, covering successful reference-only repair and adversarial or unsupported responses. Real E20 run 2026-10-25T11:32:37Z passes at USD 3900 in 10.143 seconds: base variants cite buyer M6; logo cites buyer M10. The live initial response was already correct and did not exercise the repair branch; that branch is verified locally, not claimed as a live-provider success. Isolated itemized browser flow passes. No PayPal requests.


### Confirmation persistence acceptance

87 local tests pass. A persisted two-party statement retains both the original model arithmetic value, its program correction audit and item-level buyer references across store restart. The restored statement authorizes only its exact confirmed amount, and a subsequent buyer correction still blocks it. Isolated itemized browser acceptance and session/network-recovery checks pass. No real model or PayPal calls during this follow-up. The English user-operated demonstration record is now included in the source package; full 20-case live gate and latest-format Sandbox acceptance remain pending.


### Complete 20-case live suite and follow-up

Run 2026-10-25T12:04:28Z evaluated all 20 scenarios against the source published at e6da3ff8e7cad83dd5db48a3e90d67bfe13730c0: 16 automated passes requiring review. E05 and E07 timed out at 90 seconds; E10 was rejected for missing later financial-message coverage; E11 was rejected for missing contextual acceptance evidence. The median duration was 30.8 seconds and the nearest-rank 95th percentile was 90.0 seconds. E19 and E20 both passed with exact component amounts (USD 12 and USD 3900). This is not an accuracy estimate, a statistical reliability claim or a passing release gate.

Follow-up: a whole-ledger correction with zero source evidence now fails explicitly rather than starting another citation repair. The prompt now requires the latest financial message to be cited, distinguishing a seller scope recap from buyer approval. 88 local tests pass, including proof that an empty correction stops after two requests. These subsequent source changes require fresh full verification; targeted reruns do not replace it. No PayPal calls.

Targeted follow-up 2026-10-25T12:18:02Z: E05 still timed out (90.005 seconds), E10 passed all checks (24.956 seconds). Do not merge this partial run into the completed 16/20 result or claim a complete pass.


### Historical acceptance reference preservation

Added a constrained historical-reference selection path for uniquely matched PENDING rows when a later buyer message changes the request. It verifies existing row and aggregate formats first, permits only original candidate buyer IDs, merges references without losing prior ones, and retains the current status, quantity, price and description. A historical acknowledgement cannot approve the later changed quantity. No repair is attempted for ambiguous shared price sources or a reply without a later change. Current pending rows display these as historical replies, not approval of the new request.

91 local tests pass, including replay of the previous E11 missing-history response, unchanged pending state and payable blocking, strict response schema, unsupported sources and preservation of existing references. Isolated itemized and stability browser checks pass.

Targeted real E11 run 2026-10-25T12:26:51Z was initially REVIEW_REQUIRED only because component_text was false. Inspection showed a valid row named 50字符文本 priced at USD 60, plus buyer M5 history and a still-pending poster change. The evaluator did not recognize 文本/字符, so its synonym pattern was corrected. The original API result remains untouched; work/evaluation-component-review-20261025.json records the separate offline correction with no further API calls. This was an evaluator false negative, not a missing fee. The model initial response already had history, so the newly added repair branch is proven locally, not claimed as a live-model branch execution. The complete 20-case gate remains blocked. No PayPal calls.
