'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createState, selectSeat, clearSeat, summary, sampleInventory } = require('../src/seatmap');

const fresh = () => createState({
  passengers: [{ id: 'a1', name: 'Adult 1' }, { id: 'a2', name: 'Adult 2' }],
  flights: { outbound: sampleInventory(), return: sampleInventory() },
});

test('BR-06 total is 0 when nothing selected', () => assert.equal(summary(fresh()).total, 0));

test('BR-05 tier prices apply', () => {
  let s = selectSeat(fresh(), 'outbound', 'a1', '13C');
  s = selectSeat(s, 'outbound', 'a2', '4F');
  assert.equal(summary(s).total, 524.5);
});

test('BR-01/BR-04 changing seat releases the previous one', () => {
  let s = selectSeat(fresh(), 'outbound', 'a1', '13C');
  s = selectSeat(s, 'outbound', 'a1', '14D');
  assert.equal(s.selections.outbound.a1, '14D');
  s = selectSeat(s, 'outbound', 'a2', '13C'); // now free again
  assert.equal(summary(s).total, 49);
});

test('BR-02 seat cannot be shared on a flight', () => {
  const s = selectSeat(fresh(), 'outbound', 'a1', '13C');
  assert.throws(() => selectSeat(s, 'outbound', 'a2', '13C'), /taken/);
});

test('BR-03 unavailable seat rejected', () =>
  assert.throws(() => selectSeat(fresh(), 'outbound', 'a1', '1A'), /unavailable/));

test('BR-07 selection is optional and removable', () => {
  const s = clearSeat(selectSeat(fresh(), 'outbound', 'a1', '13C'), 'outbound', 'a1');
  assert.equal(summary(s).total, 0);
});

test('BR-09 flights are independent', () => {
  let s = selectSeat(fresh(), 'outbound', 'a1', '13C');
  s = selectSeat(s, 'return', 'a2', '13C');
  assert.equal(s.selections.return.a2, '13C');
  assert.equal(s.selections.outbound.a2, undefined);
});

test('state is immutable', () => {
  const s = fresh();
  selectSeat(s, 'outbound', 'a1', '13C');
  assert.equal(s.selections.outbound.a1, undefined);
});
