import { describe, expect, it } from 'vitest';
import { makeInitialState, reducer, type Action, type PlanningState } from './PlanningContext';
import { S1_ORDERS } from '@/data/dispatcher-dataset';

/** Defers every order with a valid reason - the cheapest way to reach a real, checker-passing "every order decided" state without needing vehicle assignment at all. */
function deferAllOrders(state: PlanningState): PlanningState {
  let s = state;
  for (const o of S1_ORDERS) {
    s = reducer(s, { type: 'DEFER', orderRef: o.orderRef, reasonCode: 'capacity', reasonNote: 'test fixture' });
  }
  return s;
}

describe('reducer: ASSIGN authoritative feasibility (not trusted from any caller)', () => {
  it('refuses an infeasible assignment (chilled order onto an ambient vehicle) even though nothing outside the reducer checked it first', () => {
    const initial = makeInitialState();
    const next = reducer(initial, { type: 'ASSIGN', orderRef: 'S1-001', vehicleId: 'VEH037', tripNo: 1 }); // S1-001 is chilled; VEH037 is ambient
    expect(next.assignments['S1-001'].decision).toBe('unresolved');
    expect(next).toBe(initial); // true no-op, not just an unchanged field
  });

  it('accepts a feasible assignment and records it, bumping the draft revision and stop sequence', () => {
    const initial = makeInitialState();
    // VEH036 (van, reefer, available - VEH035 is in_workshop in this fixture) satisfies S1-000's van_only constraint.
    const next = reducer(initial, { type: 'ASSIGN', orderRef: 'S1-000', vehicleId: 'VEH036', tripNo: 1 });
    expect(next.assignments['S1-000'].decision).toBe('served');
    expect(next.assignments['S1-000'].vehicleId).toBe('VEH036');
    expect(next.draftRevision).toBe(initial.draftRevision + 1);
    expect(next.stopSequences['VEH036-1']).toEqual(['OUT001']);
  });
});

describe('reducer: PUBLISH recomputes eligibility from current state, ignoring any caller-supplied flag', () => {
  it('refuses to publish while orders remain unresolved', () => {
    const initial = makeInitialState();
    const next = reducer(initial, { type: 'PUBLISH', expectedRevision: initial.draftRevision });
    expect(next.releasedManifests).toHaveLength(0);
  });

  it('ignores a fabricated "canPublish" flag smuggled onto the action - the reducer never reads it', () => {
    const initial = makeInitialState(); // unresolved orders remain
    const malicious = { type: 'PUBLISH', expectedRevision: initial.draftRevision, canPublish: { noUnresolved: true, noCheckerFail: true, noUnverified: true } } as unknown as Action;
    const next = reducer(initial, malicious);
    expect(next.releasedManifests).toHaveLength(0); // still refused - the reducer recomputed for itself and found unresolved orders
  });

  it('publishes once every order has a decision, and rejects a stale expectedRevision', () => {
    const deferred = deferAllOrders(makeInitialState());
    const staleAttempt = reducer(deferred, { type: 'PUBLISH', expectedRevision: deferred.draftRevision - 1 });
    expect(staleAttempt.releasedManifests).toHaveLength(0);

    const published = reducer(deferred, { type: 'PUBLISH', expectedRevision: deferred.draftRevision });
    expect(published.releasedManifests).toHaveLength(1);
    expect(published.releasedManifests[0].revision).toBe(deferred.draftRevision);
    expect(published.releasedManifests[0].acknowledgement).toBe('pending');
  });

  it('rejects republishing an unchanged revision', () => {
    const deferred = deferAllOrders(makeInitialState());
    const published = reducer(deferred, { type: 'PUBLISH', expectedRevision: deferred.draftRevision });
    const republished = reducer(published, { type: 'PUBLISH', expectedRevision: published.draftRevision });
    expect(republished.releasedManifests).toHaveLength(1); // still just one - the second attempt was a no-op
  });

  it('a duplicate dispatch with the same stale-captured revision is a no-op even though the first one already succeeded', () => {
    const deferred = deferAllOrders(makeInitialState());
    const expectedRevision = deferred.draftRevision;
    const first = reducer(deferred, { type: 'PUBLISH', expectedRevision });
    const secondDuplicate = reducer(first, { type: 'PUBLISH', expectedRevision }); // same captured revision as before the first publish
    expect(secondDuplicate.releasedManifests).toHaveLength(1);
  });
});

describe('reducer: REORDER', () => {
  it('rewrites the stop sequence and appends a resequenced ledger entry', () => {
    const assigned1 = reducer(makeInitialState(), { type: 'ASSIGN', orderRef: 'S1-026', vehicleId: 'VEH009', tripNo: 1 }); // Gampaha ambient
    const assigned2 = reducer(assigned1, { type: 'ASSIGN', orderRef: 'S1-029', vehicleId: 'VEH009', tripNo: 1 }); // same brand/district, different outlet
    const key = 'VEH009-1';
    const before = assigned2.stopSequences[key];
    expect(before).toEqual(['OUT025', 'OUT027']);
    const reordered = reducer(assigned2, { type: 'REORDER', vehicleId: 'VEH009', tripNo: 1, newOutletOrder: ['OUT027', 'OUT025'] });
    expect(reordered.stopSequences[key]).toEqual(['OUT027', 'OUT025']);
    expect(reordered.ledger[0].action).toBe('resequenced');
    expect(reordered.draftRevision).toBe(assigned2.draftRevision + 1);
  });
});

describe('reducer: REPORT_SHORTFALL stamps manifest version at creation, not on later reads', () => {
  it('keeps the originally-stamped manifestVersionAtReport unchanged even after a later republish', () => {
    const deferred = deferAllOrders(makeInitialState());
    const publishedV1 = reducer(deferred, { type: 'PUBLISH', expectedRevision: deferred.draftRevision });
    expect(publishedV1.releasedManifests).toHaveLength(1);
    const v1 = publishedV1.releasedManifests[0].revision;

    const withShortfall = reducer(publishedV1, { type: 'REPORT_SHORTFALL', orderRef: 'S1-000' });
    const event = withShortfall.shortfallEvents.find(e => e.orderRef === 'S1-000')!;
    expect(event.manifestVersionAtReport).toBe(v1);

    // Make another change and republish to get a new, higher revision.
    const changed = reducer(withShortfall, { type: 'DEFER', orderRef: 'S1-000', reasonCode: 'other', reasonNote: 'still deferred, just re-recorded' });
    const publishedV2 = reducer(changed, { type: 'PUBLISH', expectedRevision: changed.draftRevision });
    expect(publishedV2.releasedManifests).toHaveLength(2);
    const v2 = publishedV2.releasedManifests[1].revision;
    expect(v2).toBeGreaterThan(v1);

    const eventAfter = publishedV2.shortfallEvents.find(e => e.orderRef === 'S1-000')!;
    expect(eventAfter.manifestVersionAtReport).toBe(v1); // unchanged - stamped once, at creation, not on this later render/dispatch
  });
});
