import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { TraceModel } from '../shared/trace';
import { Snapshot } from '../shared/types';

function snap(values: string[], extra: Partial<Snapshot> = {}): Snapshot {
	return { main: { name: 'arr', kind: 'array', values, length: values.length }, extras: [], pointers: [], nodePointers: [], vars: [], frame: 'sort, line 1', ...extra };
}

test('a swap keeps both elements and counts one swap', () => {
	const model = new TraceModel();
	const first = model.next(snap(['5', '3', '8', '1']));
	const second = model.next(snap(['3', '5', '8', '1']));
	const [a, b, c, d] = first.rows[0].items;
	assert.deepEqual(second.rows[0].items.map(i => i.id), [b.id, a.id, c.id, d.id]);
	assert.equal(second.counters.swaps, 1);
	assert.equal(second.marks[a.id], 'swap');
	assert.equal(second.marks[c.id], undefined);
	assert.equal(second.note, 'Swapped 3 and 5');
});

test('a shift copies the value from its neighbour, the key flies in from its variable', () => {
	const model = new TraceModel();
	const start = model.next(snap(['1', '5', '4'], { vars: [] }));
	const shifted = model.next(snap(['1', '5', '5'], { vars: [{ name: 'key', value: '4' }] }));
	const copy = shifted.rows[0].items[2];
	assert.equal(copy.from, start.rows[0].items[1].id, 'the copy comes from a[1]');
	assert.equal(shifted.marks[copy.id], 'write');
	assert.equal(shifted.note, 'arr[2] = 5');
	const placed = model.next(snap(['1', '4', '5'], { vars: [{ name: 'key', value: '4' }] }));
	assert.equal(placed.rows[0].items[1].from, 'var:key');
	assert.equal(placed.rows[0].items[2].id, copy.id, 'the copy stays');
	assert.ok(!shifted.sorted, '[1, 5, 5] is not done: 4 is missing');
	assert.ok(placed.sorted);
	assert.equal(placed.marks[copy.id], 'sorted');
});

test('pointers inside the array, others ignored', () => {
	const model = new TraceModel();
	const scene = model.next(snap(['3', '1', '2'], { pointers: [{ name: 'i', value: 0 }, { name: 'j', value: 3 }, { name: 'k', value: 7 }] }));
	assert.deepEqual(scene.pointers, [{ name: 'i', row: 'main', index: 0 }, { name: 'j', row: 'main', index: 3 }]);
});

test('values copied from another array fly from there', () => {
	const model = new TraceModel();
	const first = model.next(snap(['0', '0'], { extras: [{ name: 'left', kind: 'array', values: ['7'], length: 1 }] }));
	const second = model.next(snap(['7', '0'], { extras: [{ name: 'left', kind: 'array', values: ['7'], length: 1 }] }));
	assert.equal(second.rows[0].items[0].from, first.rows[1].items[0].id);
});

test('linked list nodes keep their identity; a changed next is a relink', () => {
	const model = new TraceModel();
	const list = (values: string[], ids: string[], extra: Partial<Snapshot> = {}): Snapshot => ({
		main: { name: 'head', kind: 'list', values, ids, length: values.length }, extras: [], pointers: [], nodePointers: [{ name: 'cur', id: ids[1] }], vars: [], frame: 'f', ...extra,
	});
	model.next(list(['3', '1', '2'], ['a', 'b', 'c']));
	// b moved to the front: head = b; b.next = a; a.next = c
	const relinked = model.next(list(['1', '3', '2'], ['b', 'a', 'c']));
	assert.deepEqual(relinked.rows[0].items.map(i => i.id), ['n:b', 'n:a', 'n:c']);
	assert.equal(relinked.marks['n:c'], undefined, 'c.next did not change');
	assert.equal(relinked.marks['n:a'], 'write');
	assert.equal(relinked.marks['n:b'], 'write');
	assert.equal(relinked.counters.writes, 2);
	assert.deepEqual(relinked.pointers, [{ name: 'cur', row: 'main', index: 1 }]);
	assert.match(relinked.note!, /\.next → /);
	// The list split in two rows: a.next = null, and c drawn from another variable
	const split = model.next(list(['1', '3'], ['b', 'a'], { extras: [{ name: 'rest', kind: 'list', values: ['2'], ids: ['c'], length: 1 }] }));
	assert.deepEqual(split.rows.map(r => r.items.map(i => i.id)), [['n:b', 'n:a'], ['n:c']]);
	assert.equal(split.note, '3.next → null');
	// A row that stops at a node drawn elsewhere keeps its link
	const joined = model.next(list(['1', '3'], ['b', 'a'], { extras: [{ name: 'other', kind: 'list', values: ['2'], ids: ['c'], length: 1, next: 'b' }] }));
	assert.equal(joined.note, '2.next → 1');
});

test('a missing structure shows the error, then starts again', () => {
	const model = new TraceModel();
	model.next(snap(['2', '1']));
	const missing = model.next({ main: null, extras: [], pointers: [], nodePointers: [], vars: [], frame: 'main', error: '"arr" is not in this frame' });
	assert.equal(missing.rows.length, 0);
	assert.equal(missing.note, '"arr" is not in this frame');
	const back = model.next(snap(['1', '2']));
	assert.ok(back.sorted);
});

test('a linked list is sorted only when the head reaches every node again', () => {
	const model = new TraceModel();
	const list = (values: string[], ids: string[]): Snapshot => ({
		main: { name: 'head', kind: 'list', values, ids, length: values.length }, extras: [], pointers: [], nodePointers: [], vars: [], frame: 'f',
	});
	model.next(list(['4', '2', '5'], ['a', 'b', 'c']));
	assert.ok(!model.next(list(['4', '5'], ['a', 'c'])).sorted, 'part of the list');
	assert.ok(model.next(list(['2', '4', '5'], ['b', 'a', 'c'])).sorted);
});

test('a swap through a temp variable counts as one swap', () => {
	const model = new TraceModel();
	model.next(snap(['5', '3', '8', '1']));
	model.next(snap(['5', '3', '8', '1'], { vars: [{ name: 'temp', value: '5' }] }));
	const half = model.next(snap(['3', '3', '8', '1'], { vars: [{ name: 'temp', value: '5' }] }));
	assert.equal(half.counters.writes, 1);
	const done = model.next(snap(['3', '5', '8', '1'], { vars: [{ name: 'temp', value: '5' }] }));
	assert.equal(done.counters.swaps, 1);
	assert.equal(done.counters.writes, 0);
	assert.equal(done.note, 'Swapped 5 and 3');
	assert.equal(done.rows[0].items[1].from, 'var:temp', 'the second half flies in from temp');
});
