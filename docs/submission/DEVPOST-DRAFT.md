# Devpost submission copy — review draft

This is prepared copy, not a submitted entry. Verify the team details and add the actual public YouTube URL before submitting.

## Project name
Chat to Invoice

## Tagline
Turn changing chat agreements into itemized statements both sides can review, then collect through PayPal.

## Inspiration
Independent sellers often negotiate scope, quantities and add-ons over several messages. A final message may refer to an earlier quote or ask for the same configuration again. Copying the last price into a bill can miss an accepted extra or charge for a request that was never accepted. We focused on one narrow workflow: preserve the agreed details before asking for payment. This problem is a hypothesis; we do not claim validated customer demand or measured time savings.

## What it does
Chat to Invoice turns a simulated seller–customer conversation into a source-linked itemized fee statement. It tracks quantities, unit prices, included revisions and additions. Unanswered requests, changed prices, missing currency or conflicting totals prevent invoicing until clarified. The seller and customer review one fixed version on separate confirmation pages. Once both roles acknowledge it, the seller can create a PayPal Sandbox invoice and separately approve sending. The buyer pays on PayPal, and the app queries PayPal before reporting PAID.

## How we built it
The prototype uses Node.js and plain HTML, CSS and JavaScript without third-party runtime packages. Groq/qwen3.8-27b extracts structured line items and original message references; an explicitly selectable Agnes adapter remains available. The server copies original quotations, checks source references and acceptance chronology, and computes totals in integer cents. It validates again at the invoice boundary. PayPal Invoicing receives the accepted line items. Persistent operation records and locks prevent blind retries of uncertain financial writes. AI has no payment tools or payment credentials.

## Challenges
The hardest cases involved historical acceptance followed by a new quantity, and copying all selected customizations to a second product. We added constrained evidence repair without permitting it to change prices or acceptance states. Provider quota limits also required bounded waits and one shared retry within the original analysis deadline. Earlier failed runs are retained alongside later results.

## Accomplishments
The current application passed all 20 existing authored live-model regression cases in one run, plus 100 local tests. A Chinese blank-chat browser test retained all three priced components for two identical cups and verified the two-party confirmation gate. A new USD 1.00 current-build Sandbox invoice was created, sent, paid by the test buyer and verified PAID through the PayPal API. These tests do not establish general model accuracy or production readiness.

## What we learned
AI is useful for interpreting negotiated language, but a valid JSON response is not enough to authorize collection. Source checks, deterministic arithmetic, versioned review and payment-provider reconciliation each address a different failure.

## What's next
Run independent user trials and held-out negotiation tests. The current prototype stays local-only, USD-only and limited to one merchant; customer links are bearer acknowledgements on the same computer, not verified identities or legal signatures. No real-user trial has been completed.

## Built with
Node.js; JavaScript; HTML; CSS; Groq API; qwen3.8-27b; PayPal Invoicing API; PayPal Sandbox.

## Links
- Public source and setup: https://github.com/vivayang911/chat-to-invoice
- Public YouTube video: NOT YET UPLOADED — replace only after verification.

## Submission checks
The official rules were rechecked October 26, 2026: https://paypalaihackathon.devpost.com/rules . Provide an English description, public open-source repository, working build access through complete setup instructions or hosting, and a public YouTube video under three minutes showing the working project. Deadline: November 12, 2026, 12:00 PST, equivalent to November 13, 04:00 Asia/Shanghai. Do not submit this draft with a placeholder video URL.
