# Fake API contracts: seat map selection

> **Fictitious.** "Global Sales" and "Jet Airlines" are invented systems. Hosts, keys, flight numbers, booking references and prices are made up for the interview exercise. The shapes deliberately differ from our proposed model in `ENGINEERING_SPEC.md` (section 4) in ways real vendors do, so the mapping notes in section 5 matter.

## Overview

| # | API | Provider | Purpose | Used for |
|---|---|---|---|---|
| 1 | Booking Summary API | **Global Sales** | Holiday details, price, passengers; records seat charges and returns the updated summary | Summary panel, booking total |
| 2 | Flights API | **Jet Airlines** | The legs of a booking and their identifiers | Outbound and return flight tabs |
| 3 | Seat Options API | **Jet Airlines** | Seat map, availability, tier and price; seat assignment | Seat map, confirm |

```
UI --> Booking service --+--> Global Sales   (1) summary, seat charge
                         +--> Jet Airlines   (2) flights, (3) seat map and assignment
```

**Call order:** (1) summary, then (2) flights for the booking, then (3) seat map per flight. On confirm: (3) assign seats first, then (1) record the charge. See section 6 for the failure case between the two.

---

## 1. Global Sales: Booking Summary API

**Base URL:** `https://api.globalsales.example/v2`
**Auth:** OAuth 2.0 client credentials, header `Authorization: Bearer <token>` (token lifetime 3600 s)
**Format:** JSON, UTF-8. Money is **integer minor units** (pence) with an explicit `currency`.
**Rate limit:** 50 requests/second per client; `429` with `Retry-After`.
**Typical latency:** about 120 ms (p95 400 ms).

### 1.1 `GET /bookings/{bookingRef}/summary`

Returns the holiday package as it stands now.

**Path parameter:** `bookingRef` (string, e.g. `GS-7K4Q92`)
**Headers:** `Authorization`, `X-Request-Id` (UUID, recommended)

**200 response**
```json
{
  "bookingRef": "GS-7K4Q92",
  "status": "CONFIRMED",
  "revision": 14,
  "holiday": {
    "departureDate": "2027-02-19",
    "nights": 7,
    "destination": "Phuket",
    "board": "BED_AND_BREAKFAST",
    "rooms": [{ "type": "DOUBLE", "count": 1 }],
    "transfer": "OVERSEAS_COACH",
    "baggage": { "hand": true, "checkedPerPassenger": { "count": 1, "kg": 25 } },
    "mealsIncluded": true
  },
  "passengers": [
    { "passengerId": "P1", "title": "Mr",  "firstName": "Adam", "lastName": "Test", "type": "ADULT" },
    { "passengerId": "P2", "title": "Mrs", "firstName": "Eva",  "lastName": "Test", "type": "ADULT" }
  ],
  "pricing": {
    "currency": "GBP",
    "perPerson": 242880,
    "total": 485760,
    "seatsTotal": 0,
    "grandTotal": 485760,
    "includesFeesAndTaxes": true,
    "pricesUpdatedAt": "2026-11-22T09:40:00Z"
  },
  "seatCharges": []
}
```

**Errors**

| HTTP | `code` | Meaning |
|---|---|---|
| 401 | `UNAUTHORIZED` | Missing or expired token |
| 403 | `BOOKING_NOT_ACCESSIBLE` | Client may not read this booking |
| 404 | `BOOKING_NOT_FOUND` | Unknown reference |
| 429 | `RATE_LIMITED` | Back off per `Retry-After` |
| 503 | `UPSTREAM_UNAVAILABLE` | Try again |

Error body (all APIs from this provider):
```json
{ "code": "BOOKING_NOT_FOUND", "message": "No booking GS-7K4Q92", "requestId": "b6d1…" }
```

### 1.2 `POST /bookings/{bookingRef}/seat-charges`

Records the seats the customer chose and returns the updated summary. Replaces any earlier seat charges for the same flight and passenger (idempotent per request key).

**Headers:** `Authorization`, `Idempotency-Key` (required, UUID), `If-Match: <revision>` (required, optimistic locking)

**Request**
```json
{
  "charges": [
    { "flightRef": "JA311-20270219", "passengerId": "P1", "seat": "13C", "tier": "STANDARD", "amount": 2450 },
    { "flightRef": "JA311-20270219", "passengerId": "P2", "seat": "4F",  "tier": "PREMIUM",  "amount": 50000 },
    { "flightRef": "JA312-20270226", "passengerId": "P1", "seat": "13C", "tier": "STANDARD", "amount": 2450 }
  ]
}
```

**200 response:** the full summary (same shape as 1.1) with `revision` incremented, `pricing.seatsTotal: 54900` and `pricing.grandTotal: 540660`, and `seatCharges` listing the three lines.

**Errors**

| HTTP | `code` | Meaning |
|---|---|---|
| 409 | `REVISION_MISMATCH` | Booking changed since read; fetch the summary and retry |
| 409 | `IDEMPOTENCY_CONFLICT` | Same key, different body |
| 422 | `AMOUNT_MISMATCH` | Amount differs from the price Global Sales expects for that tier |
| 422 | `BOOKING_NOT_EDITABLE` | Booking is cancelled or already departed |
| 422 | `PASSENGER_UNKNOWN` | `passengerId` not on the booking |

---

## 2. Jet Airlines: Flights API

**Base URL:** `https://api.jetairlines.example/v1`
**Auth:** API key header `X-Api-Key: <key>`; calls also need `X-Partner-Id: SUNHAVEN` (fictional partner id).
**Rate limit:** 20 requests/second per key; `429` with `Retry-After`.
**Typical latency:** about 150 ms.

### 2.1 `GET /bookings/{bookingRef}/flights`

`bookingRef` here is Global Sales' reference (the partners share it).

**200 response**
```json
{
  "bookingRef": "GS-7K4Q92",
  "flights": [
    {
      "flightRef": "JA311-20270219",
      "direction": "OUTBOUND",
      "flightNumber": "JA311",
      "origin":      { "iata": "LGW", "name": "London Gatwick", "terminal": "S" },
      "destination": { "iata": "HKT", "name": "Phuket" },
      "departure": "2027-02-19T11:20:00Z",
      "arrival":   "2027-02-20T05:35:00Z",
      "aircraft": { "type": "JA-WIDE-300", "seatConfigId": "JW300-V2" },
      "passengerIds": ["P1", "P2"],
      "seatSelectionOpen": true,
      "seatSelectionClosesAt": "2027-02-18T11:20:00Z"
    },
    {
      "flightRef": "JA312-20270226",
      "direction": "RETURN",
      "flightNumber": "JA312",
      "origin":      { "iata": "HKT", "name": "Phuket" },
      "destination": { "iata": "LGW", "name": "London Gatwick", "terminal": "S" },
      "departure": "2027-02-26T07:40:00Z",
      "arrival":   "2027-02-26T15:10:00Z",
      "aircraft": { "type": "JA-WIDE-300", "seatConfigId": "JW300-V2" },
      "passengerIds": ["P1", "P2"],
      "seatSelectionOpen": true,
      "seatSelectionClosesAt": "2027-02-25T07:40:00Z"
    }
  ]
}
```

**Errors:** `401 UNAUTHORIZED`, `404 BOOKING_NOT_FOUND`, `429 RATE_LIMITED`, `503 UPSTREAM_UNAVAILABLE`.
If `seatSelectionOpen` is `false` the seat map call (3.1) returns `409 SELECTION_CLOSED`.

---

## 3. Jet Airlines: Seat Options API

Same base URL, auth and rate limit as section 2.
**Typical latency:** about 300 ms average, p95 1.5 s. The service **occasionally times out** (`504`) under load. **No soft holds are offered** (this is unconfirmed on the business side; treat as "not available").

### 3.1 `GET /flights/{flightRef}/seatmap?bookingRef={bookingRef}`

**200 response (abridged: rows 4 and 13 shown; real responses carry every row)**
```json
{
  "flightRef": "JA311-20270219",
  "seatConfigId": "JW300-V2",
  "generatedAt": "2026-11-22T10:15:03Z",
  "currency": "GBP",
  "cabins": [
    {
      "cabinId": "FRONT",
      "columns": [
        { "id": "A" }, { "id": "C" }, { "aisle": true },
        { "id": "D" }, { "id": "E" }, { "id": "F" }, { "aisle": true },
        { "id": "G" }, { "id": "J" }
      ],
      "rows": [
        {
          "row": 4,
          "seats": [
            { "seat": "4A", "status": "OCCUPIED" },
            { "seat": "4C", "status": "OCCUPIED" },
            { "seat": "4D", "status": "OCCUPIED" },
            { "seat": "4E", "status": "OCCUPIED" },
            { "seat": "4F", "status": "FREE", "characteristics": ["PREMIUM"],
              "price": { "amount": "500.00", "currency": "GBP" } },
            { "seat": "4G", "status": "OCCUPIED" },
            { "seat": "4J", "status": "OCCUPIED" }
          ]
        }
      ]
    },
    {
      "cabinId": "REAR",
      "columns": [
        { "id": "A" }, { "id": "B" }, { "id": "C" }, { "aisle": true },
        { "id": "D" }, { "id": "E" }, { "id": "F" }, { "aisle": true },
        { "id": "G" }, { "id": "H" }, { "id": "J" }
      ],
      "rows": [
        {
          "row": 13,
          "seats": [
            { "seat": "13A", "status": "OCCUPIED" },
            { "seat": "13C", "status": "FREE", "characteristics": [],
              "price": { "amount": "24.50", "currency": "GBP" } },
            { "seat": "13D", "status": "FREE", "characteristics": [],
              "price": { "amount": "24.50", "currency": "GBP" } },
            { "seat": "13E", "status": "FREE", "characteristics": [],
              "price": { "amount": "24.50", "currency": "GBP" } },
            { "seat": "13F", "status": "BLOCKED" }
          ]
        }
      ]
    }
  ],
  "legend": [
    { "code": "STANDARD", "from": "24.50" },
    { "code": "LEGROOM",  "from": "80.00" },
    { "code": "XL",       "from": "94.00" },
    { "code": "PREMIUM",  "from": "500.00" }
  ]
}
```

**Field notes**

| Field | Values and meaning |
|---|---|
| `status` | `FREE`, `OCCUPIED`, `BLOCKED` (crew, aircraft or regulatory reasons). Only `FREE` can be bought |
| `characteristics` | Zero or more of `PREMIUM`, `XL`, `LEGROOM`, `EXIT_ROW`, `WINDOW`, `AISLE`. No tier code means standard |
| `price.amount` | **Decimal string** in major units, not pence |
| `columns[].aisle` | Marks an aisle gap |
| Seats missing from a row | Not a seat (e.g. no seat B in the front cabin); do not render |

**Errors**

| HTTP | `code` | Meaning |
|---|---|---|
| 404 | `FLIGHT_NOT_FOUND` | Unknown `flightRef` |
| 409 | `SELECTION_CLOSED` | Seat selection closed for this flight |
| 422 | `BOOKING_FLIGHT_MISMATCH` | Booking is not on this flight |
| 429 | `RATE_LIMITED` | Back off per `Retry-After` |
| 503 / 504 | `UPSTREAM_UNAVAILABLE` / `TIMEOUT` | Retry with backoff; show the error state to the customer |

### 3.2 `POST /flights/{flightRef}/seat-assignments`

Assigns seats for one flight. **All-or-nothing per request.**

**Headers:** `X-Api-Key`, `X-Partner-Id`, `Idempotency-Key` (required, UUID)

**Request**
```json
{
  "bookingRef": "GS-7K4Q92",
  "assignments": [
    { "passengerId": "P1", "seat": "13C" },
    { "passengerId": "P2", "seat": "14D" }
  ]
}
```
To release a seat send `"seat": null` for that passenger. A new seat for a passenger replaces the previous one.

**200 response**
```json
{
  "flightRef": "JA311-20270219",
  "assignmentId": "SA-55021",
  "assignments": [
    { "passengerId": "P1", "seat": "13C", "price": { "amount": "24.50", "currency": "GBP" } },
    { "passengerId": "P2", "seat": "14D", "price": { "amount": "24.50", "currency": "GBP" } }
  ],
  "total": { "amount": "49.00", "currency": "GBP" }
}
```

**409 response (nothing is assigned)**
```json
{
  "code": "SEAT_NOT_AVAILABLE",
  "message": "One or more seats are no longer available",
  "failures": [
    { "passengerId": "P2", "seat": "14D", "reason": "OCCUPIED" }
  ],
  "requestId": "e91c…"
}
```

**Other errors**

| HTTP | `code` | Meaning |
|---|---|---|
| 409 | `SEAT_NOT_AVAILABLE` | See above; `reason` is `OCCUPIED` or `BLOCKED` |
| 409 | `IDEMPOTENCY_CONFLICT` | Same key, different body |
| 422 | `DUPLICATE_SEAT_IN_REQUEST` | Two passengers on the same seat |
| 422 | `SEAT_UNKNOWN` | Seat does not exist on this configuration |
| 422 | `PASSENGER_UNKNOWN` | Passenger not on the booking |
| 409 | `SELECTION_CLOSED` | Window has closed |

---

## 4. Test data (fake)

| Item | Value |
|---|---|
| Booking | `GS-7K4Q92`, 2 adults, Fri 19 Feb 2027, 7 nights |
| Package price | £2,428.80 per person, £4,857.60 total |
| Flights | `JA311-20270219` (LGW to HKT), `JA312-20270226` (HKT to LGW) |
| Seats | 4F and 6F premium £500, 10C and 10D XL £94, 11C to 14G standard £24.50 |
| Always occupied | 1A, 1C, 2A, 10A, 12C |
| Race test | Seat `14D` becomes `OCCUPIED` between the seat map call and the assignment call |
| Closed test | Booking `GS-CLOSED1`: `seatSelectionOpen: false` |
| Timeout test | Booking `GS-SLOW504`: seat map returns `504` |

---

## 5. Mapping to our internal model

| Our model | Source | Transformation |
|---|---|---|
| Flight tabs (`outbound`, `return`) | Flights API `direction` | Lowercase `OUTBOUND` and `RETURN` |
| Passengers | Global Sales `passengers[]` | Use `passengerId` as the key; display name from title and surname |
| Seat `available` | Seat map `status` | `true` only for `FREE` |
| Seat tier | `characteristics` | `PREMIUM`, then `XL`, then `LEGROOM`, otherwise `standard`; if several apply, premium wins **[Open: confirm precedence with Jet Airlines]** |
| Seat price | `price.amount` | **Parse the decimal string and convert to pence** (`"24.50"` becomes `2450`) |
| Unavailable seats | `OCCUPIED`, `BLOCKED` | Same UI state; keep the reason for analytics |
| Holiday card and total | Global Sales `holiday`, `pricing` | Use `grandTotal` after seat charges; display `includesFeesAndTaxes` text |
| `SEAT_TAKEN`, `SEAT_UNAVAILABLE` (our codes) | Jet `SEAT_NOT_AVAILABLE` | `reason: OCCUPIED` maps to `SEAT_UNAVAILABLE` |

---

## 6. Integration behaviour and gaps to resolve

**Confirm sequence**
1. Read the current `revision` from the summary (1.1).
2. Call Jet Airlines seat assignment per flight (3.2). If any call returns 409, stop and show the failed seats.
3. Call Global Sales seat charge (1.2) with `If-Match: <revision>` and an idempotency key.
4. Show the returned summary.

**Known gaps and risks (deliberately left open)**
1. **No distributed transaction.** If step 2 succeeds for outbound but fails for return, or step 3 fails after step 2, the seats are assigned but not charged. Needs a compensation (release) call or a reconciliation job. **[Open]**
2. **Prices come from two systems.** Jet Airlines publishes seat prices; Global Sales validates them (`AMOUNT_MISMATCH`). Who owns the price list? **[Open]**
3. **Seat selection closing times** (`seatSelectionClosesAt`) are not in the BRD. Add a rule and a UI message. **[Open]**
4. **No soft hold**, so the seat can be lost between seat map and assignment (the race test above).
5. **Per-flight assignment calls**, so the "all-or-nothing" requirement in the engineering spec only holds per flight, not per booking. The spec needs updating or a compensation is required.
6. **Rate limits are low** (20 per second on Jet Airlines): cache the flights call for the session; refresh the seat map only on user action.
7. **Time zone handling:** all timestamps are UTC; display in the airport's local time.
