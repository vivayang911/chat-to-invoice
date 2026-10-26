# Groq application integration — October 26, 2026

## Result and boundary

Groq is explicitly selectable in the actual analysis adapter, using only qwen/qwen3.8-27b at the fixed Groq endpoint. The live local candidate was launched with `npm run start:groq`. The unchanged baseline `npm start` still selects Agnes unless MODEL_PROVIDER is explicitly set. Keys remain server-side; unknown provider configuration, missing keys and mismatched returned models fail closed. No fallback was added. The original extraction prompt, source-reference validation, billing rules and integer-cent calculation are preserved.

The application shows the selected provider before enabling external-processing consent. A failed provider metadata request remains blocked after changing examples. Metadata contains only provider, model and label, not keys or endpoint configuration. Analysis responses report the selected fixed model, whose returned identity is checked.

## Live regression evidence

The first integration run, 2026-10-26T01-38-44-809Z, executed all 20 cases: 17 passed, E10/E13 encountered HTTP 429, and E12 timed out. The E12 elapsed wall-clock record was 4,898,250 ms, an anomalous interval whose cause was not established. It is preserved, not normalized or used as a model response-speed result. This run used the original short transport retry behavior and precedes the final retry/deadline safeguards.

Follow-up changes allow Groq to honor Retry-After for up to 60 seconds only when the original 90-second deadline permits, with one shared retry across the analysis. The quota gate is shared across analyses within a process, and its waits accept the request abort signal. Responses and parsed bodies are rechecked against the wall-clock deadline, and a quota-delayed request rechecks the deadline before sending. Agnes retains its original two-second maximum retry delay. The elapsed-time anomaly is not evidence that a paused computer can enforce a real-time timer while execution is suspended; late responses must still be rejected on resumption.

Targeted final-code run 2026-10-26T03-06-49-142Z passed E10, E12 and E13 in 35.669, 13.934 and 15.433 seconds respectively. E10 recovered from one 429 using the shared retry; E12/E13 required no transport retry. This partial evaluator deliberately exits nonzero because it is not a full release suite. The original failed run remains unchanged. Do not merge 17 initial passes and three targeted passes into a complete clean final-code run.

## Real browser acceptance

A separate headless browser acceptance used the real application adapter and Groq API with the authored Chinese E19 conversation entered message by message from the blank example. Separate seller/customer browser contexts reviewed one immutable statement. PayPal endpoints were replaced with rejecting local stubs, so no payment calls could occur.

- Page displayed Groq / qwen/qwen3.8-27b before consent.
- Live analysis returned 12.00 USD in 2.348 seconds in this one run.
- Two cups retained three components: cups 2 × 2 = 4 USD, five-character text 2 × 1 = 2 USD, logo 2 × 3 = 6 USD.
- Seller confirmation alone did not enable invoicing; both confirmations enabled the next draft step.
- Customer requesting a quantity change blocked the previous confirmed version again.
- No PayPal calls, invoice creation, invoice sending or payment. No browser JavaScript errors.

Local evidence: work/groq-live-ui-20261026.json and evidence/groq-live-seller-confirmed-20261026.png. The temporary confirmation store was removed after the test. The first browser attempt used a synthetic address with extra hyphens, which the existing recipient validator correctly rejected; the test input was corrected to the supported pattern without relaxing validation.

## Local validation and remaining gates

100 local tests passed. Adapter/transport tests cover fixed configuration, no fallback, identity mismatch rejection, quota duration parsing, cross-analysis pacing, abort/deadline handling and bounded longer Retry-After. Isolated browser regressions passed for itemized invoice mapping, session recovery without repeated writes, message withdrawal, provider consent, uncertain operations, expiry and stability. The session test was corrected to distinguish the new read-only metadata GET from a write; its no-write assertions remain in place. Source scan: 41 syntax files, seven fixture JSON files and two DOM binding sets, no findings.

This is an integrated candidate, not a frozen release. A complete final-code 20-case rerun, latest-build Sandbox end-to-end payment acceptance, final English video and competition submission remain outstanding. The historical October 25 comparison's 20/20 result is not substituted for those gates. No general accuracy claim is made.


## Final-code complete rerun and current Sandbox handoff

Final-code run 2026-10-26T03-14-03-914Z completed all 20 cases in one sequential run, with 20 automated passes. This supersedes the outstanding complete-rerun gate above, without changing the earlier failure records. Median latency including waits was 15.056 seconds, nearest-rank p95 41.107 seconds and maximum 49.970 seconds. E01, E05, E07, E14 and E16 each recovered from one HTTP 429 using the existing shared retry (250 ms recorded delay); this was not a rate-limit-free run. E11 used historical-reference repair. The longer Retry-After policy is unit tested, but this successful live run did not exercise a recorded retry delay above two seconds.

After the complete gate passed, the current application prepared a new synthetic-role USD 1.00 Sandbox invoice through live analysis, fixed statement creation, separate seller/buyer role acknowledgements, draft creation and a separately requested send. PayPal returned SENT at 2026-10-26T03:23:16.958Z. The harness records its state before writes and does not retry them or pay. These are synthetic role acknowledgements, not verified customer identity or independent human review. No real money is involved.

Buyer payment on the PayPal Sandbox page and a subsequent API status query confirming PAID are still outstanding. SENT is not PAID. The historical paid invoices are not substituted for this candidate. No formal freeze, video publication or completed competition submission is claimed. Private operation identifiers and the buyer payment URL stay in work/release-sandbox-acceptance.json.
