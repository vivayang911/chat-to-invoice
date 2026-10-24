# Chat to Invoice

**Keep negotiated charges reviewable, then collect through PayPal Sandbox.**

## Problem and scope

Designers and other independent sellers often agree prices through several messages. A new request, accepted addition or revised quantity can change what should appear on the final bill. This local prototype addresses that one workflow: conversation → itemized fee statement → separate acknowledgements → PayPal invoice.

The problem is a hypothesis, not a measured customer result. There are no real-user trial results or measured time savings.

## Workflow

A simulated seller–customer chat supports English and Chinese. Agnes `agnes-3.0-flash` proposes charge descriptions, prices, quantities, pricing bases and original-message references. The program computes accepted charges in integer cents; it does not use AI arithmetic as the payable total. Pending and cancelled rows are excluded. An unresolved financial item, any remaining open issue, missing currency or inconsistent total blocks invoicing. Correct the source conversation and analyze again; checking a box cannot settle an unresolved issue.

When settled, the seller saves a fixed fee statement. Seller and customer review the same version on separate pages. A customer correction or seller edit invalidates the version. These are bearer-link acknowledgements, not verified identities, legal signatures or a live messaging integration. This local link works on the same computer only.

Only a statement confirmed by both parties can create a PayPal Sandbox draft. Sending requires separate consent to the saved details. The buyer pays on PayPal's hosted sandbox page. The application reports PAID only after querying PayPal; a return page alone is not proof of payment. AI has no payment tools or provider credentials.

## Implementation and recovery

Node.js 22 or later, plain HTML/CSS/JavaScript and no third-party runtime packages. The server checks schemas, exact original quotations, quoted numerical prices, buyer evidence and temporal price/acceptance order. The model selects source message IDs and the server copies their original text. One complete source re-extraction may address a structural defect or a missed contextual acknowledgement; all corrected fields are independently validated again. Otherwise valid output with missing evidence may receive one constrained citation-selection request that cannot rewrite facts. The whole analysis retains its 90-second deadline. Unresolved or unsupported results fail closed.

Separate confirmation tokens, fixed version fingerprints and persistent operation records guard the financial boundary. Snapshot checks repeat before creating and sending. Uncertain financial writes are not automatically retried. Reloading a generated statement uses same-tab session storage and a fresh server status query. Unconfirmed drafts are not autosaved. The server does not persist web-submitted chat text; the generated statement's browser session includes its conversation and private access links. API keys stay in ignored server environment files.

## Verification and limitations

See ACCEPTANCE-AND-DELIVERY.md for the dated release assessment. Local tests and simulated-provider browser tests do not establish AI accuracy or prove a live PayPal round trip. A historical USD 100 application invoice was paid in Sandbox and was queried again on October 24, 2026; it predates the latest acknowledgement workflow. No claim is made that a new live payment was completed by the latest build.

The authored 18-case live model suite includes missing currency, cancellation, injection, withdrawn quotes and multi-turn Chinese additions. Earlier failed outputs are retained. Model interpretation, source relevance and contextual acceptance remain limitations even when automated checks pass. Users should use synthetic examples: the model provider's retention policy has not been independently verified.

## Running and submission

Follow README.md and QUICKSTART.md for setup with your own Agnes key and PayPal Sandbox account. The implementation is local-only, USD-only, one merchant, generated sandbox personal recipients and one final invoice total composed of itemized charges. It is not a production billing service.

The local archive is not a public submission. Public repository and YouTube video links must only be added after publication and verification. English demonstration narration is prepared in DEMO-SCRIPT.md. Source repository: https://github.com/vivayang911/chat-to-invoice . No uploaded final video or completed competition submission is claimed here.
