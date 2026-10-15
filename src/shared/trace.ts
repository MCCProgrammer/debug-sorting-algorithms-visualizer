// ============================================================================
// DEBUGGER TRACE: turns the snapshot read at every stop into a scene
// ============================================================================
//
// The debugger only shows values, not what the code did. Array elements get their identity
// by matching the new values against the previous ones (same place, then the nearest equal
// value), so swaps and shifts animate as moves, and overwritten cells as copies flying in
// from where the value came from. Linked list nodes keep the identity the debugger shows.

import { ChainSnapshot, Item, Mark, Pointer, Row, Scene, Snapshot } from './types';
import { compareValues, isSorted } from './values';

interface Matched {
	items: Item[];
	moved: Set<string>;
	written: Set<string>;
	swaps: number;
}

export class TraceModel {
	private last = new Map<string, Item[]>();
	private nextId = 0;
	private steps = 0;
	private swaps = 0;
	private writes = 0;
	// A copy inside the array (a[j] = a[j + 1]) that may be the first half of a swap through a temp variable
	private pendingCopy: { to: number; from: number; before: string[] } | undefined;
	private lastNext = new Map<string, string | null>(); // Linked list node -> the node its next points to
	private original: string | undefined; // Sorted values of the first snapshot
	private originalLength = 0;

	reset() {
		this.last.clear();
		this.steps = this.swaps = this.writes = 0;
		this.pendingCopy = undefined;
		this.original = undefined;
	}

	next(snapshot: Snapshot): Scene {
		this.steps++;
		const chains: { rowId: string; chain: ChainSnapshot; main: boolean }[] = [];
		if (snapshot.main) {
			chains.push({ rowId: 'main', chain: snapshot.main, main: true });
		}
		for (const extra of snapshot.extras) {
			chains.push({ rowId: 'x:' + (extra.key ?? extra.name), chain: extra, main: false });
		}

		// Items of the previous scene, to find where copied values come from
		const previousAll: { item: Item; row: string; index: number }[] = [];
		for (const [row, items] of this.last) {
			items.forEach((item, index) => previousAll.push({ item, row, index }));
		}

		const rows: Row[] = [];
		const marks: Record<string, Mark> = {};
		const changes: string[] = [];
		let mainSwaps = 0;
		let mainWrites = 0;

		for (const { rowId, chain, main } of chains) {
			const previous = this.last.get(rowId);
			const matched = chain.kind === 'list' && chain.ids
				? this.matchNodes(chain, previousAll)
				: this.matchValues(previous, chain.values, previousAll.filter(p => p.row !== rowId), snapshot.vars);
			const label = main && snapshot.mainFromCaller ? `${chain.name} (${snapshot.mainFromCaller})` : chain.name;
			rows.push({ id: rowId, label, kind: chain.kind, items: matched.items, small: !main, ...(chain.next ? { next: 'n:' + chain.next } : {}) });
			this.last.set(rowId, matched.items.map(i => ({ id: i.id, value: i.value })));
			if (previous) {
				for (const id of matched.moved) { marks[id] = 'swap'; }
				for (const id of matched.written) { marks[id] = 'write'; }
			}
			if (main && previous && chain.kind === 'array') {
				mainSwaps = matched.swaps;
				mainWrites = matched.written.size + matched.moved.size - 2 * matched.swaps;
				const swapped = chain.kind === 'array' ? this.swapThroughTemp(previous, matched) : undefined;
				if (swapped) {
					mainSwaps++;
					mainWrites = -1; // The first half was counted as a write
					changes.push(swapped);
				} else {
					changes.push(...describeChanges(chain, matched));
				}
			}
		}
		// Linked lists: a node was relinked when its next changed (one `node.next = ...` each)
		if (snapshot.main?.kind === 'list') {
			const relinked = this.relinks(chains.map(c => c.chain), rows);
			for (const id of relinked) { marks[id] = 'write'; }
			mainWrites = relinked.length;
			const valueOf = new Map(rows.flatMap(r => r.items.map(i => [i.id, i.value] as const)));
			const next = (id: string) => this.lastNext.get(id);
			if (relinked.length && relinked.length <= 2) {
				changes.push(...relinked.map(id => `${valueOf.get(id)}.next → ${next(id) ? valueOf.get(next(id)!) ?? '?' : 'null'}`));
			} else if (relinked.length) {
				changes.push(`${relinked.length} nodes relinked`);
			}
		}
		// Rows that left the frame are forgotten, so they start fresh if they come back
		for (const rowId of [...this.last.keys()]) {
			if (!chains.some(c => c.rowId === rowId)) {
				this.last.delete(rowId);
			}
		}
		this.swaps += mainSwaps;
		this.writes = Math.max(0, this.writes + mainWrites);

		const pointers: Pointer[] = [];
		const mainRow = rows.find(r => r.id === 'main');
		if (mainRow) {
			for (const pointer of snapshot.pointers) {
				if (pointer.value >= 0 && pointer.value <= mainRow.items.length) {
					pointers.push({ name: pointer.name, row: 'main', index: pointer.value });
				}
			}
		}
		for (const nodePointer of snapshot.nodePointers) {
			for (const row of rows) {
				const index = row.items.findIndex(i => i.id === 'n:' + nodePointer.id);
				if (index >= 0) {
					pointers.push({ name: nodePointer.name, row: row.id, index });
					break;
				}
			}
		}

		// Sorted only with the values it started with: [1, 5, 5] in the middle of a shift is not done,
		// and neither is a linked list whose head now only reaches part of the nodes.
		// An array that grows or shrinks (the program added values) starts a new reference.
		const main = snapshot.main;
		const multiset = main ? [...main.values].sort(compareValues).join('\u0000') : undefined;
		if (main && (this.original === undefined || (main.kind === 'array' && this.originalLength !== main.values.length))) {
			this.original = multiset;
			this.originalLength = main.values.length;
		}
		const sorted = !!mainRow && !!main && main.values.length > 1 && main.values.length === main.length
			&& multiset === this.original && isSorted(main.values);
		if (sorted) {
			for (const item of mainRow!.items) {
				marks[item.id] = 'sorted';
			}
		}

		return {
			rows,
			pointers,
			vars: snapshot.vars,
			marks,
			note: snapshot.error || (sorted ? `Sorted! ${changes.join(', ')}`.replace(/! $/, '!') : changes.join(', ')),
			counters: { steps: this.steps, swaps: this.swaps, writes: this.writes },
			sorted,
		};
	}

	/**
	 * temp = a[i]; a[i] = a[j]; a[j] = temp: the two writes make one swap
	 */
	private swapThroughTemp(previous: Item[], matched: Matched): string | undefined {
		const before = previous.map(i => i.value);
		const after = matched.items.map(i => i.value);
		const changed = after.map((v, i) => (v !== before[i] ? i : -1)).filter(i => i >= 0);
		if (changed.length === 0 && after.length === before.length) {
			return undefined; // Nothing happened on this line: keep waiting for the second half
		}
		const pending = this.pendingCopy;
		this.pendingCopy = undefined;
		if (changed.length !== 1 || after.length !== before.length) {
			return undefined;
		}
		const index = changed[0];
		if (pending && index === pending.from && after[pending.to] === pending.before[pending.from] && after[pending.from] === pending.before[pending.to]) {
			return `Swapped ${pending.before[pending.to]} and ${pending.before[pending.from]}`;
		}
		// A copy of another cell: remember it, the next write may complete a swap
		const copy = matched.items[index];
		const source = copy.from ? previous.findIndex(i => i.id === copy.from) : -1;
		if (source >= 0) {
			this.pendingCopy = { to: index, from: source, before };
		}
		return undefined;
	}

	private matchValues(previous: Item[] | undefined, values: string[], otherRows: { item: Item; row: string; index: number }[], vars: { name: string; value: string }[]): Matched {
		const result: Matched = { items: [], moved: new Set(), written: new Set(), swaps: 0 };
		if (!previous) {
			result.items = values.map(value => ({ id: this.newId(), value }));
			return result;
		}
		const used = new Set<number>();
		const items: (Item | undefined)[] = new Array(values.length);
		const movedFrom = new Map<number, number>(); // new index -> old index

		// 1. Same place, same value
		values.forEach((value, i) => {
			if (i < previous.length && previous[i].value === value) {
				items[i] = { id: previous[i].id, value };
				used.add(i);
			}
		});
		// 2. Moved: the nearest unused previous element with the same value
		values.forEach((value, i) => {
			if (items[i]) {
				return;
			}
			let best = -1;
			previous.forEach((old, k) => {
				if (!used.has(k) && old.value === value && (best < 0 || Math.abs(k - i) < Math.abs(best - i))) {
					best = k;
				}
			});
			if (best >= 0) {
				used.add(best);
				items[i] = { id: previous[best].id, value };
				result.moved.add(previous[best].id);
				movedFrom.set(i, best);
			}
		});
		// 3. Written: a new element, copied from where that value was (same row, other rows, a variable)
		values.forEach((value, i) => {
			if (items[i]) {
				return;
			}
			const item: Item = { id: this.newId(), value };
			let source = -1;
			previous.forEach((old, k) => {
				if (old.value === value && k !== i && (source < 0 || Math.abs(k - i) < Math.abs(source - i))) {
					source = k;
				}
			});
			if (source >= 0) {
				item.from = previous[source].id;
			} else {
				const other = otherRows.find(o => o.item.value === value);
				const variable = vars.find(v => v.value === value);
				if (other) {
					item.from = other.item.id;
				} else if (variable) {
					item.from = 'var:' + variable.name;
				}
			}
			items[i] = item;
			result.written.add(item.id);
		});
		// Swaps: two elements that exchanged places
		for (const [to, from] of movedFrom) {
			if (to < from && movedFrom.get(from) === to) {
				result.swaps++;
			}
		}
		result.items = items as Item[];
		return result;
	}

	private matchNodes(chain: ChainSnapshot, previousAll: { item: Item; row: string; index: number }[]): Matched {
		const result: Matched = { items: [], moved: new Set(), written: new Set(), swaps: 0 };
		const previousById = new Map(previousAll.map(p => [p.item.id, p]));
		chain.values.forEach((value, i) => {
			const id = 'n:' + chain.ids![i];
			const before = previousById.get(id);
			if (before && before.item.value !== value) {
				result.written.add(id);
			}
			result.items.push({ id, value });
		});
		return result;
	}

	/**
	 * Nodes whose next pointer changed since the last stop; remembers the new pointers
	 */
	private relinks(chains: ChainSnapshot[], rows: Row[]): string[] {
		const next = new Map<string, string | null>();
		for (const chain of chains) {
			if (chain.kind !== 'list' || !chain.ids) {
				continue;
			}
			const ids = chain.ids.map(id => 'n:' + id);
			ids.forEach((id, i) => {
				if (i < ids.length - 1) {
					next.set(id, ids[i + 1]);
				} else if (chain.next) {
					next.set(id, 'n:' + chain.next);
				} else if (chain.length === chain.values.length) {
					next.set(id, null);
				}
			});
		}
		const drawn = new Set(rows.flatMap(r => r.items.map(i => i.id)));
		const relinked = [...next.keys()].filter(id => drawn.has(id) && this.lastNext.has(id) && this.lastNext.get(id) !== next.get(id));
		this.lastNext = next;
		return relinked;
	}

	private newId(): string {
		return 't' + this.nextId++;
	}
}

function describeChanges(chain: ChainSnapshot, matched: Matched): string[] {
	const byId = new Map(matched.items.map((item, index) => [item.id, { item, index }]));
	const total = matched.moved.size + matched.written.size;
	if (!total) {
		return [];
	}
	if (matched.swaps === 1 && matched.moved.size === 2 && matched.written.size === 0) {
		const [a, b] = [...matched.moved].map(id => byId.get(id)!.item.value);
		return [`Swapped ${a} and ${b}`];
	}
	if (total <= 2) {
		return [...matched.moved, ...matched.written]
			.map(id => byId.get(id)!)
			.sort((x, y) => x.index - y.index)
			.map(({ item, index }) => `${chain.name}[${index}] = ${item.value}`);
	}
	return [`${total} items changed`];
}

function capitalize(text: string): string {
	return text.charAt(0).toUpperCase() + text.slice(1);
}
