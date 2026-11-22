# Seat Map Selection – end-to-end feature example

Select a seat, change the selected seat, and update the booking summary, built end to end with Claude.

| Artifact | Path |
|---|---|
| Business requirements | [docs/BRD.md](docs/BRD.md) |
| Low-fidelity clickable prototype | [prototype/index.html](prototype/index.html) (open in a browser) |
| Feature logic (zero dependencies) | [src/seatmap.js](src/seatmap.js) |
| Tests + rule traceability | [tests/seatmap.test.js](tests/seatmap.test.js) |
| Prompt and decision log | [docs/PROMPT_LOG.md](docs/PROMPT_LOG.md) |

## Run
```bash
node --test        # Node 18+, no install needed
```
Prototype: open `prototype/index.html`, or enable GitHub Pages on `/prototype`.

## Scope note
Pricing and seat data are mocked from the example screenshots (Gatwick to Phuket). No real airline or payment integration.
