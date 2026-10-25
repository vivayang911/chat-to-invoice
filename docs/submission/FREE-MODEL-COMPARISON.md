# Free API model comparison — October 25, 2026

This is a small pipeline comparison, not a model accuracy benchmark. The application's production model was not changed, and no PayPal calls were made.

## Method

Both configured providers used the same current extraction prompt, authored cases E07/E11/E19/E20, source validation, reference repairs and integer-cent billing. The evaluator and comparison runner share evaluation-checks.mjs. Cases cover missing currency, historical acceptance with a later quantity change, two identically configured cups and bulk cup variants with a per-cup logo. These are existing development regressions, not held-out cases; the cup pattern is discussed in the prompt. Each case was sampled once. Providers ran sequentially, Agnes first, and experienced different service load. Token ceilings and deadlines were shared; provider-specific controls disabled thinking using their respective API fields. Do not infer general model rankings from this run.

## Actual results

| Provider/model | Completed outcome | First-response-only passes | Time |
|---|---|---|---|
| Agnes / agnes-3.0-flash | 4/4 passed automated checks, requiring human review | 1/4 | 36.6–71.3 seconds, median 56.0 seconds |
| BigModel / glm-4.7-flash | E07 incomplete: HTTP 429 during source repair; other three skipped after rate limit | Not established | Failed pipeline ended at 3.6 seconds; not comparable to successful latency |

Agnes E07 took 71.312 seconds and two requests (initial + citation repair). E11 took 68.542 seconds and two requests (initial + historical-reference repair), directly exercising the new historical repair with the live provider. E19 took 36.623 seconds and two requests (initial + citation repair). E20 took 43.437 seconds and one request. Seven total requests.

GLM's initial E07 output claimed USD although the source contained no currency; the existing program downgraded the unsupported currency. The result also lacked service evidence and the subsequent citation repair encountered HTTP 429, including one bounded retry. Three total requests, one completed response. Remaining cases were deliberately skipped, not failed on semantic quality. This is insufficient evidence to rank GLM overall, and the failed 3.6-second duration is not a successful response-speed result.

Raw structured responses and summary remain local under work/model-comparison-2026-10-25T12-37-30-553Z/. No keys are included in this report.

## Official free API conditions checked

- BigModel GLM-4.7-Flash currently lists free input/output. GLM-5.3-Flash is separately priced: a free cache-storage promotion does not make ordinary inference free. https://docs.bigmodel.cn/cn/guide/start/pricing
- Gemini 3.5 Flash-Lite currently lists free-tier text input/output with limited access. Account quotas and supported-region requirements apply. The free pricing row indicates use of content for product improvement, so use synthetic cases for evaluation. https://ai.google.dev/gemini-api/docs/pricing and https://ai.google.dev/gemini-api/docs/available-regions
- Groq's Free Plan lists qwen/qwen3.8-27b with request and token limits; account-specific limits may differ. https://console.groq.com/docs/rate-limits
- Agnes advertises a free API on its official site; the current project's existing configured account was used as baseline. No unlimited or perpetual free-access guarantee was verified. https://agnes-ai.com/

At the first comparison, Gemini and Groq had not been called. The subsequent Groq run is recorded below; Gemini remains untested.

## Decision

Keep Agnes as the current baseline for now; it remains slow and relies on repair. The current GLM quota behavior does not justify switching to it. Add one available Gemini or Groq free-tier account for the same tests before deciding. No production switch, automatic fallback, new paid model or credential purchase was performed. A later decision requires held-out cases and repeat measurements, not only these four regressions. The full release gate remains separate and blocked.


## Groq credential follow-up

The user saved a Groq key locally. The configured value was detected and has the expected Groq prefix; actual authentication could not be validated. From this machine’s Node request route, the authenticated model-list endpoint and a minimal Qwen chat request both returned HTTP 403 with only a generic Forbidden message. Unauthenticated requests to the API root, model list and console root also returned the same 403. This evidence does not establish that the key is invalid, that a specific model is forbidden, or that quality is poor. It suggests a broader access/routing restriction, but the exact cause remains undetermined. No comparison cases were sent to Groq, no production routing was changed, and no PayPal calls occurred. Next diagnostic: the user should test API_OK in the official browser Playground and compare browser access against the Node route. Do not regenerate or disclose the key solely on this evidence.


## Groq follow-up: route resolved and partial comparison

The earlier HTTP 403 was reproduced on Node direct routing, including unauthenticated requests. Windows already had a system proxy; the browser and PowerShell used it while Node did not. Reusing that existing proxy for the child Node process, with NODE_USE_ENV_PROXY=1, resolved access. No Windows proxy setting was changed. A minimal authenticated Qwen request returned HTTP 200, the expected API_OK, and the requested model in 1.101 seconds. This validates connectivity, not extraction accuracy or account billing tier.

The same four-case comparison then ran with qwen/qwen3.8-27b, reasoning disabled and the existing production prompt, source checks, repair paths and integer-cent calculation. Cases were spaced 60 seconds apart. E07 passed all automated checks in 1.838 seconds using two requests (initial plus citation repair); missing currency correctly prevented invoice creation. E11 encountered HTTP 429 after two request attempts and did not complete validation. E19 and E20 were skipped after that rate limit. The runner did not retain a detailed rate-limit body, so the exact exhausted quota is not established. Spacing case starts did not prevent a limit inside the multi-request pipeline.

The E07 Agnes baseline was 71.312 seconds with two requests, but this is one case sampled once at different times, not a reliable speed ratio or general quality ranking. Groq has one completed passing case, one incomplete case and two untested cases in this run. A replacement decision still requires the remaining cases and the full release suite. Production remains Agnes; no fallback or PayPal calls were introduced. Local evidence: work/model-comparison-2026-10-25T13-39-38-772Z/ and work/groq-model-check-result.json.

Reproduce from the project directory with `powershell -File scripts/run-groq-comparison.ps1`; use `-ProbeOnly` for the minimal connectivity check. The wrapper reads the existing system proxy into its process only and restores environment variables afterward. The key stays in ignored work/groq-model.env. This wrapper requires a Node version supporting NODE_USE_ENV_PROXY (the verified runtime was Node 24.15.0).


## Quota diagnosis and paced retry

Run 2026-10-25T13-46-16-655Z retained only allowlisted rate-limit headers and a classified error, not raw provider error text. The service explicitly identified TOKENS_PER_MINUTE; the response advertised an 8,000-token limit. E11 initial output succeeded, but its immediate follow-up exhausted the minute allowance. The comparison runner now waits for the returned token-reset interval before another Groq request, capped at 60 seconds; the unchanged analysis deadline and validation still apply. Latency includes that wait. This pacing is evaluation-only and has not been added to production.

Paced E11 rerun 2026-10-25T13-49-15-501Z passed all automated checks in 20.595 seconds with two successful requests, initial plus historical-reference repair. Pending quantity changes remained pending. This is a targeted retry after a transport fix, not a fresh complete four-case suite. Initial failures remain recorded. The PowerShell wrapper also now uses DefaultWebProxy for compatibility with Windows PowerShell, verified through this live run.


The remaining targeted run 2026-10-25T13-49-43-705Z passed E19 (12.00 USD with exact accepted lines, 2.320 seconds, one request) and E20 (3900.00 USD with exact accepted lines, 3.347 seconds, two attempts). E20's first attempt returned a token-per-minute 429 despite headers showing a restored token balance; the existing bounded transport retry succeeded. Do not describe this as a rate-limit-free run. Across separate runs all four selected regressions have a passing result; they are not a complete clean release suite or a measured accuracy rate. Groq looks promising on latency, but quota handling and repeated held-out evaluation remain necessary before replacement.

Local verification after these tooling changes: 92 tests passed; source scan checked 39 syntax files, seven fixture JSON files and two DOM binding sets with no findings. No production analysis logic or PayPal writes changed.


## Complete Groq regression run

Run 2026-10-25T13-52-59-791Z executed E01–E20 once in one sequential run. All 20 passed the existing automated checks; source validators and integer-cent calculation were unchanged. There were 23 request attempts: 17 cases used one request, E07 used a citation repair, E11 used historical-reference repair, and E05 recovered from one network error. No HTTP 429 occurred in this run. Median case latency was 17.615 seconds, nearest-rank p95 51.792 seconds, maximum 59.927 seconds. Latency includes token-quota waiting. The preceding Agnes full suite passed 16/20 with median 30.8 seconds and p95 90 seconds, but ran at a different time and preceded follow-up source changes; it is contextual history, not a controlled model-only comparison.

| Case | Automated result | Time incl. waits (s) | Requests |
|---|---|---:|---:|
| E01 | Passed; review required | 1.565 | 1 |
| E02 | Passed; review required | 15.831 | 1 |
| E03 | Passed; review required | 15.663 | 1 |
| E04 | Passed; review required | 42.548 | 1 |
| E05 | Passed; review required | 19.137 | 2 |
| E06 | Passed; review required | 16.292 | 1 |
| E07 | Passed; review required | 31.451 | 2 |
| E08 | Passed; review required | 6.924 | 1 |
| E09 | Passed; review required | 13.808 | 1 |
| E10 | Passed; review required | 24.297 | 1 |
| E11 | Passed; review required | 51.792 | 2 |
| E12 | Passed; review required | 8.871 | 1 |
| E13 | Passed; review required | 17.255 | 1 |
| E14 | Passed; review required | 25.826 | 1 |
| E15 | Passed; review required | 40.273 | 1 |
| E16 | Passed; review required | 42.303 | 1 |
| E17 | Passed; review required | 16.840 | 1 |
| E18 | Passed; review required | 59.927 | 1 |
| E19 | Passed; review required | 16.314 | 1 |
| E20 | Passed; review required | 17.975 | 1 |

The structured ledger was also inspected: E13 retained 100 + 3 × 50 + 60 = 310 USD; E14 retained 100 + 50 + 60 = 210 USD; E19 retained two copies of each cup component, 4 + 2 + 6 = 12 USD; E20 retained 500 × 5 + 100 × 8 + 600 × 1 = 3900 USD. Pending additions, unknown currency, entire cancellation, conditional acceptance and injection attempts blocked collection as expected. This inspection is not independent customer acceptance or a formal accuracy study.

Decision: Groq is now a credible candidate for controlled application integration. Do not call the 20/20 result 100% accuracy: these are known authored regressions, including prompt-discussed patterns, one sample each. Production remains Agnes, no PayPal calls occurred, no formal freeze was declared, and a new end-to-end payment acceptance run remains outstanding. The comparison-only quota wait was subsequently made abort-aware so waiting cannot outlive the existing request signal; the recorded live run used the preceding wait implementation. No prompt or validator changed during the run.
