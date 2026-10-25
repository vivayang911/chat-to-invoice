# Manual demonstration record

Date: October 25, 2026 (Asia/Shanghai)
Language of interaction: Simplified Chinese. This report is in English.
Status: DEFECT FOUND — NOT ACCEPTED. The walkthrough has reached analysis only; statement confirmation, invoice creation, sending and payment have not been performed.

## Actual scenario observed

The user chose a custom gift-cup scenario rather than the previously planned logo-design example. Eleven messages were read from the existing browser page without reloading, replacing the conversation, or requesting another model analysis.

1. Seller offered small, medium and large cups at USD 1, 2 and 3 respectively.
2. Seller separately priced a greeting of up to 10 characters at USD 1, and 10–50 characters at USD 3.
3. Buyer selected one medium cup with a five-character greeting.
4. Seller offered an additional printed logo at USD 3; buyer accepted.
5. Buyer requested another cup with the same specifications. Seller restated two identical cups, and buyer replied yes.

## Observed application result

- Medium cup, described as including the five-character greeting: quantity 2, unit price USD 2, subtotal USD 4.
- Added logo: quantity 2, unit price USD 3, subtotal USD 6.
- Displayed total: USD 10.
- No open issues reported; accepted agreement and arithmetic check passed were displayed.
- Base-price source M3 contained both the cup price and the separate inscription charge. Quantity cited M10 and buyer acceptance M11.
- Aggregate amount and scope citations pointed to M11 (the buyer's generic yes).
- Recipient was empty and seller review was unchecked, so sharing and invoice creation were disabled for those input conditions. The extracted billing calculation itself was reported as eligible.

## Findings

**High priority: omitted charge with a seemingly settled result.** The short greeting charge was absorbed into the base-cup description without its separately quoted USD 1 price. Under the interpretation that both identical cups carry the same separately charged options, the expected ledger is medium cups 2 × USD 2 = USD 4, short inscriptions 2 × USD 1 = USD 2, logos 2 × USD 3 = USD 6; total USD 12. The current USD 10 result omits USD 2. This is a semantic extraction/coverage defect, not an arithmetic error. An integer-cent sum cannot detect a fee that is absent from the ledger.

If the per-cup application of the inscription/logo fees is considered ambiguous, the correct outcome is a clarification request and blocked billing, not silently treating the inscription as included. No payment should proceed on the observed result.

**Medium priority: evidence is too coarse to demonstrate coverage.** Citing M3 proves that the message exists, but not that every accepted fee inside that message has been represented. Citing M11 for aggregate scope/amount is also insufficient as a standalone explanation; it needs the linked price and selected-option history.

**Presentation defect: hard-coded logo-design context.** The chat header and invoice preview still display logo-design labels although this conversation is about custom cups. This can confuse the user even when numerical rows are otherwise correct.

## Next verification work

Preserve this conversation as a regression case. Check selected alternatives, separate inscription pricing, and duplication of the full selected configuration. Require a sourced breakdown or an explicit unresolved issue before a fixed statement can be shared. Recheck with an unseen variant before claiming resolution. Replace irrelevant fixed logo labels with neutral service labels.

No new model, PayPal invoice, send or payment request was made during this read-only review. Raw Chinese input and observed rows are retained locally in work/manual-demo-cup-20261025.json. No fix has been claimed by this report.


## Repair follow-up

The same model was retained. A component-preservation prompt and narrow selected-short-text-fee coverage guard were added. Local mocked regressions demonstrate recovery to USD 12 and rejection when the original omission is repeated. A real E19 probe still produced incomplete components and was blocked; therefore the case is safe-blocked, not successfully extracted or accepted. Do not treat the hypothetical corrected local response as an observed live-model success.


## Second user-operated scenario: bulk cups with company logos

Observed 11 Chinese messages. Buyer selected 500 stainless-steel 100ML cups at USD 5 each and 100 ceramic 100ML cups at USD 8 each, then accepted a USD 1 per-cup logo on every cup.

Observed extracted lines are correct: 500 × 5 = 2500, 100 × 8 = 800, 600 × 1 = 600. Expected and independently calculated subtotal is USD 3900. No inscription fee exists in this scenario and none should be added.

The page reports MODEL_TOTAL_MISMATCH, leaves the final amount blank, and blocks sharing/invoice creation. The actual model-reported amount is not exposed in the observed UI, so this report does not speculate about its value. This is a correctly blocked inconsistent result, not a successful end-to-end acceptance. The page reports 81.5 seconds latency.

Usability findings: the heading says no confirmed billable amount although the accepted item subtotal is known; the issues list says no issues were reported by the model even while an arithmetic blocker exists; the discrepancy explanation does not show the two compared totals. The model/provider latency is too high for a fluid demonstration. No user conversation was modified, no new model call was made, and no invoice or payment was requested during this inspection.


## Automatic bulk-cup rerun after repair

The original eleven browser messages were retained without edits. Added one bounded whole-source review for internal model-total disagreement and missing valid buyer acceptance sources. Conflicting model and program totals remain blocked; no client-side override was added. The new client code displays the compared totals and an explicit discrepancy issue. The already-open tab retains its older loaded script, so its wording does not yet reflect that client update; no reload was forced because unsaved chat would be lost.

Live browser rerun 1 failed with missing buyer-acceptance evidence. After adding that error to the bounded-review trigger, live browser rerun 2 returned the correct three line items (2500, 800, 600) but still had MODEL_TOTAL_MISMATCH. Subtotal USD 3900, final amount blank, sharing and invoice creation blocked, reported latency 43.8 seconds. This is NOT a successful scenario acceptance. The model-reported conflicting value was not exposed by the old client; do not invent it. Screenshot: evidence/bulk-cup-rerun-blocked-20261025.png.

83 local tests pass, including corrected and persistent arithmetic conflicts and missing-buyer-evidence cases. The original scenario is now evaluation case E20, making the suite 20 cases. No full 20-case live gate has passed. No PayPal draft/send/payment was requested.


## Arithmetic root cause and subsequent outcomes

Raw diagnostic response (2026-10-25T11:24:13Z) explicitly returned amount="4400.00" for lines totaling USD 3900, establishing model arithmetic as the root cause. The diagnostic correction request then timed out. The implementation now asks the model to leave amount=null and computes totals solely from validated source-linked rows. A legacy model-only sum error can be recalculated only when no other blocker exists, retaining the original amount and an integer-cent correction audit. Explicit customer-total conflicts and missing buyer evidence still block.

Targeted live E20 run 2026-10-25T11:26:38Z passed: rows 2500/800/600, total 3900, model amount=null, latency 29.875 seconds. The following real browser rerun on the unmodified original chat failed missing buyer evidence. Both results are retained: this is not a stable scenario pass or full release acceptance. Screenshot: evidence/bulk-cup-program-arithmetic-browser-rejected-20261025.png. 84 local tests pass. No invoice, send or payment was requested.


## Buyer-reference repair and verified browser rerun

A strict reference-only repair was added for accepted rows missing valid buyer references. It can return only original buyer message IDs for the exact affected items; every other row field is validated first and remains unchanged. Conditional, too-early, seller, unknown and unsupported references remain rejected. 86 local tests pass. Live targeted E20 at 11:32:37Z passed in 10.143 seconds without needing reference repair. A subsequent user-page rerun also passed, reporting 8.0 seconds. The original eleven messages were unchanged.

The reviewer expanded all three source panels: both cup variants cite seller M5 for price and buyer M6 for quantity/acceptance. The logo cites seller M9 for price, buyer M6/M10 for quantity and buyer M10 for acceptance. Displayed line subtotals are USD 2500, 800 and 600; final amount USD 3900. This verifies the analysis step for this rerun, not customer acknowledgement or payment. Screenshot: evidence/bulk-cup-buyer-evidence-verified-20261025.png. No invoice was created, sent or paid. Earlier failures remain documented; two targeted successes do not establish statistical reliability or a complete 20-case release pass.
