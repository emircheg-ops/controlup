# Engineering specification: Seat Map Selection

| | |
|---|---|
| **Status** | Draft v0.1 for engineering review |
| **Date** | 22 Nov 2026 |
| **Author** | Product Manager |
| **Source documents** | [BRD](BRD.md), [customer call inputs](inputs/customer-call-inputs.md) |
| **Reference implementation** | `src/seatmap.js`, `tests/seatmap.test.js`, `prototype/` |

All customer data and figures in the source documents are fictitious. Where this spec goes beyond the BRD, the item is marked **[Proposal]** or **[Open]**.

---

## 1. Purpose and scope

Build a seat-selection step in "Manage my booking". A customer chooses a seat for each passenger on each flight, can change or remove a choice, and sees a live summary with the running total.

**In scope for engineering:** seat map UI, selection state and rules, summary calculation, availability fetch, server-side re-validation at confirmation, analytics events, accessibility, tests.

**Out of scope** (per BRD): payment, auto-assign, hold timers, infant/child restrictions, multi-currency, promotions, post-confirmation changes, insurance upsell.

---

## 2. Glossary

| Term | Meaning |
|---|---|
| Flight | One leg of a booking (`outbound`, `return`) |
| Passenger | A traveller on the booking (1 to 9 adults) |
| Seat tier | `standard`, `legroom`, `xl`, `premium` |
| Selection | A passenger-to-seat assignment on one flight |
| Confirmation | The moment the selection is submitted to the booking service |

---

## 3. Architecture

```
Browser (seat map UI)
   |  state + rules (pure functions, src/seatmap.js)
   |
   |-- GET  /bookings/{id}/flights/{flight}/seatmap   --> Booking service --> Airline inventory API
   |-- POST /bookings/{id}/seats/confirm              --> Booking service (re-validates) --> Airline inventory API
```

**Principles**
1. Rules live in **pure, framework-free functions** with immutable state (already true of `src/seatmap.js`).
2. The browser enforces rules for fast feedback. The **server re-checks every rule** on confirm (the browser is never trusted).
3. The airline inventory API is behind an interface so it can be mocked (see section 8).
4. The prototype is a wireframe. Its inline logic must be replaced by an import of the shared module, to avoid two copies of the rules.

---

## 4. Data model

### 4.1 Seat map response (read)
```json
{
  "flight": "outbound",
  "currency": "GBP",
  "fetchedAt": "2026-11-22T10:15:00Z",
  "sections": [
    { "id": "front", "columns": ["A","C","D","E","F","G","J"], "rows": [1,2,3,4,5,6,7], "aisleAfter": ["C","F"] },
    { "id": "rear",  "columns": ["A","B","C","D","E","F","G","H","J"], "rows": [10,11,12,13,14], "aisleAfter": ["C","F"] }
  ],
  "seats": {
    "13C": { "tier": "standard", "price": 24.50, "available": true },
    "4F":  { "tier": "premium",  "price": 500.00, "available": true },
    "1A":  { "tier": "standard", "price": 24.50, "available": false }
  }
}
```

### 4.2 Client state
```json
{
  "passengers": [{ "id": "a1", "name": "Adult 1" }, { "id": "a2", "name": "Adult 2" }],
  "flights": { "outbound": { "seats": {} }, "return": { "seats": {} } },
  "selections": { "outbound": { "a1": "13C" }, "return": {} }
}
```
Invariants: `selections[flight]` maps each passenger to at most one seat; no seat appears twice in the same flight.

### 4.3 Price source **[Proposal]**
The reference code uses a fixed tier table (`TIERS`). For production, take `price` from the seat map response and keep the tier table only as a pilot fallback. Store money as **integer pence** to avoid floating-point errors (the reference code uses decimals such as 24.5).

---

## 5. Business rules and implementation requirements

| ID | Rule (from BRD) | Implementation requirement | Error code |
|---|---|---|---|
| BR-01 | One seat per passenger per flight | `selections[flight][passengerId]` is a single value | n/a |
| BR-02 | One passenger per seat per flight | Reject if another passenger holds the seat | `SEAT_TAKEN` |
| BR-03 | Unavailable seats cannot be selected | Reject if `available === false` | `SEAT_UNAVAILABLE` |
| BR-04 | New seat releases the old one | Replacement is a single atomic state change | n/a |
| BR-05 | Price comes from the seat's tier | Price read from seat data | n/a |
| BR-06 | Total = sum of selected seat prices, £0 if none | Derived from state, never stored | n/a |
| BR-07 | Selection is optional and removable | `clearSeat`; "Next flight" is never blocked by an empty selection | n/a |
| BR-08 | Displayed prices include fees and taxes | Summary shows the "Incl. mandatory fees & taxes" text | n/a |
| BR-09 | Flights are independent | State keyed by flight | n/a |

Unknown seat IDs and unknown passenger IDs raise `SEAT_UNKNOWN` and `PASSENGER_UNKNOWN`.

---

## 6. Functional requirements

### 6.1 Select a seat (FR-1)
- **Given** a passenger is active and a seat is available, **when** the seat is clicked, **then** the seat becomes that passenger's selection and the summary updates.
- Clicking a seat held by the other passenger shows an inline message and changes nothing.
- Clicking an unavailable seat shows an inline message and changes nothing.

### 6.2 Change a seat (FR-2)
- Selecting a different seat for the same passenger replaces the old seat in one step. The old seat becomes available again immediately.
- Clicking the passenger's own seat removes it (toggle). **[Proposal]** Show a short "Seat removed" message.

### 6.3 Live summary (FR-3)
- One line per passenger per flight: flight, name, seat or "No seat selected yet", price.
- Running total starts at £0.00 and updates on every action in under 200 ms.
- The summary text includes the fees-and-taxes statement (BR-08).

### 6.4 Flight and passenger navigation (FR-4)
- Switching flight or passenger never loses selections.
- "Next flight" moves from outbound to return; on the return flight the same button becomes "Review summary".
- "Cancel and return" discards unsaved selections **[Open: confirm with product whether to show a discard warning]**.

### 6.5 Confirmation (FR-5)
- On confirm the client sends all selections. The server re-validates every rule against live inventory.
- If any seat is no longer available, the server rejects that seat with `SEAT_UNAVAILABLE`, applies none of the selections (all-or-nothing **[Proposal]**), and returns the list of failed seats. The UI highlights them and asks the customer to choose again.

### 6.6 Seat states and key (FR-6)
States: standard, extra legroom, XL, premium, unavailable, selected (this passenger), taken (other passenger). Each state must be distinguishable **without relying on colour** (icon, border style or label).

---

## 7. API contract

### 7.1 `GET /bookings/{bookingId}/flights/{flight}/seatmap`
- **200** seat map (section 4.1).
- **404** unknown booking or flight.
- **503** inventory unavailable (see section 9).

### 7.2 `POST /bookings/{bookingId}/seats/confirm`
Request:
```json
{ "selections": { "outbound": { "a1": "13C", "a2": "14D" }, "return": { "a1": "13C" } } }
```
Responses:
- **200** `{ "confirmed": [...], "total": 4900 }` (pence).
- **409** `{ "errors": [{ "flight": "outbound", "passengerId": "a2", "seat": "14D", "code": "SEAT_UNAVAILABLE" }] }`.
- **422** rule violation (`SEAT_TAKEN`, `SEAT_UNKNOWN`, `PASSENGER_UNKNOWN`).
- **Idempotency [Proposal]:** require an `Idempotency-Key` header so that retries do not double-book.

---

## 8. Reference implementation: current state and gaps

`src/seatmap.js` exports `createState`, `selectSeat`, `clearSeat`, `summary`, `sampleInventory`, `TIERS`.

| Area | Status |
|---|---|
| Rules BR-01 to BR-07, BR-09 as pure immutable functions | Done, 8 passing tests |
| BR-08 (fees statement) | Prototype text only, no test |
| Money in pence | **Gap**: uses decimals |
| Inventory behind an interface | **Gap**: `sampleInventory()` is hard-coded |
| `legroom` tier | **Gap**: defined in `TIERS`, no seats of that tier in the sample data |
| Shared logic between prototype and code | **Gap**: prototype has its own copy |
| Server-side re-validation, API, analytics, error mapping | **Not started** |

---

## 9. Failure handling

| Situation | Behaviour |
|---|---|
| Inventory API slow (average about 300 ms, per call notes) | Show a skeleton map; time out the request after 5 s **[Proposal]** |
| Inventory API times out or returns 5xx | Show an error with a "Try again" button; do not show a stale map as if it were live. **[Open: block, or degraded view?]** |
| Seat taken by another customer while browsing | Detected at confirm (FR-5). **[Open: also warn on a periodic refresh?]** |
| Network error on confirm | Keep local selections, show a retry action, use the idempotency key |
| Unknown or malformed data | Fail closed: the seat is shown as unavailable |

---

## 10. Non-functional requirements

- **Performance:** summary update under 200 ms; initial map render under 1 s after data arrives; map handles up to 60 rows without jank.
- **Accessibility (WCAG 2.1 AA):** every seat is a `button` with an `aria-label` (seat, price, state); full keyboard operation; visible focus; status messages in an `aria-live` region; contrast at least 4.5:1; no colour-only cues.
- **Responsive:** mobile-first (over half of traffic, per call notes); the map scrolls horizontally rather than shrinking below a 44 px tap target.
- **Security:** validate all input server-side; authorise that the booking belongs to the signed-in user or session; do not log personal data.
- **Browser support:** current and previous major versions of Chrome, Safari, Firefox, Edge; iOS Safari and Android Chrome.
- **Observability:** structured logs for confirm failures; alert when the inventory error rate is above 2% over 5 minutes **[Proposal]**.

---

## 11. Analytics events

Required for the KPIs in the BRD. Names are proposals; the analytics team needs the final list by **11 Dec 2026**.

| Event | Properties |
|---|---|
| `seatmap_viewed` | bookingId, flight |
| `seat_selected` | flight, passengerId, seat, tier, price, isChange |
| `seat_removed` | flight, passengerId, seat |
| `seat_conflict_shown` | flight, seat, reason (`taken` or `unavailable`) |
| `seat_step_completed` | seatsSelected, total |
| `seat_step_skipped` | n/a |
| `seat_confirm_failed` | failedSeats, code |

---

## 12. Test plan

| Level | What | Notes |
|---|---|---|
| Unit | Each business rule | Existing tests, named by BR ID; add BR-08 and money-in-pence |
| Unit | Edge cases | Unknown seat or passenger, empty state, selecting then clearing, 9 passengers, same seat on two flights |
| Contract | API request and response shapes | Against the mock inventory |
| Integration | Confirm with a seat that was taken meanwhile | Must return 409 and apply nothing |
| End-to-end | Select, change, remove, switch flight, skip, confirm | Automated against the prototype first, then the real UI |
| Accessibility | Automated scan plus a manual screen-reader pass | At least one desktop and one mobile reader |
| Performance | Render and update time at 60 rows | Budget in section 10 |

**Acceptance:** all BR rules have at least one passing test, every FR has an end-to-end test, no critical accessibility findings.

---

## 13. Delivery plan **[Proposal]**

| Step | Content | Target |
|---|---|---|
| 1 | Shared rules module, money in pence, inventory interface, tests | Before 4 Dec 2026 |
| 2 | UI replacing the prototype logic with the shared module; accessibility pass | Before 18 Dec 2026 |
| 3 | API integration, confirm and error handling, analytics | Before 15 Jan 2027 (pilot code freeze) |
| 4 | Pilot on Gatwick routes | Q1 2027 |

---

## 14. Open questions for engineering and product

1. Sit-together support (customer need N10): a rule in phase 1 or not? It would change the data model (adjacency) and BR-02.
2. Behaviour when the inventory API fails: block or degrade? (section 9)
3. Does the airline support soft holds? (Owner: Rob Ellis; due 4 Dec 2026.) If yes, hold timers could be reconsidered.
4. Is the per-seat price taken from the live feed from day one or only the pilot price list?
5. Is all-or-nothing confirmation acceptable, or should partial success be allowed?
6. BRD BR-06 says the total is the sum of seat prices. The Jet2-style prototype also shows holiday price plus seats. Which total is the contract for the summary component?
7. Can seats be changed after payment? The BRD says out of scope; support will receive these calls.
