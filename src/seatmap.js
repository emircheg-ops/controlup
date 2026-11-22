'use strict';
const TIERS = { standard: 24.5, legroom: 80, xl: 94, premium: 500 }; // BR-05
const CURRENCY = 'GBP';
const clone = (s) => JSON.parse(JSON.stringify(s));

function createState({ passengers, flights }) {
  const selections = {};
  for (const f of Object.keys(flights)) selections[f] = {};
  return { passengers, flights, selections };
}

function seatOf(state, flight, seatId) {
  const seat = state.flights[flight] && state.flights[flight].seats[seatId];
  if (!seat) throw new Error(`Unknown seat ${seatId} on ${flight}`);
  return seat;
}

// BR-01..04, BR-09: select or change a passenger's seat on one flight
function selectSeat(state, flight, passengerId, seatId) {
  const seat = seatOf(state, flight, seatId);
  if (!state.passengers.some((p) => p.id === passengerId)) throw new Error('Unknown passenger');
  if (seat.unavailable) throw new Error('Seat unavailable'); // BR-03
  const current = state.selections[flight];
  const holder = Object.keys(current).find((p) => current[p] === seatId);
  if (holder && holder !== passengerId) throw new Error('Seat already taken'); // BR-02
  const next = clone(state);
  next.selections[flight][passengerId] = seatId; // replaces old seat (BR-01, BR-04)
  return next;
}

function clearSeat(state, flight, passengerId) { // BR-07
  const next = clone(state);
  delete next.selections[flight][passengerId];
  return next;
}

// BR-05, BR-06
function summary(state) {
  const lines = [];
  let total = 0;
  for (const flight of Object.keys(state.flights)) {
    for (const p of state.passengers) {
      const seatId = state.selections[flight][p.id];
      const price = seatId ? TIERS[seatOf(state, flight, seatId).tier] : 0;
      total += price;
      lines.push({ flight, passengerId: p.id, passenger: p.name, seatId: seatId || null, price });
    }
  }
  return { currency: CURRENCY, lines, total };
}

// Mock inventory modelled on the example screenshot
function sampleInventory() {
  const seats = {};
  const add = (id, tier, unavailable = false) => (seats[id] = { tier, unavailable });
  ['4F', '6F'].forEach((id) => add(id, 'premium'));
  ['10C', '10D'].forEach((id) => add(id, 'xl'));
  ['11C', '11F', '11G', '12E', '12F', '12G', '13C', '13D', '13E', '14C', '14D', '14E', '14F', '14G'].forEach((id) => add(id, 'standard'));
  ['1A', '1C', '2A', '10A', '12C'].forEach((id) => add(id, 'standard', true));
  return { seats };
}

module.exports = { TIERS, createState, selectSeat, clearSeat, summary, sampleInventory };
