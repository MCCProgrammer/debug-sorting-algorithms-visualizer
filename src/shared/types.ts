// ============================================================================
// SCENES: what the panel draws, shared by the debugger view and the playground
// ============================================================================

// One bar, cell or list node. The id follows the element across scenes so it can move.
export interface Item {
	id: string;
	value: string;
	empty?: boolean; // Slot left behind when an element is lifted out (insertion sort, merge sort)
	from?: string; // Item id or "var:<name>" a new element is copied from (animates from there)
}

export interface Row {
	id: string;
	label: string;
	kind: 'array' | 'list';
	items: Item[];
	offset?: number; // Column of the first item, to keep sub-arrays under the part they came from
	line?: number; // Vertical slot; rows on the same line are drawn side by side (default: row order)
	boundary?: number; // Heap sort: items from this index on are outside the heap
	small?: boolean; // Helper row (aux array, held key), drawn smaller
	next?: string; // Linked list: item id the last node links to, drawn in another row
}

export interface Pointer {
	name: string;
	row: string;
	index: number;
}

export type Mark = 'compare' | 'swap' | 'write' | 'pivot' | 'sorted' | 'dim' | 'held';

export interface Counters {
	comparisons?: number;
	swaps?: number;
	writes?: number;
	steps?: number;
}

export interface Scene {
	rows: Row[];
	pointers: Pointer[];
	vars: { name: string; value: string }[];
	marks: Record<string, Mark>; // item id -> mark
	note?: string; // What happened in this step ("Compare 5 and 3")
	line?: number; // Highlighted pseudocode line (playground)
	counters: Counters;
	sorted?: boolean;
}

// ============================================================================
// SNAPSHOTS: what the extension reads from the debugger at every stop
// ============================================================================

export interface ChainSnapshot {
	name: string; // Variable path ("arr", "self.head", "left")
	key?: string; // Row identity when several frames have a variable with the same name
	kind: 'array' | 'list';
	values: string[];
	ids?: string[]; // Linked list node identities (Java "Node@45", Python addresses)
	next?: string; // Linked list: the node after the last one, when it is drawn in another row
	length: number; // Real length (values may be cut at the display limit)
}

export interface Snapshot {
	main: ChainSnapshot | null;
	extras: ChainSnapshot[]; // Other arrays or lists in the current frame (left, right, aux, sorted...)
	pointers: { name: string; value: number }[]; // Int locals that look like indexes into the main array
	nodePointers: { name: string; id: string }[]; // Locals pointing to list nodes
	vars: { name: string; value: string }[]; // Other scalar locals (key, temp, swapped...)
	frame: string; // "bubble_sort, line 12"
	mainFromCaller?: string; // The main structure was read in a caller frame: "in main", "outer call of merge_sort"
	error?: string;
}

// Something in the current frame that can be watched
export interface Candidate {
	path: string;
	kind: 'array' | 'list';
	length: number;
	preview: string;
}

// ============================================================================
// MESSAGES between the extension and the panel
// ============================================================================

export type ToPanel =
	| { command: 'candidates'; candidates: Candidate[]; frame: string; error?: string }
	| { command: 'snapshot'; snapshot: Snapshot; path: string }
	| { command: 'status'; state: 'paused' | 'running' | 'ended' | 'none'; text: string }
	| { command: 'playing'; playing: boolean }
	| { command: 'playground'; values?: string[]; kind?: 'array' | 'list'; source?: string };

export type StepAction = 'stepOver' | 'stepInto' | 'stepOut' | 'continue';

export type FromPanel =
	| { command: 'ready' }
	| { command: 'watch'; path: string; kind: 'array' | 'list' }
	| { command: 'unwatch' }
	| { command: 'detect' }
	| { command: 'debug'; action: StepAction }
	| { command: 'play'; action: StepAction; delay: number }
	| { command: 'pause' }
	| { command: 'speed'; delay: number } // Speed changed while playing
	| { command: 'rendered'; becameSorted: boolean } // A snapshot is drawn (Play waits for it)
	| { command: 'finished' }; // A playground run reached the end
