# Trial package quick start

This archive is a local sandbox prototype, not a hosted service or a completed competition submission. It intentionally excludes private credentials, invoice state, historical account records, and rehearsal videos.

1. Install Node.js 22 or later and extract the archive into a new folder.
2. Open a terminal in the extracted `chat-to-invoice` folder. Run `npm test` before configuring any API credentials. The tests do not make real model or PayPal calls.
3. Follow the README's first-time setup to copy the two configuration templates into `work/`. Use your own Agnes key and your own PayPal sandbox application credentials.
4. Run `npm start`, then open `http://127.0.0.1:4187` on the same computer.
5. Begin with the supplied synthetic examples. Review original evidence and open issues. A real model call requires consent and may take up to 90 seconds, including bounded citation recovery.
6. To test invoices, use your own generated personal sandbox buyer. First save a fixed statement and collect both seller and customer acknowledgements on separate pages. A draft, a sent invoice, and a paid invoice are separate states. Sending and buyer payment require separate confirmation.

No participant needs to send the project author their API keys or account password. Do not enter live payment credentials or customer-sensitive conversations. Provider retention has not been verified.

The clean package contains no already-paid invoice to recover. The project's previously verified USD 100 result is documented evidence, not a payment performed on your installation. Do not use a screenshot as proof that your own invoice was paid.

For a real designer trial, see USER-TRIAL.md. No trial has happened merely because this package was prepared. Public hosting, video upload, public repository publication, and competition submission remain separate tasks.

The source tree in the full development workspace has additional historical diagnostics and notes. They are deliberately omitted from this trial archive. The included tests, live synthetic evaluator, and current English documents are sufficient to reproduce the core prototype.

Optional browser regression (developer dependency only): install Playwright locally with `npm install --no-save --package-lock=false playwright` and `npx playwright install chromium`. Then run `node scripts/check-release-flow.cjs` from the extracted project root. This starts an isolated server, uses synthetic model data and a simulated payment provider, checks both-party confirmation and recovery, and makes zero real API calls. Its simulated PAID state is not a PayPal receipt.
