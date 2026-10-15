// ============================================================================
// READING ARRAYS AND LINKED LISTS FROM THE DEBUGGER
// ============================================================================
//
// Everything is read by following variablesReference handles (DAP "variables" requests),
// so the same code works with debugpy, java-debug and other debuggers.

import { Candidate, ChainSnapshot, Snapshot } from '../shared/types';
import { compareValues } from '../shared/values';
import { DapFrame, DapVariable, debuggerType, evaluate, getIndexedChildren, getLocals, getStackFrames, getVariableChildren } from './debugAdapter';
import { cleanValue } from './utils';

export const MAX_ITEMS = 64;
const MAX_EXTRAS = 4;
const MAX_LIST_EXTRAS = 8;
const MAX_LIST_FRAMES = 16;
const MAX_CANDIDATES = 12;

const NEXT_NAMES = ['next', '_next', 'nxt', 'nextnode', 'next_node'];
const HEAD_NAMES = ['head', '_head', 'first', '_first', 'headnode', 'front', 'start'];
const VALUE_NAMES = ['val', 'value', 'data', 'element', 'elem', 'item', 'key', 'info', '_val', '_value', '_data', '_element', '_key'];
const NULL_VALUES = ['None', 'null', 'undefined', 'nil'];
// Ints that are counts or values, not positions in the array
const NOT_POINTERS = ['n', 'size', 'length', 'len', 'count', 'total', 'sum', 'swaps', 'comparisons', 'steps', 'passes', 'temp', 'tmp',
	'key', 'value', 'val', 'item', 'x', 'y', 'target', 'pivot', 'pivotvalue', 'pivot_value', 'max', 'maxval', 'max_val', 'minval', 'min_val', 'gap'];
// Names people give the array to sort, ranked first
const ARRAY_NAMES = ['arr', 'a', 'array', 'nums', 'numbers', 'data', 'values', 'list', 'lst', 'items', 'v', 'vec', 'elements'];

const BOXED = /^(java\.lang\.)?(Integer|Long|Short|Byte|Double|Float|Character|Boolean)@\d+$/;

export interface Watch {
	path: string;
	kind: 'array' | 'list';
	depthFromBottom: number; // Frame where it was picked, counted from the bottom of the stack
	functionName: string;
}

// ---------------------------------------------------------------- variable helpers

function isNull(variable: DapVariable | undefined): boolean {
	return !variable || (!variable.variablesReference && NULL_VALUES.includes(String(variable.value)));
}

function pick(fields: DapVariable[], names: string[]): DapVariable | undefined {
	for (const name of names) {
		const field = fields.find(f => f.name.toLowerCase() === name);
		if (field) {
			return field;
		}
	}
	return undefined;
}

function isUsableName(name: string): boolean {
	return /^[A-Za-z_$][\w$]*$/.test(name) && !name.startsWith('__');
}

function isArrayLike(variable: DapVariable): boolean {
	const type = String(variable.type || '');
	return !!variable.variablesReference && (
		(variable.indexedVariables || 0) > 0 ||
		/\[\]$|^(list|tuple|deque|array)$|^(java\.util\.)?(ArrayList|Vector|ArrayDeque|LinkedList|List)(<.*>)?$/.test(type) ||
		(!type && /^\[.*\]$/s.test(String(variable.value)))
	);
}

function isString(variable: DapVariable): boolean {
	return variable.type === 'String' || variable.type === 'str' || variable.type === 'java.lang.String' || /^".*"$/s.test(String(variable.value));
}

function isScalar(variable: DapVariable): boolean {
	return !variable.variablesReference || BOXED.test(String(variable.value)) || isString(variable);
}

async function scalarText(variable: DapVariable): Promise<string> {
	if (variable.variablesReference && BOXED.test(String(variable.value))) {
		const inner = (await getVariableChildren(variable.variablesReference)).find(f => f.name === 'value');
		if (inner) {
			return cleanValue(inner.value);
		}
	}
	return cleanValue(variable.value);
}

/**
 * Object identity shown by the debugger: Java "Node@45", Python "<Node object at 0x10f...>"
 */
function identityOf(variable: DapVariable): string | undefined {
	const value = String(variable.value);
	return /@(\d+)(?: "|$)/.exec(value)?.[1] ?? / at (0x[0-9a-fA-F]+)>/.exec(value)?.[1];
}

function isIndexName(name: string): boolean {
	return /^\[?\d+\]?$/.test(name);
}

function shortFunctionName(frame: DapFrame): string {
	// Java: "SortDemo.bubbleSort(int[])"; Python: "bubble_sort"
	return frame.name.replace(/\(.*$/s, '').split('.').pop() || frame.name;
}

export function frameLabel(frame: DapFrame): string {
	return `${shortFunctionName(frame)}, line ${frame.line}`;
}

// ---------------------------------------------------------------- arrays

/**
 * Items of an array of numbers or strings; null when an item is an object
 */
async function readArrayValues(variable: DapVariable): Promise<{ values: string[]; length: number } | null> {
	const children = (await getIndexedChildren(variable, MAX_ITEMS))
		.filter(c => isIndexName(c.name))
		.sort((a, b) => parseInt(a.name.replace(/\D/g, ''), 10) - parseInt(b.name.replace(/\D/g, ''), 10))
		.slice(0, MAX_ITEMS);
	const values: string[] = [];
	for (const child of children) {
		if (!isScalar(child) || isNull(child)) {
			return null;
		}
		values.push(await scalarText(child));
	}
	let length = variable.indexedVariables || values.length;
	if (!variable.indexedVariables) {
		const lenField = (await getVariableChildren(variable.variablesReference)).find(f => f.name === 'len()');
		length = lenField ? parseInt(String(lenField.value), 10) || values.length : values.length;
	}
	return { values, length };
}

// ---------------------------------------------------------------- linked lists

interface NodeShape {
	next: DapVariable;
	value?: DapVariable;
}

async function nodeShape(variable: DapVariable): Promise<NodeShape | null> {
	if (!variable.variablesReference || isArrayLike(variable) || isScalar(variable)) {
		return null;
	}
	const fields = await getVariableChildren(variable.variablesReference);
	const next = pick(fields, NEXT_NAMES);
	if (!next) {
		return null;
	}
	const value = pick(fields.filter(f => f !== next && !/^prev/i.test(f.name)), VALUE_NAMES);
	return { next, value };
}

async function nodeValue(shape: NodeShape, node: DapVariable): Promise<string> {
	if (!shape.value) {
		return cleanValue(node.value);
	}
	return isScalar(shape.value) ? scalarText(shape.value) : cleanValue(shape.value.value);
}

/**
 * Follows `next` from a node. Stops at null, at the display limit, at a cycle,
 * or at a node already drawn in another list (`stopAt`).
 */
async function readChain(start: DapVariable, frameId: number, stopAt = new Set<string>()): Promise<{ values: string[]; ids: string[] | undefined; length: number; next?: string }> {
	const values: string[] = [];
	const ids: string[] = [];
	let identified = true;
	const seen = new Set<string>();
	let current: DapVariable | undefined = start;
	let walked = 0;

	while (current && !isNull(current) && walked < 1000) {
		const shape = await nodeShape(current);
		if (!shape) {
			break;
		}
		let id = identityOf(current);
		if (!id && current.evaluateName && /python|debugpy/.test(debuggerType())) {
			id = await evaluate(`id(${current.evaluateName})`, frameId);
		}
		if (id && stopAt.has(id) && !seen.has(id)) {
			return { values, ids: identified ? ids : undefined, length: walked, next: id };
		}
		if (id && seen.has(id)) {
			break;
		}
		if (id) {
			seen.add(id);
		} else {
			identified = false;
		}
		if (values.length < MAX_ITEMS) {
			values.push(await nodeValue(shape, current));
			ids.push(id || String(values.length));
		} else if (!id) {
			break;
		}
		walked++;
		current = shape.next;
	}
	return { values, ids: identified ? ids : undefined, length: walked };
}

// ---------------------------------------------------------------- resolving paths

/**
 * A dotted path ("arr", "self.items", "lst.head") read from the locals of a frame
 */
async function resolvePath(path: string, locals: DapVariable[]): Promise<DapVariable | undefined> {
	const [first, ...rest] = path.split('.');
	let current = locals.find(v => v.name === first);
	for (const segment of rest) {
		if (!current || !current.variablesReference) {
			return undefined;
		}
		current = (await getVariableChildren(current.variablesReference)).find(v => v.name === segment);
	}
	return current;
}

async function readStructure(variable: DapVariable, kind: 'array' | 'list', name: string, frameId: number, stopAt?: Set<string>): Promise<ChainSnapshot | null> {
	if (kind === 'array') {
		if (!isArrayLike(variable)) {
			return null;
		}
		const array = await readArrayValues(variable);
		return array ? { name, kind, values: array.values, length: array.length } : null;
	}
	if (isNull(variable)) {
		return { name, kind, values: [], ids: [], length: 0 };
	}
	if (!(await nodeShape(variable))) {
		return null;
	}
	const chain = await readChain(variable, frameId, stopAt);
	return { name, kind, values: chain.values, ids: chain.ids, length: chain.length, next: chain.next };
}

// ---------------------------------------------------------------- detection

/**
 * Arrays of numbers or strings and linked lists in the current frame, and in the fields
 * of its objects one level down (self.items, this.arr, list.head)
 */
export async function detectCandidates(): Promise<{ candidates: Candidate[]; frame: string; frames: DapFrame[] }> {
	const frames = await getStackFrames();
	if (!frames.length) {
		return { candidates: [], frame: '', frames };
	}
	const top = frames[0];
	const locals = (await getLocals(top.id)).filter(v => isUsableName(v.name));
	const candidates: Candidate[] = [];
	const listIds = new Set<string>();

	const consider = async (path: string, variable: DapVariable, depth: number) => {
		if (candidates.length >= MAX_CANDIDATES || !variable.variablesReference || isString(variable)) {
			return;
		}
		if (isArrayLike(variable)) {
			const array = await readArrayValues(variable);
			if (array && array.values.length > 0) {
				candidates.push({ path, kind: 'array', length: array.length, preview: preview(array.values, ', ', '[', ']', array.length) });
			}
			return;
		}
		if (await nodeShape(variable)) {
			const id = identityOf(variable);
			if (id && listIds.has(id)) {
				return;
			}
			const chain = await readChain(variable, top.id);
			chain.ids?.forEach(i => listIds.add(i));
			if (chain.values.length > 0) {
				candidates.push({ path, kind: 'list', length: chain.length, preview: preview(chain.values, ' → ', '', '', chain.length) });
			}
			return;
		}
		if (depth === 0) {
			const fields = (await getVariableChildren(variable.variablesReference)).filter(f => isUsableName(f.name));
			for (const field of fields.slice(0, 20)) {
				await consider(`${path}.${field.name}`, field, 1);
			}
		}
	};

	// Lists by their head first, so a node pointer into the middle is not offered as its own list
	const ordered = [...locals].sort((a, b) => rankName(a.name) - rankName(b.name));
	for (const variable of ordered) {
		await consider(variable.name, variable, 0);
	}
	candidates.sort((a, b) => rankName(lastSegment(a.path)) - rankName(lastSegment(b.path)) || b.length - a.length);
	return { candidates, frame: frameLabel(top), frames };
}

function lastSegment(path: string): string {
	return path.split('.').pop()!;
}

function rankName(name: string): number {
	const lower = name.toLowerCase();
	if (HEAD_NAMES.includes(lower)) {
		return 0;
	}
	const index = ARRAY_NAMES.indexOf(lower);
	return index >= 0 ? 1 + index / 100 : lower === 'self' || lower === 'this' ? 3 : 2;
}

function preview(values: string[], separator: string, open: string, close: string, length: number): string {
	const shown = values.slice(0, 8).join(separator);
	return `${open}${shown}${length > 8 ? separator + '…' : ''}${close}`;
}

// ---------------------------------------------------------------- snapshots

/**
 * Where the watched structure lives now: the frame it was picked in, while it is still
 * on the stack, else the nearest frame where the path resolves
 */
async function findMain(watch: Watch, frames: DapFrame[]): Promise<{ frame: DapFrame; variable: DapVariable; locals: DapVariable[] } | undefined> {
	const pickedIndex = frames.length - 1 - watch.depthFromBottom;
	const order: number[] = [];
	if (pickedIndex >= 0 && shortFunctionName(frames[pickedIndex]) === watch.functionName) {
		order.push(pickedIndex);
	}
	for (let i = 0; i < frames.length && order.length < 12; i++) {
		if (!order.includes(i)) {
			order.push(i);
		}
	}
	for (const index of order) {
		const locals = await getLocals(frames[index].id);
		const variable = await resolvePath(watch.path, locals);
		if (variable && (watch.kind === 'list' ? isNull(variable) || await nodeShape(variable) : isArrayLike(variable))) {
			return { frame: frames[index], variable, locals };
		}
	}
	return undefined;
}

export async function readSnapshot(watch: Watch): Promise<Snapshot> {
	const frames = await getStackFrames();
	const empty: Snapshot = { main: null, extras: [], pointers: [], nodePointers: [], vars: [], frame: '' };
	if (!frames.length) {
		return { ...empty, error: 'The program is running' };
	}
	const top = frames[0];
	const snapshot: Snapshot = { ...empty, frame: frameLabel(top) };

	const found = await findMain(watch, frames);
	if (found) {
		snapshot.main = await readStructure(found.variable, watch.kind, watch.path, found.frame.id);
		if (found.frame !== top) {
			const caller = shortFunctionName(found.frame);
			snapshot.mainFromCaller = caller === shortFunctionName(top) ? `outer call of ${caller}` : `in ${caller}`;
		}
	}
	if (!snapshot.main) {
		snapshot.error = `"${watch.path}" is not in this frame (${frameLabel(top)})`;
	}

	const topLocals = found && found.frame === top ? found.locals : (await getLocals(top.id));
	const main = snapshot.main;
	const mainIds = new Set(main?.ids || []);
	// Ints point into the main array only when the top frame works on it
	let pointersApply = !!main && main.kind === 'array' && found?.frame === top;

	const ints: { name: string; value: number }[] = [];
	for (const variable of topLocals) {
		if (!isUsableName(variable.name) || (found?.frame === top && variable.name === watch.path.split('.')[0] && !watch.path.includes('.'))) {
			continue;
		}
		if (isScalar(variable) && !isNull(variable)) {
			const text = await scalarText(variable);
			if (/^-?\d+$/.test(text) && !/^(bool|boolean)$/i.test(String(variable.type))) {
				ints.push({ name: variable.name, value: parseInt(text, 10) });
			} else if (text.length <= 24) {
				snapshot.vars.push({ name: variable.name, value: text });
			}
			continue;
		}
		if (!variable.variablesReference) {
			if (isNull(variable) && main?.kind === 'list') {
				snapshot.vars.push({ name: variable.name, value: String(variable.value) });
			}
			continue;
		}
		if (snapshot.extras.length >= MAX_EXTRAS) {
			continue;
		}
		if (isArrayLike(variable)) {
			const array = await readArrayValues(variable);
			if (!array) {
				continue;
			}
			// The same array under another name (a helper like swap(a, i, j)): its ints are positions in it
			if (main && main.kind === 'array' && found?.frame !== top && sameMultiset(array.values, main.values) && array.length === main.length) {
				pointersApply = true;
				continue;
			}
			snapshot.extras.push({ name: variable.name, kind: 'array', values: array.values, length: array.length });
		}
	}

	if (watch.kind === 'list' && found && main) {
		await readLists(snapshot, frames, topLocals, watch, found);
	}

	// With other arrays around (left, right, temp), an index could belong to any of them: show it as a value
	if (snapshot.extras.some(e => e.kind === 'array')) {
		pointersApply = false;
	}
	for (const int of ints) {
		const isPointer = pointersApply && main && !NOT_POINTERS.includes(int.name.toLowerCase())
			&& int.value >= 0 && int.value <= main.length;
		if (isPointer) {
			snapshot.pointers.push(int);
		} else {
			snapshot.vars.push({ name: int.name, value: String(int.value) });
		}
	}
	return snapshot;
}

interface NodeVar {
	name: string;
	frame: number; // Index in the call stack, 0 = top
	watched: boolean;
	ids: string[];
	values: string[];
	complete: boolean; // Followed to null (not cut at the display limit)
}

/**
 * Linked lists: every node variable of every frame (outermost first), so the nodes a recursive
 * call does not see (the other half in merge sort) stay drawn. Each row is a list from its real
 * start: a variable pointing into the middle of a list is a pointer, not a row. The row with the
 * watched variable becomes the main one, named after the variable at its start.
 */
async function readLists(snapshot: Snapshot, frames: DapFrame[], topLocals: DapVariable[], watch: Watch, found: { frame: DapFrame; variable: DapVariable }) {
	const top = frames[0];
	const nodes = new Map<string, { value: string; next: DapVariable | undefined }>();

	const follow = async (start: DapVariable, frameId: number): Promise<{ ids: string[]; values: string[]; complete: boolean } | null> => {
		const ids: string[] = [];
		const values: string[] = [];
		let current: DapVariable | undefined = start;
		while (current && !isNull(current)) {
			const id = await nodeIdentity(current, frameId);
			if (!id) {
				return null; // No identities: lists cannot be matched up
			}
			if (ids.includes(id) || ids.length >= MAX_ITEMS) {
				return { ids, values, complete: false };
			}
			let node = nodes.get(id);
			if (!node) {
				const shape = await nodeShape(current);
				if (!shape) {
					break;
				}
				node = { value: await nodeValue(shape, current), next: shape.next };
				nodes.set(id, node);
			}
			ids.push(id);
			values.push(node.value);
			current = node.next;
		}
		return { ids, values, complete: true };
	};

	// The watched variable, then the node variables of every frame
	const vars: NodeVar[] = [];
	if (!isNull(found.variable)) {
		const chain = await follow(found.variable, found.frame.id);
		if (!chain) {
			return; // Keep the plain chain read before
		}
		vars.push({ name: watch.path, frame: frames.indexOf(found.frame), watched: true, ...chain });
	}
	const scanned = frames.slice(0, MAX_LIST_FRAMES);
	for (let f = scanned.length - 1; f >= 0; f--) {
		const locals = f === 0 ? topLocals : await getLocals(scanned[f].id);
		for (const variable of locals) {
			if (!isUsableName(variable.name) || !variable.variablesReference || (scanned[f] === found.frame && variable.name === watch.path)) {
				continue;
			}
			if (!(await nodeShape(variable))) {
				continue;
			}
			const chain = await follow(variable, scanned[f].id);
			if (chain && chain.ids.length) {
				vars.push({ name: variable.name, frame: f, watched: false, ...chain });
			}
		}
	}

	// Rows start at nodes no other list leads to
	const inner = new Set<string>();
	for (const v of vars) {
		v.ids.slice(1).forEach(id => { if (id !== v.ids[0]) { inner.add(id); } });
	}
	const starts: string[] = [];
	const watchedStart = vars.find(v => v.watched)?.ids[0];
	const mainStart = watchedStart === undefined ? undefined
		: inner.has(watchedStart) ? vars.find(v => !inner.has(v.ids[0]) && v.ids.includes(watchedStart))?.ids[0] : watchedStart;
	if (mainStart) {
		starts.push(mainStart);
	}
	for (const v of vars) {
		if (!inner.has(v.ids[0]) && !starts.includes(v.ids[0])) {
			starts.push(v.ids[0]);
		}
	}

	// Who names each row: the watched variable, else one of the current frame, else the outermost
	const rank = (v: NodeVar) => (v.watched ? 0 : v.frame === 0 ? 1 : 2);
	const drawn = new Set<string>();
	const rows: ChainSnapshot[] = [];
	const labels = new Map<string, NodeVar>();
	for (const start of starts.slice(0, MAX_LIST_EXTRAS + 1)) {
		const source = vars.find(v => v.ids[0] === start)!;
		const namer = vars.filter(v => v.ids[0] === start).sort((a, b) => rank(a) - rank(b))[0];
		labels.set(start, namer);
		const ids: string[] = [];
		const values: string[] = [];
		let next: string | undefined;
		for (let i = 0; i < source.ids.length; i++) {
			if (drawn.has(source.ids[i])) {
				next = source.ids[i]; // Two lists merge here: draw an arrow to the other row
				break;
			}
			ids.push(source.ids[i]);
			values.push(source.values[i]);
		}
		ids.forEach(id => drawn.add(id));
		// A list cut at the display limit (or a cycle) is longer than what is drawn
		const length = source.complete ? ids.length : ids.length + 1;
		rows.push({ name: namer.name, key: start, kind: 'list', values, ids, length, ...(next ? { next } : {}) });
	}

	if (mainStart) {
		const [mainRow, ...others] = rows;
		snapshot.main = mainRow;
		snapshot.extras = others;
		if (mainRow.name !== watch.path) {
			snapshot.mainFromCaller = undefined;
		}
	} else {
		// The watched variable is null: an empty main list, the others around it
		snapshot.main = { name: watch.path, kind: 'list', values: [], ids: [], length: 0 };
		snapshot.extras = rows;
	}

	// Pointers: variables of the current frame (and the watched one) that do not name the row they start
	for (const v of vars) {
		const namer = labels.get(v.ids[0]);
		if ((v.frame === 0 || v.watched) && namer !== v && namer?.name !== v.name && drawn.has(v.ids[0])) {
			if (!snapshot.nodePointers.some(p => p.name === v.name && p.id === v.ids[0])) {
				snapshot.nodePointers.push({ name: v.name, id: v.ids[0] });
			}
		}
	}
}

async function nodeIdentity(variable: DapVariable, frameId: number): Promise<string | undefined> {
	return identityOf(variable) ?? (variable.evaluateName && /python|debugpy/.test(debuggerType()) ? evaluate(`id(${variable.evaluateName})`, frameId) : undefined);
}


function sameMultiset(a: string[], b: string[]): boolean {
	if (a.length !== b.length) {
		return false;
	}
	const x = [...a].sort(compareValues);
	const y = [...b].sort(compareValues);
	return x.every((v, i) => v === y[i]);
}

/**
 * Frame depth from the bottom of the stack and function name, to follow the structure
 * through recursive calls
 */
export function watchFor(path: string, kind: 'array' | 'list', frames: DapFrame[]): Watch {
	return { path, kind, depthFromBottom: Math.max(0, frames.length - 1), functionName: frames.length ? shortFunctionName(frames[0]) : '' };
}

/**
 * Kind of a variable picked in the Variables view, null when it cannot be sorted
 */
export async function classifyVariable(variable: DapVariable): Promise<'array' | 'list' | null> {
	if (isArrayLike(variable)) {
		return (await readArrayValues(variable)) ? 'array' : null;
	}
	if (await nodeShape(variable)) {
		return 'list';
	}
	return null;
}
