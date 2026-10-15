// ============================================================================
// PLAYGROUND ALGORITHMS
// ============================================================================
//
// Each algorithm sorts a copy of the values and records a Scene at every comparison,
// swap or move, so the panel can play it forwards and backwards.

import { Counters, Item, Mark, Pointer, Row, Scene } from './types';
import { compareValues } from './values';

export type AlgorithmId = 'bubble' | 'selection' | 'insertion' | 'merge' | 'quick' | 'heap' | 'listInsertion' | 'listMerge';

export interface AlgorithmInfo {
	id: AlgorithmId;
	name: string;
	kind: 'array' | 'list';
	complexity: string;
	best: string;
	average: string;
	worst: string;
	space: string;
	stable: boolean;
	pseudocode: string[];
}

export const ALGORITHMS: AlgorithmInfo[] = [
	{
		id: 'bubble', name: 'Bubble sort', kind: 'array', complexity: 'O(n²) time, O(1) extra space, stable',
		best: 'O(n)', average: 'O(n²)', worst: 'O(n²)', space: 'O(1)', stable: true,
		pseudocode: [
			'for i ← 0 to n − 2',
			'  swapped ← false',
			'  for j ← 0 to n − 2 − i',
			'    if a[j] > a[j + 1]',
			'      swap a[j] and a[j + 1]',
			'      swapped ← true',
			'  if not swapped: stop',
		],
	},
	{
		id: 'selection', name: 'Selection sort', kind: 'array', complexity: 'O(n²) time, O(1) extra space, not stable',
		best: 'O(n²)', average: 'O(n²)', worst: 'O(n²)', space: 'O(1)', stable: false,
		pseudocode: [
			'for i ← 0 to n − 2',
			'  min ← i',
			'  for j ← i + 1 to n − 1',
			'    if a[j] < a[min]',
			'      min ← j',
			'  swap a[i] and a[min]',
		],
	},
	{
		id: 'insertion', name: 'Insertion sort', kind: 'array', complexity: 'O(n²) time, O(n) when almost sorted, O(1) extra space, stable',
		best: 'O(n)', average: 'O(n²)', worst: 'O(n²)', space: 'O(1)', stable: true,
		pseudocode: [
			'for i ← 1 to n − 1',
			'  key ← a[i]',
			'  j ← i − 1',
			'  while j ≥ 0 and a[j] > key',
			'    a[j + 1] ← a[j]',
			'    j ← j − 1',
			'  a[j + 1] ← key',
		],
	},
	{
		id: 'merge', name: 'Merge sort', kind: 'array', complexity: 'O(n log n) time, O(n) extra space, stable',
		best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n log n)', space: 'O(n)', stable: true,
		pseudocode: [
			'mergeSort(lo, hi)',
			'  if lo ≥ hi: return',
			'  mid ← ⌊(lo + hi) / 2⌋',
			'  mergeSort(lo, mid)',
			'  mergeSort(mid + 1, hi)',
			'  copy a[lo..hi] to aux',
			'  while both halves have items',
			'    move the smaller front item to a[k]',
			'  move the remaining items to a[k]',
		],
	},
	{
		id: 'quick', name: 'Quick sort', kind: 'array', complexity: 'O(n log n) on average, O(n²) worst case, O(log n) stack, not stable',
		best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n²)', space: 'O(log n)', stable: false,
		pseudocode: [
			'quickSort(lo, hi)',
			'  if lo ≥ hi: return',
			'  pivot ← a[hi]',
			'  i ← lo',
			'  for j ← lo to hi − 1',
			'    if a[j] < pivot',
			'      swap a[i] and a[j]; i ← i + 1',
			'  swap a[i] and a[hi]',
			'  quickSort(lo, i − 1); quickSort(i + 1, hi)',
		],
	},
	{
		id: 'heap', name: 'Heap sort', kind: 'array', complexity: 'O(n log n) time, O(1) extra space, not stable',
		best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n log n)', space: 'O(1)', stable: false,
		pseudocode: [
			'build a max-heap: siftDown(i, n) for i ← n/2 − 1 down to 0',
			'for end ← n − 1 down to 1',
			'  swap a[0] and a[end]',
			'  siftDown(0, end)',
			'siftDown(i, size): while i has a child in the heap',
			'  c ← the larger child of i',
			'  if a[i] ≥ a[c]: stop',
			'  swap a[i] and a[c]; i ← c',
		],
	},
	{
		id: 'listInsertion', name: 'Insertion sort', kind: 'list', complexity: 'O(n²) time, O(1) extra space, stable',
		best: 'O(n)', average: 'O(n²)', worst: 'O(n²)', space: 'O(1)', stable: true,
		pseudocode: [
			'sorted ← null',
			'while head ≠ null',
			'  node ← head; head ← head.next',
			'  walk sorted while the next node is ≤ node',
			'  link node in there',
		],
	},
	{
		id: 'listMerge', name: 'Merge sort', kind: 'list', complexity: 'O(n log n) time, O(log n) stack, stable',
		best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n log n)', space: 'O(log n)', stable: true,
		pseudocode: [
			'mergeSort(list)',
			'  if list has 0 or 1 nodes: return list',
			'  split it in the middle (slow and fast pointers)',
			'  left ← mergeSort(first half)',
			'  right ← mergeSort(second half)',
			'  return merge(left, right)',
			'merge: link the smaller head, until a list is empty',
			'  link the rest of the other list',
		],
	},
];

interface StepOptions {
	line?: number;
	note: string;
	marks?: Record<string, Mark>;
	pointers?: Pointer[];
	vars?: Record<string, string | number | boolean>;
	range?: [number, number]; // Main row indexes in focus; the others are dimmed
}

class Tracer {
	readonly scenes: Scene[] = [];
	record = true; // false: only count (the Stats tab runs large arrays)
	steps = 0;
	readonly counters: Counters = { comparisons: 0, swaps: 0, writes: 0 };
	readonly finalIds = new Set<string>(); // Items already in their final place
	private nextId = 0;

	constructor(public rows: Row[]) {}

	newId(prefix = 'e'): string {
		return `${prefix}${this.nextId++}`;
	}

	row(id: string): Row {
		return this.rows.find(r => r.id === id)!;
	}

	cmp(a: Item, b: Item): number {
		this.counters.comparisons!++;
		return compareValues(a.value, b.value);
	}

	step(options: StepOptions, sorted = false) {
		this.steps++;
		if (!this.record) {
			return;
		}
		const marks: Record<string, Mark> = {};
		const main = this.rows[0];
		if (options.range) {
			const [lo, hi] = options.range;
			main.items.forEach((item, index) => {
				if (index < lo || index > hi) {
					marks[item.id] = 'dim';
				}
			});
		}
		for (const id of this.finalIds) {
			marks[id] = 'sorted';
		}
		Object.assign(marks, options.marks || {});
		this.scenes.push({
			rows: this.rows.map(r => ({ ...r, items: r.items.map(i => ({ ...i })) })),
			pointers: options.pointers || [],
			vars: Object.entries(options.vars || {}).map(([name, value]) => ({ name, value: String(value) })),
			marks,
			note: options.note,
			line: options.line,
			counters: { ...this.counters },
			sorted,
		});
		// A copied item only flies in from its source in the scene where it appears
		for (const row of this.rows) {
			for (const item of row.items) {
				delete item.from;
			}
		}
	}

	finish() {
		for (const row of this.rows) {
			for (const item of row.items) {
				if (!item.empty) {
					this.finalIds.add(item.id);
				}
			}
		}
		const { comparisons, swaps, writes } = this.counters;
		const parts = [`${comparisons} comparisons`];
		const list = this.rows[0]?.kind === 'list';
		if (swaps) { parts.push(`${swaps} swaps`); }
		if (writes) { parts.push(`${writes} ${list ? 'relinks' : 'moves'}`); }
		this.step({ note: `Sorted: ${parts.join(', ')}` }, true);
	}
}

function show(item: Item): string {
	return item.value;
}

function p(name: string, row: string, index: number): Pointer {
	return { name, row, index };
}

// ---------------------------------------------------------------- arrays

function arrayTracer(values: string[]): Tracer {
	const t = new Tracer([]);
	t.rows.push({ id: 'a', label: 'a', kind: 'array', items: values.map(value => ({ id: t.newId(), value })) });
	return t;
}

function swap(t: Tracer, i: number, j: number) {
	const a = t.row('a').items;
	[a[i], a[j]] = [a[j], a[i]];
	t.counters.swaps!++;
}

function bubble(t: Tracer) {
	const a = t.row('a').items;
	const n = a.length;
	for (let i = 0; i < n - 1; i++) {
		let swapped = false;
		for (let j = 0; j < n - 1 - i; j++) {
			const pointers = [p('j', 'a', j), p('j+1', 'a', j + 1)];
			const bigger = t.cmp(a[j], a[j + 1]) > 0;
			t.step({ line: 4, note: `Compare ${show(a[j])} and ${show(a[j + 1])}: ${bigger ? 'swap them' : 'keep them'}`, marks: { [a[j].id]: 'compare', [a[j + 1].id]: 'compare' }, pointers, vars: { i, swapped } });
			if (bigger) {
				swap(t, j, j + 1);
				swapped = true;
				t.step({ line: 5, note: `Swap: ${show(a[j + 1])} moves right`, marks: { [a[j].id]: 'swap', [a[j + 1].id]: 'swap' }, pointers, vars: { i, swapped } });
			}
		}
		t.finalIds.add(a[n - 1 - i].id);
		if (!swapped) {
			t.step({ line: 7, note: 'No swaps in this pass: everything is in order', vars: { i, swapped } });
			break;
		}
	}
	t.finish();
}

function selection(t: Tracer) {
	const a = t.row('a').items;
	const n = a.length;
	for (let i = 0; i < n - 1; i++) {
		let min = i;
		t.step({ line: 2, note: `Find the smallest item from position ${i} on`, marks: { [a[min].id]: 'pivot' }, pointers: [p('i', 'a', i), p('min', 'a', min)] });
		for (let j = i + 1; j < n; j++) {
			const smaller = t.cmp(a[j], a[min]) < 0;
			t.step({ line: 4, note: `Compare ${show(a[j])} with the smallest so far, ${show(a[min])}`, marks: { [a[j].id]: 'compare', [a[min].id]: 'pivot' }, pointers: [p('i', 'a', i), p('min', 'a', min), p('j', 'a', j)] });
			if (smaller) {
				min = j;
				t.step({ line: 5, note: `${show(a[min])} is the new smallest`, marks: { [a[min].id]: 'pivot' }, pointers: [p('i', 'a', i), p('min', 'a', min), p('j', 'a', j)] });
			}
		}
		if (min !== i) {
			swap(t, i, min);
			t.step({ line: 6, note: `Swap ${show(a[i])} into position ${i}`, marks: { [a[i].id]: 'swap', [a[min].id]: 'swap' }, pointers: [p('i', 'a', i), p('min', 'a', min)] });
		} else {
			t.step({ line: 6, note: `${show(a[i])} is already in place`, marks: { [a[i].id]: 'pivot' }, pointers: [p('i', 'a', i), p('min', 'a', min)] });
		}
		t.finalIds.add(a[i].id);
	}
	t.finish();
}

function insertion(t: Tracer) {
	const main = t.row('a');
	const held: Row = { id: 'key', label: 'key', kind: 'array', items: [], small: true, line: 0 };
	main.line = 1;
	t.rows.push(held);
	const a = main.items;
	const n = a.length;
	const gap: Item = { id: 'gap', value: '', empty: true };
	for (let i = 1; i < n; i++) {
		const key = a[i];
		a[i] = gap;
		held.items = [key];
		held.offset = i;
		t.step({ line: 2, note: `Take ${show(key)} out: it goes in the sorted part on its left`, marks: { [key.id]: 'held' }, pointers: [p('i', 'a', i)], vars: { key: key.value } });
		let j = i - 1;
		while (j >= 0) {
			const bigger = t.cmp(a[j], key) > 0;
			t.step({ line: 4, note: `${show(a[j])} > ${show(key)}? ${bigger ? 'yes: shift it right' : 'no: the place is found'}`, marks: { [a[j].id]: 'compare', [key.id]: 'held' }, pointers: [p('i', 'a', i), p('j', 'a', j)], vars: { key: key.value } });
			if (!bigger) {
				break;
			}
			a[j + 1] = a[j];
			a[j] = gap;
			held.offset = j;
			t.counters.writes!++;
			t.step({ line: 5, note: `Shift ${show(a[j + 1])} one place right`, marks: { [a[j + 1].id]: 'write', [key.id]: 'held' }, pointers: [p('i', 'a', i), p('j', 'a', j)], vars: { key: key.value } });
			j--;
		}
		a[j + 1] = key;
		held.items = [];
		t.counters.writes!++;
		t.step({ line: 7, note: `Put ${show(key)} at position ${j + 1}`, marks: { [key.id]: 'write' }, pointers: [p('i', 'a', i)], vars: { key: key.value } });
	}
	t.rows.splice(t.rows.indexOf(held), 1);
	main.line = undefined;
	t.finish();
}

function merge(t: Tracer) {
	const main = t.row('a');
	const a = main.items;
	const aux: Row = { id: 'aux', label: 'aux', kind: 'array', items: [], small: true };
	t.rows.push(aux);

	const sort = (lo: number, hi: number) => {
		if (lo >= hi) {
			return;
		}
		const mid = Math.floor((lo + hi) / 2);
		t.step({ line: 3, note: `Sort a[${lo}..${hi}]: split it at ${mid}`, range: [lo, hi], pointers: [p('lo', 'a', lo), p('mid', 'a', mid), p('hi', 'a', hi)] });
		sort(lo, mid);
		sort(mid + 1, hi);

		// Copy the two sorted halves down, leaving empty slots behind
		aux.offset = lo;
		aux.items = a.slice(lo, hi + 1);
		for (let k = lo; k <= hi; k++) {
			a[k] = { id: `slot${k}`, value: '', empty: true };
		}
		t.step({ line: 6, note: `Merge a[${lo}..${mid}] and a[${mid + 1}..${hi}]`, range: [lo, hi] });

		let i = 0;
		let j = mid + 1 - lo;
		const left = mid - lo;
		const right = hi - lo;
		for (let k = lo; k <= hi; k++) {
			let takeLeft: boolean;
			const pointers = [p('k', 'a', k)];
			if (i <= left) { pointers.push(p('i', 'aux', i)); }
			if (j <= right) { pointers.push(p('j', 'aux', j)); }
			const both = i <= left && j <= right;
			if (both) {
				takeLeft = t.cmp(aux.items[i], aux.items[j]) <= 0;
				t.step({ line: 7, note: `Compare ${show(aux.items[i])} and ${show(aux.items[j])}: take ${show(takeLeft ? aux.items[i] : aux.items[j])}`, range: [lo, hi], marks: { [aux.items[i].id]: 'compare', [aux.items[j].id]: 'compare' }, pointers });
			} else {
				takeLeft = i <= left;
			}
			const from = takeLeft ? i++ : j++;
			const item = aux.items[from];
			aux.items[from] = { id: `aux${lo + from}`, value: '', empty: true };
			a[k] = item;
			t.counters.writes!++;
			t.step({ line: both ? 8 : 9, note: `${show(item)} goes to a[${k}]`, range: [lo, hi], marks: { [item.id]: 'write' }, pointers: [p('k', 'a', k)] });
		}
		aux.items = [];
	};

	sort(0, a.length - 1);
	t.rows.splice(t.rows.indexOf(aux), 1);
	t.finish();
}

function quick(t: Tracer) {
	const a = t.row('a').items;
	const sort = (lo: number, hi: number) => {
		if (lo > hi) {
			return;
		}
		if (lo === hi) {
			t.finalIds.add(a[lo].id);
			t.step({ line: 2, note: `a[${lo}] alone is in its final place`, range: [lo, hi], pointers: [p('lo', 'a', lo)] });
			return;
		}
		const pivot = a[hi];
		t.step({ line: 3, note: `Partition a[${lo}..${hi}] around the pivot ${show(pivot)}`, range: [lo, hi], marks: { [pivot.id]: 'pivot' }, pointers: [p('lo', 'a', lo), p('hi', 'a', hi)] });
		let i = lo;
		for (let j = lo; j < hi; j++) {
			const smaller = t.cmp(a[j], pivot) < 0;
			t.step({ line: 6, note: `${show(a[j])} < ${show(pivot)}? ${smaller ? 'yes: move it to the left part' : 'no: leave it'}`, range: [lo, hi], marks: { [pivot.id]: 'pivot', [a[j].id]: 'compare' }, pointers: [p('i', 'a', i), p('j', 'a', j)] });
			if (smaller) {
				if (i !== j) {
					swap(t, i, j);
					t.step({ line: 7, note: `Swap ${show(a[i])} and ${show(a[j])}`, range: [lo, hi], marks: { [pivot.id]: 'pivot', [a[i].id]: 'swap', [a[j].id]: 'swap' }, pointers: [p('i', 'a', i), p('j', 'a', j)] });
				}
				i++;
			}
		}
		if (i !== hi) {
			swap(t, i, hi);
		}
		t.finalIds.add(pivot.id);
		t.step({ line: 8, note: `The pivot ${show(pivot)} goes to position ${i}, its final place`, range: [lo, hi], marks: { [pivot.id]: 'swap' }, pointers: [p('i', 'a', i)] });
		sort(lo, i - 1);
		sort(i + 1, hi);
	};
	sort(0, a.length - 1);
	t.finish();
}

function heap(t: Tracer) {
	const main = t.row('a');
	const a = main.items;
	const n = a.length;
	const siftDown = (start: number, size: number) => {
		let i = start;
		while (2 * i + 1 < size) {
			let c = 2 * i + 1;
			if (c + 1 < size) {
				const rightBigger = t.cmp(a[c + 1], a[c]) > 0;
				t.step({ line: 6, note: `Children of ${show(a[i])}: ${show(a[c])} and ${show(a[c + 1])}`, marks: { [a[i].id]: 'pivot', [a[c].id]: 'compare', [a[c + 1].id]: 'compare' }, pointers: [p('i', 'a', i), p('c', 'a', rightBigger ? c + 1 : c)] });
				if (rightBigger) {
					c++;
				}
			}
			const inOrder = t.cmp(a[i], a[c]) >= 0;
			t.step({ line: 7, note: `${show(a[i])} ≥ ${show(a[c])}? ${inOrder ? 'yes: stop' : 'no: swap them'}`, marks: { [a[i].id]: 'compare', [a[c].id]: 'compare' }, pointers: [p('i', 'a', i), p('c', 'a', c)] });
			if (inOrder) {
				return;
			}
			swap(t, i, c);
			t.step({ line: 8, note: `Swap: ${show(a[c])} sinks down`, marks: { [a[i].id]: 'swap', [a[c].id]: 'swap' }, pointers: [p('i', 'a', c)] });
			i = c;
		}
	};

	main.boundary = n;
	t.step({ line: 1, note: 'Turn the array into a max-heap: every parent ≥ its children' });
	for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
		siftDown(i, n);
	}
	for (let end = n - 1; end >= 1; end--) {
		swap(t, 0, end);
		main.boundary = end;
		t.finalIds.add(a[end].id);
		t.step({ line: 3, note: `The largest, ${show(a[end])}, goes to the end`, marks: { [a[0].id]: 'swap', [a[end].id]: 'swap' }, pointers: [p('end', 'a', end)] });
		siftDown(0, end);
	}
	main.boundary = undefined;
	t.finish();
}

// ---------------------------------------------------------------- linked lists

function listInsertion(t: Tracer) {
	const input = t.row('a');
	input.label = 'head';
	input.kind = 'list';
	input.line = 0;
	const node: Row = { id: 'node', label: 'node', kind: 'list', items: [], small: true, line: 1 };
	const sorted: Row = { id: 'sorted', label: 'sorted', kind: 'list', items: [], line: 2 };
	t.rows.push(node, sorted);
	t.step({ line: 1, note: 'Start with an empty sorted list' });

	while (input.items.length) {
		const current = input.items.shift()!;
		node.items = [current];
		node.offset = 0;
		t.step({ line: 3, note: `Unlink ${show(current)} from the front of the list`, marks: { [current.id]: 'held' } });
		let place = 0;
		while (place < sorted.items.length) {
			const smallerOrEqual = t.cmp(sorted.items[place], current) <= 0;
			node.offset = place;
			t.step({ line: 4, note: `${show(sorted.items[place])} ≤ ${show(current)}? ${smallerOrEqual ? 'yes: keep walking' : 'no: link it before'}`, marks: { [current.id]: 'held', [sorted.items[place].id]: 'compare' }, pointers: [p('cur', 'sorted', place)] });
			if (!smallerOrEqual) {
				break;
			}
			place++;
		}
		node.items = [];
		sorted.items.splice(place, 0, current);
		t.counters.writes!++;
		t.step({ line: 5, note: `Link ${show(current)} in at position ${place}`, marks: { [current.id]: 'write' } });
	}
	t.rows = [sorted];
	sorted.line = undefined;
	t.finish();
}

function listMerge(t: Tracer) {
	const first = t.row('a');
	first.kind = 'list';
	first.label = 'head';
	first.line = 0;
	first.offset = 0;
	let rowCount = 0;
	const GAP = 0.6; // Columns between two halves, room for the null arrow

	const sort = (row: Row, depth: number): Row => {
		if (row.items.length <= 1) {
			return row;
		}
		const half = Math.ceil(row.items.length / 2);
		const left: Row = { id: `r${++rowCount}`, label: 'left', kind: 'list', items: row.items.slice(0, half), line: depth + 1, offset: row.offset, small: true };
		const right: Row = { id: `r${++rowCount}`, label: 'right', kind: 'list', items: row.items.slice(half), line: depth + 1, offset: (row.offset || 0) + half + GAP, small: true };
		const at = t.rows.indexOf(row);
		t.rows.splice(at, 1, left, right);
		t.step({ line: 3, note: `Split ${row.items.map(show).join(' → ')} in the middle` });

		const sortedLeft = sort(left, depth + 1);
		const sortedRight = sort(right, depth + 1);
		sortedLeft.label = 'left';
		sortedRight.label = 'right';

		// Merge into a new list on the parent's line
		const merged: Row = { id: `r${++rowCount}`, label: depth === 0 ? 'head' : 'merged', kind: 'list', items: [], line: depth, offset: row.offset, small: depth > 0 };
		t.rows.splice(t.rows.indexOf(sortedLeft), 0, merged);
		while (sortedLeft.items.length && sortedRight.items.length) {
			const takeLeft = t.cmp(sortedLeft.items[0], sortedRight.items[0]) <= 0;
			t.step({ line: 7, note: `Compare the heads ${show(sortedLeft.items[0])} and ${show(sortedRight.items[0])}: link ${show(takeLeft ? sortedLeft.items[0] : sortedRight.items[0])}`, marks: { [sortedLeft.items[0].id]: 'compare', [sortedRight.items[0].id]: 'compare' } });
			const item = (takeLeft ? sortedLeft : sortedRight).items.shift()!;
			merged.items.push(item);
			t.counters.writes!++;
			t.step({ line: 7, note: `${show(item)} is linked at the end of the merged list`, marks: { [item.id]: 'write' } });
		}
		const rest = sortedLeft.items.length ? sortedLeft : sortedRight;
		const marks: Record<string, Mark> = {};
		rest.items.forEach(i => { marks[i.id] = 'write'; });
		merged.items.push(...rest.items);
		rest.items = [];
		t.rows.splice(t.rows.indexOf(sortedLeft), 1);
		t.rows.splice(t.rows.indexOf(sortedRight), 1);
		if (Object.keys(marks).length) {
			t.counters.writes!++;
			t.step({ line: 8, note: 'Link the rest of the other list', marks });
		}
		return merged;
	};

	const result = sort(first, 0);
	result.line = undefined;
	result.offset = undefined;
	t.rows = [result];
	t.finish();
}

const RUNNERS: Record<AlgorithmId, (t: Tracer) => void> = {
	bubble, selection, insertion, merge, quick, heap, listInsertion, listMerge,
};

/**
 * Runs an algorithm on the values and returns every scene, the first one being the input
 */
export function runAlgorithm(id: AlgorithmId, values: string[]): Scene[] {
	return trace(id, values, true).scenes;
}

/**
 * Only the counts, without recording scenes: fast enough for hundreds of values
 */
export function countAlgorithm(id: AlgorithmId, values: string[]): Counters {
	const t = trace(id, values, false);
	return { ...t.counters, steps: t.steps };
}

function trace(id: AlgorithmId, values: string[], record: boolean): Tracer {
	const t = arrayTracer(values);
	t.record = record;
	const info = ALGORITHMS.find(a => a.id === id)!;
	if (info.kind === 'list') {
		t.rows[0].kind = 'list';
		t.rows[0].label = 'head';
	}
	t.step({ note: `${info.name}: ${values.length} items` });
	if (values.length < 2) {
		t.finish();
		return t;
	}
	RUNNERS[id](t);
	return t;
}
