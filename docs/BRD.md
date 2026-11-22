# Business Requirements Document: Seat Map Selection

**Version:** 0.1 draft | **Owner:** Product Manager | **Status:** For review

## 1. Business context
Customers booking a package holiday (flights, hotel, transfers) must be able to choose where they sit on each flight. Seat selection is a high-visibility step: it generates ancillary revenue (standard from £24.50, extra legroom from £80, XL from £94, premium £500 per seat in the example) and affects satisfaction, but a confusing map or an unclear total causes drop-off at checkout.

**Problem:** customers need to pick seats per passenger and per flight, correct mistakes without starting over, and always see what they will pay.

**Goals / KPIs**
- Seat-selection step completion rate (target: baseline +10%)
- Ancillary revenue per booking
- Selection errors per session (conflicts, unavailable-seat clicks)
- Time to complete the step

**Personas:** leisure traveller booking for 1 to 9 adults; travel-agent assistant.

## 2. In scope
1. Seat map display per flight with seat states: standard, extra legroom, XL, premium, unavailable, selected.
2. Key to seats with from-prices.
3. **Select a seat** for a chosen passenger on a chosen flight.
4. **Change a selected seat**: picking a new seat releases the previous one.
5. Remove a seat selection.
6. **Live summary update**: per-passenger seat, per-flight subtotal and running total (starts at £0).
7. Navigation between outbound and return flights; "No seat selected yet" status per passenger.
8. Keyboard operability and non-colour seat-state cues.

## 3. Out of scope
- Payment and checkout.
- Seat allocation algorithms or auto-assign.
- Real-time airline inventory integration (mocked in this version).
- Infants, children-seating restrictions and special-assistance rules (phase 2).
- Hold timers, multi-currency, promotions and loyalty discounts.
- Changing seats after booking confirmation.

## 4. Business rules
| ID | Rule |
|---|---|
| BR-01 | Selection is per passenger and per flight; each passenger holds at most one seat per flight. |
| BR-02 | A seat can be assigned to only one passenger per flight. |
| BR-03 | Unavailable seats cannot be selected. |
| BR-04 | Selecting a new seat for a passenger releases that passenger's previous seat on the same flight. |
| BR-05 | Seat prices come from the seat's tier: standard £24.50, extra legroom £80, XL £94, premium £500. |
| BR-06 | Summary total = sum of all selected seat prices across all flights and passengers; £0 when none selected. |
| BR-07 | Seat selection is optional; a passenger may proceed with no seat selected. |
| BR-08 | Prices shown include mandatory fees and taxes (stated in the summary). |
| BR-09 | A passenger's selection on one flight does not affect the other flight. |

## 5. Dependencies
- Seat inventory and availability service (per flight).
- Pricing service for tier prices and taxes/fees.
- Booking service holding passengers, flights and package details.
- Design system (seat component states) and accessibility review.
- Analytics events for the KPIs above.
- Legal/compliance sign-off on fee and tax wording.

## 6. Additional items
**Acceptance criteria (examples)**
- Given Adult 1 is active, when a standard seat is clicked, then it shows selected, Adult 1 shows the seat number, and the total increases by £24.50.
- Given Adult 1 has seat 13C, when 14D is clicked, then 13C becomes available again, and the total reflects only 14D.
- Given a seat is unavailable, when clicked, then nothing changes and a message explains why.

**Non-functional:** responsive down to mobile; WCAG 2.1 AA; summary updates in under 200 ms; seat conflicts re-checked server-side at confirmation.

**Risks / assumptions:** inventory changes while a user is selecting (mitigate: re-validate on proceed); price display must match the final basket; assumes seat tiers are static per flight.

## 7. Traceability
Each business rule maps to an automated test in `tests/seatmap.test.js` (test names start with the rule ID). BR-08 is a display rule covered by the prototype summary text.
