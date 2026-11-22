# Fake inputs: customer discovery call, plane seat selection

> **All content is fictitious.** The company, people, figures and quotes are invented for the interview exercise. They are written to be consistent with `docs/BRD.md` while leaving gaps, conflicts and noise, as real inputs do.

## 1. Call metadata
| Field | Value |
|---|---|
| Date | Thu 19 Nov 2026, 10:00–10:50 CET (call attended, notes taken by PM) |
| Customer | SunHaven Holidays (fictional UK package-holiday operator) |
| Attendees (customer) | Marta Kowalczyk (Head of Digital Ancillaries), Dev Patel (Customer Experience Lead), Rob Ellis (Booking Platform Engineering Manager) |
| Attendees (our side) | PM (you), Solutions Architect |
| Topic | New plane seat-selection step inside "Manage my booking" |
| Goal of call | Understand pain points, desired outcome, constraints, success measures |
| Status | Inputs gathered; BRD v0.1 to be refined from these |

## 2. Customer background (as told on the call)
- About 1.1M package bookings a year; roughly 62% book 2 adults, 24% families.
- Seat selection is offered after booking in "Manage my booking" and, today, as a plain dropdown list of seat numbers with no map.
- Only 9% of bookings buy a seat; the competitor benchmark Marta quoted is "mid-teens".
- Seat revenue today is about £3.1M a year; the target is £5M within 12 months of launch.

## 3. Raw call notes (unedited, in conversation order)
1. Marta: "People can't see where they're sitting. They pick 14D, have no idea if it's a window, and give up."
2. Dev: contact-centre receives about 1,800 seat-related calls a month. The top reasons:
   - "I picked the wrong seat, how do I change it?" (about 38%)
   - "Why is the total different from what I saw?" (about 22%)
   - "Why can't I sit next to my partner?" (about 19%)
3. Marta wants the map shown **per flight**, outbound and return, with each passenger choosing separately.
4. Prices differ by seat type: standard, extra space (XL), extra legroom, premium. Marta: "Exact prices come from the airline's pricing feed, but for the pilot use today's list." *(Pilot list: standard £24.50, extra legroom £80, XL £94, premium £500.)*
5. Changing a seat must be easy. Dev: "One click on a new seat and the old one is released, no 'remove first' step."
6. Total must start at £0 and update live. Dev: "The 'total is different' calls are costing us a fortune."
7. Rob: seat availability comes from the airline's inventory API (REST, about 300 ms average response, occasional timeouts). A seat can be taken by another customer while someone is browsing.
8. Marta: seat selection must stay **optional**; "never block someone from continuing."
9. Dev: on mobile, over half of traffic, the seat map is "tiny and unusable"; wants a mobile-first layout.
10. Marta mentioned **infants** ("lap infants can't sit in exit rows") and **children** ("under-12s not in exit rows") but said "park it for phase 2."
11. Rob: a **hold timer** (reserve a seat for 10 minutes) was floated, but he is "not sure the airline supports soft holds."
12. Marta: the legal team insists prices shown are "all-in" (include fees and taxes) and that the summary says so.
13. Dev: accessibility complaints exist, "red/green seat colours are useless for colour-blind customers", and screen-reader users cannot use the dropdown.
14. Marta (end of call): "Can we also upsell travel insurance on the same screen?" Rob objected: "Different team, different release."
15. Launch target: pilot on Gatwick routes in **Q1 2027** (before Easter peak); full rollout by end of Q2 2027.

## 4. Short transcript excerpt (for quoting in the BRD)
> **Marta:** The moment someone picks a seat, I want the summary on the right to move. £0 to £24.50, instantly. If it jumps later at checkout, we lose them.
> **PM:** And if they change their mind?
> **Dev:** They tap another seat. Old seat goes free, new one is taken, total recalculates. Nobody should ever have two seats on one flight.
> **Rob:** Server-side we must still re-check on confirm. Someone else might have bought it in the meantime.
> **PM:** What if two passengers want the same seat?
> **Dev:** Can't happen, one seat, one person, per flight.

## 5. Customer-stated needs, as they were said (not yet prioritised)
| # | Need | Source note | Likely BRD link |
|---|---|---|---|
| N1 | Visual seat map per flight | 1, 3 | In scope 1, 7 |
| N2 | Select seat per passenger | 3 | BR-01 |
| N3 | One-click change of seat | 5 | BR-04 |
| N4 | One person per seat | 4 (transcript) | BR-02 |
| N5 | Live total starting at £0 | 6 | BR-06 |
| N6 | Tier pricing shown in a key | 4 | BR-05 |
| N7 | Selection optional | 8 | BR-07 |
| N8 | All-in price statement | 12 | BR-08 |
| N9 | Mobile-first and accessible | 9, 13 | NFR |
| N10 | Seat together with partner | 2 | **not covered; open question** |
| N11 | Child/infant exit-row rules | 10 | Out of scope (phase 2) |
| N12 | Hold timer | 11 | Out of scope; dependency risk |
| N13 | Insurance upsell on same screen | 14 | Out of scope (different team) |

## 6. Constraints and dependencies mentioned
- Airline inventory API: about 300 ms average, timeouts possible, no confirmed soft-hold support.
- Pricing: pilot uses a fixed price list; live pricing feed expected later.
- Legal sign-off needed for fee and tax wording before launch.
- Release train: the booking platform ships fortnightly; pilot code freeze is 15 Jan 2027.
- Analytics team can supply events but needs the list by 11 Dec 2026.

## 7. Fake baseline data (to define success metrics)
| Metric | Today | Target after pilot |
|---|---|---|
| Bookings that buy a seat | 9% | 14% |
| Seat-step completion rate | 61% | 71% (baseline +10 points) |
| Seat-related contact-centre calls / month | 1,800 | under 1,100 |
| Average seats revenue per booking | £2.80 | £4.50 |
| Mobile share of seat purchases | 34% | 50% |

## 8. Open questions to resolve (deliberately left unanswered)
1. Do "sit together" and "adjacent seats" need to be a rule in phase 1? (N10)
2. What should happen when the inventory API times out: block the map, or show a degraded view?
3. When a seat is taken by another customer mid-session: warn immediately, or only at confirmation?
4. Are seat prices ever discounted for loyalty members or promotions?
5. Is there a maximum of 9 passengers per booking, as assumed in the personas?
6. Can seats be changed after payment, and who pays for a change? (BRD currently says out of scope.)

## 9. Agreed actions after the call
| Owner | Action | Due |
|---|---|---|
| PM | Send BRD v0.2 to Marta, Dev and Rob | Fri 27 Nov 2026 |
| Rob | Confirm soft-hold support with the airline | Fri 4 Dec 2026 |
| Dev | Share contact-centre call tagging data | Wed 2 Dec 2026 |
| Marta | Get legal wording for the all-in price statement | Fri 11 Dec 2026 |
| Solutions Architect | Draft API integration approach and failure modes | Fri 4 Dec 2026 |

## 10. PM working notes (what a good PM would do next)
- Turn N1–N8 into acceptance criteria; they already match BR-01 to BR-09.
- Raise N10 and the open questions in the next review, and record each decision in the BRD.
- Convert N9 to non-functional requirements (WCAG 2.1 AA, a non-colour cue for seat states, a mobile layout).
- Keep N11–N13 visible in the out-of-scope list so they are not lost.
- Add the Section 7 metrics to the BRD KPIs.
