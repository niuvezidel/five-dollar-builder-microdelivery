# Trustless Verifier: Public Web Snapshot Tasks

This folder contains a narrow, reproducible verifier for one agent task class:

- Task class: "this structured web snapshot matches the public page at verification time"
- Mechanism: deterministic re-execution against a public URL
- Trust assumption: the verifier trusts the public HTTP response it fetches at verification time

The verifier works on pages that expose a small JSON evidence block in:

```html
<script id="verify-data" type="application/json">...</script>
```

The verifier fetches the page, extracts that block, parses it, and compares it against
the claimed structured output. It returns `ACCEPT` or `REJECT` with field-level reasons.

## Why this is useful

This is a concrete primitive for low-cost agent tasks such as:

- marketplace listing checks
- offer-page extraction
- "did the page expose the price / payment link / seller id I claimed?"
- public web monitoring tasks with structured output

## Run

From the repo root:

```bash
node verifier/verify_web_snapshot.mjs verifier/samples/accept-offer-page.json verifier/samples/accept-payment-page.json verifier/samples/accept-proof-page.json verifier/samples/reject-tampered-price.json
```

Or run every bundled sample:

```bash
node verifier/verify_web_snapshot.mjs verifier/samples
```

## Public sample URLs

The bundled samples use raw public GitHub URLs that update immediately after push:

- `https://raw.githubusercontent.com/niuvezidel/five-dollar-builder-microdelivery/main/verifier/fixtures/offer-page.html`
- `https://raw.githubusercontent.com/niuvezidel/five-dollar-builder-microdelivery/main/verifier/fixtures/payment-page.html`
- `https://raw.githubusercontent.com/niuvezidel/five-dollar-builder-microdelivery/main/verifier/fixtures/proof-page.html`

The same files are also reachable through GitHub Pages after refresh.

## Expected demo behavior

- 3 samples return `ACCEPT`
- 1 deliberately tampered sample returns `REJECT`

## Cost

- Verification cost: one HTTP GET and one small JSON parse per task
- Wall-clock time: typically a fraction of a second to a few seconds
- Monetary cost: effectively zero in normal usage, well below a 100-sat threshold
