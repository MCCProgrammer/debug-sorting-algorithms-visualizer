// ============================================================================
// PANEL UI: "Your code" (the debugger) and "Playground" (built-in algorithms)
// ============================================================================

import { ALGORITHMS, AlgorithmId, countAlgorithm, runAlgorithm } from '../shared/algorithms';
import { algorithmCode, CodeLanguage } from '../shared/code';
import { TraceModel } from '../shared/trace';
import { Candidate, FromPanel, Scene, Snapshot, StepAction, ToPanel } from '../shared/types';
import { compareValues, parseValues, randomValues } from '../shared/values';
import { Stage, View } from './stage';

declare function acquireVsCodeApi(): { postMessage(message: FromPanel): void; getState(): any; setState(state: any): void };

const vscode = acquireVsCodeApi();

type Tab = 'debug' | 'playground' | 'stats';
type StatsOrder = 'random' | 'nearly' | 'reversed' | 'sorted';

interface SavedState {
	tab: Tab;
	codeView: 'pseudo' | CodeLanguage;
	statsSize: number;
	statsOrder: StatsOrder;
	view: View;
	debugSpeed: number;
	playgroundSpeed: number;
	playAction: StepAction;
	algorithm: AlgorithmId;
	input: string;
}

const saved: SavedState = {
	tab: 'debug',
	codeView: 'pseudo',
	statsSize: 100,
	statsOrder: 'random',
	view: 'bars',
	debugSpeed: 50,
	playgroundSpeed: 55,
	playAction: 'stepOver',
	algorithm: 'bubble',
	input: '38 27 43 3 9 82 10',
	...(vscode.getState() || {}),
};

function save(changes: Partial<SavedState>) {
	Object.assign(saved, changes);
	vscode.setState(saved);
}

function post(message: FromPanel) {
	vscode.postMessage(message);
}

// Speed slider (0-100) to the pause between steps (3 s at the slow end) and the animation
// length: the slower the speed, the slower the values move
function delayFor(speed: number): number {
	return Math.round(60 + 2900 * Math.pow(1 - speed / 100, 2));
}

function durationFor(speed: number): number {
	return Math.min(1100, Math.round(delayFor(speed) * 0.7));
}

const MIN_SIZE = 2;
const MAX_PLAYGROUND_SIZE = 40;
const MAX_STATS_SIZE = 500;

const LEGEND = '<div class="legend"><span class="compare">compared</span><span class="swap">moved</span><span class="write">written</span><span class="pivot">pivot / min</span><span class="held">held</span><span class="sorted">in place</span></div>';

document.getElementById('app')!.innerHTML = `
<header class="topbar">
	<nav class="tabs" role="tablist">
		<button class="tab" role="tab" data-tab="debug">Your code</button>
		<button class="tab" role="tab" data-tab="playground">Playground</button>
		<button class="tab" role="tab" data-tab="stats">Stats</button>
	</nav>
	<div class="view-toggle" role="group" aria-label="Draw values as">
		<button data-view="bars" title="Draw numbers as bars">Bars</button>
		<button data-view="cells" title="Draw values as array cells">Cells</button>
	</div>
</header>

<section id="debug" class="tab-panel">
	<div class="status" id="debug-status"><span class="dot"></span><span class="text"></span></div>
	<div id="debug-empty" class="empty-state hidden">
		<p>Set a breakpoint in your sorting function, start debugging (F5) and open the panel when the program stops. Every step then animates what your code did to the array or linked list.</p>
		<button id="debug-open-playground" class="primary">Open the playground</button>
	</div>
	<div id="picker" class="picker hidden">
		<h2>What do you want to watch?</h2>
		<p class="hint" id="picker-frame"></p>
		<div id="candidates" class="candidates"></div>
		<p class="hint hidden" id="picker-none">No array of numbers or strings, and no linked list, in this frame. Step until your list exists, or right-click it in the Variables view and choose <b>Visualize Sorting</b>.</p>
	</div>
	<div id="trace" class="hidden">
		<div class="controls">
			<div class="group">
				<button data-step="stepOver" title="Step Over (F10)">Step Over</button>
				<button data-step="stepInto" title="Step Into (F11)">Step Into</button>
				<button data-step="stepOut" title="Step Out (Shift+F11)">Step Out</button>
				<button data-step="continue" title="Continue (F5)">Continue</button>
			</div>
			<div class="group">
				<button id="debug-play" class="primary" title="Steps through your code by itself, at the chosen speed (Space)">▶ Play</button>
				<select id="debug-play-action" aria-label="How Play steps">
					<option value="stepOver">with Step Over</option>
					<option value="stepInto">with Step Into (recursion)</option>
					<option value="continue">breakpoint to breakpoint</option>
				</select>
				<label class="speed">Speed <input type="range" id="debug-speed" min="0" max="100"></label>
			</div>
		</div>
		<div class="subbar">
			<div class="history">
				<button id="history-prev" title="Previous step (←)">◀</button>
				<span id="history-pos"></span>
				<button id="history-next" title="Next step (→)">▶</button>
				<button id="history-live" class="link hidden">Back to live</button>
			</div>
			<div class="counters" id="debug-counters"></div>
			<div class="group">
				<button id="debug-try" class="link">Try an algorithm on this data</button>
				<button id="debug-change" class="link">Watch something else</button>
			</div>
		</div>
		<div class="note" id="debug-note"></div>
		<div id="debug-stage"></div>
		${LEGEND}
	</div>
</section>

<section id="playground" class="tab-panel hidden">
	<div class="controls">
		<div class="group">
			<select id="pg-algorithm" aria-label="Algorithm"></select>
		</div>
		<div class="group data">
			<input id="pg-input" type="text" spellcheck="false" aria-label="Values to sort" placeholder="Values: 5 3 8 1">
			<label class="size">Size <input id="pg-size" type="number" min="${MIN_SIZE}" max="${MAX_PLAYGROUND_SIZE}" aria-label="Number of random values"></label>
			<button id="pg-random" title="Random values of this size">Random</button>
			<button id="pg-debugger" class="hidden" title="The values of the structure you are watching">From your code</button>
		</div>
	</div>
	<div class="controls">
		<div class="group">
			<button id="pg-reset" title="Back to the start (Home)">⏮</button>
			<button id="pg-back" title="Step back (←)">◀</button>
			<button id="pg-play" class="primary" title="Play (Space)">▶ Play</button>
			<button id="pg-next" title="Step forward (→)">▶|</button>
			<label class="speed">Speed <input type="range" id="pg-speed" min="0" max="100"></label>
		</div>
		<div class="counters" id="pg-counters"></div>
	</div>
	<div class="pg-body">
		<div>
			<div class="note" id="pg-note"></div>
			<div id="pg-stage"></div>
			${LEGEND}
		</div>
		<aside class="pseudocode">
			<div class="code-tabs" role="group" aria-label="Show the algorithm as">
				<button data-code="pseudo">Pseudocode</button>
				<button data-code="python">Python</button>
				<button data-code="java">Java</button>
			</div>
			<div class="title" id="pg-title"></div>
			<div class="complexity" id="pg-complexity"></div>
			<ol id="pg-code"></ol>
		</aside>
	</div>
</section>

<section id="stats" class="tab-panel hidden">
	<p class="hint">Every algorithm sorts the same values. The table starts with what theory says, then what each algorithm actually did.</p>
	<div class="controls">
		<div class="group">
			<label class="size">Size <input id="st-size" type="number" min="${MIN_SIZE}" max="${MAX_STATS_SIZE}" aria-label="Number of values"></label>
			<select id="st-order" aria-label="Order of the values">
				<option value="random">Random order</option>
				<option value="nearly">Nearly sorted</option>
				<option value="reversed">Reversed</option>
				<option value="sorted">Already sorted</option>
			</select>
			<button id="st-new" title="New random values">New values</button>
			<button id="st-run" class="primary">▶ Run all</button>
		</div>
	</div>
	<p class="hint values" id="st-values"></p>
	<div class="table-scroll">
		<table class="stats">
			<thead>
				<tr>
					<th rowspan="2">Algorithm</th>
					<th colspan="5" class="group-head">Complexity</th>
					<th colspan="4" class="group-head">On these values</th>
				</tr>
				<tr>
					<th>Best</th><th>Average</th><th>Worst</th><th>Extra space</th><th>Stable</th>
					<th class="num">Comparisons</th><th class="num">Swaps</th><th class="num">Moves</th><th class="num">Steps</th>
				</tr>
			</thead>
			<tbody id="st-body"></tbody>
		</table>
	</div>
	<p class="hint" id="st-note">Moves are values copied into place (insertion and merge sort) or nodes relinked (linked lists). Steps are the steps you would see in the playground.</p>
</section>`;

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

// ---------------------------------------------------------------- tabs and view

let activeTab: Tab = saved.tab;

function showTab(tab: Tab) {
	activeTab = tab;
	save({ tab });
	document.querySelectorAll<HTMLElement>('.tab').forEach(t => {
		t.classList.toggle('active', t.dataset.tab === tab);
		t.setAttribute('aria-selected', String(t.dataset.tab === tab));
	});
	$('debug').classList.toggle('hidden', tab !== 'debug');
	$('playground').classList.toggle('hidden', tab !== 'playground');
	$('stats').classList.toggle('hidden', tab !== 'stats');
	document.querySelector('.view-toggle')!.classList.toggle('hidden', tab === 'stats');
	if (tab === 'playground') {
		playground.ensure();
	} else if (tab === 'stats') {
		stats.ensure();
	} else {
		debug.redraw();
	}
}

document.querySelectorAll<HTMLElement>('.tab').forEach(t => t.addEventListener('click', () => showTab(t.dataset.tab as any)));

function setView(view: View) {
	save({ view });
	document.querySelectorAll<HTMLElement>('[data-view]').forEach(b => b.classList.toggle('active', b.dataset.view === view));
	debug.redraw();
	playground.redraw();
}

document.querySelectorAll<HTMLElement>('[data-view]').forEach(b => b.addEventListener('click', () => setView(b.dataset.view as View)));

function counterHtml(entries: [string, number | undefined][]): string {
	return entries.filter(([, v]) => v !== undefined).map(([label, v]) => `${label} <b>${v}</b>`).join('<span></span>');
}

function setNote(element: HTMLElement, scene: Scene | undefined, error = false, quietText = '') {
	element.textContent = scene?.note || quietText;
	element.classList.toggle('sorted', !!scene?.sorted);
	element.classList.toggle('error', error);
	element.classList.toggle('quiet', !scene?.note);
}

// ---------------------------------------------------------------- "Your code"

const debug = new (class {
	readonly stage = new Stage($('debug-stage'));
	model = new TraceModel();
	history: { scene: Scene; snapshot: Snapshot; frame: string }[] = [];
	position = -1;
	watching: string | undefined;
	lastSnapshotJson = '';
	playing = false;
	state: 'paused' | 'running' | 'ended' | 'none' = 'none';

	constructor() {
		document.querySelectorAll<HTMLElement>('[data-step]').forEach(b => b.addEventListener('click', () => {
			post({ command: 'debug', action: b.dataset.step as StepAction });
		}));
		$('debug-play').addEventListener('click', () => this.togglePlay());
		const action = $<HTMLSelectElement>('debug-play-action');
		action.value = saved.playAction;
		action.addEventListener('change', () => save({ playAction: action.value as StepAction }));
		const speed = $<HTMLInputElement>('debug-speed');
		speed.value = String(saved.debugSpeed);
		speed.addEventListener('input', () => {
			save({ debugSpeed: +speed.value });
			// Play picks up the new speed at its next step
			if (this.playing) {
				post({ command: 'speed', delay: delayFor(saved.debugSpeed) });
			}
		});
		$('history-prev').addEventListener('click', () => this.go(this.position - 1));
		$('history-next').addEventListener('click', () => this.go(this.position + 1));
		$('history-live').addEventListener('click', () => this.go(this.history.length - 1));
		$('debug-change').addEventListener('click', () => {
			this.watching = undefined;
			post({ command: 'unwatch' });
		});
		$('debug-try').addEventListener('click', () => {
			const main = this.history[this.position]?.snapshot.main;
			if (main) {
				playground.load(main.values, main.kind, main.name);
				showTab('playground');
			}
		});
		$('debug-open-playground').addEventListener('click', () => showTab('playground'));
	}

	togglePlay() {
		if (this.playing) {
			post({ command: 'pause' });
		} else {
			this.go(this.history.length - 1);
			post({ command: 'play', action: saved.playAction, delay: delayFor(saved.debugSpeed) });
		}
	}

	setPlaying(playing: boolean) {
		this.playing = playing;
		$('debug-play').textContent = playing ? '❚❚ Pause' : '▶ Play';
		this.updateButtons();
	}

	setStatus(state: 'paused' | 'running' | 'ended' | 'none', text: string) {
		this.state = state;
		// The next session starts from the list of structures (or the same one, if it is there again)
		if (state === 'ended') {
			this.watching = undefined;
		}
		const status = $('debug-status');
		status.className = `status ${state}`;
		status.querySelector('.text')!.textContent = text;
		const noSession = state === 'none' || state === 'ended';
		$('debug-empty').classList.toggle('hidden', !noSession);
		if (noSession) {
			$('picker').classList.add('hidden');
			$('trace').classList.toggle('hidden', !this.history.length);
		}
		this.updateButtons();
	}

	updateButtons() {
		const paused = this.state === 'paused';
		document.querySelectorAll<HTMLButtonElement>('[data-step]').forEach(b => { b.disabled = !paused || this.playing; });
		$<HTMLButtonElement>('debug-play').disabled = !paused && !this.playing;
		$<HTMLButtonElement>('history-prev').disabled = this.position <= 0;
		$<HTMLButtonElement>('history-next').disabled = this.position >= this.history.length - 1;
		$('history-live').classList.toggle('hidden', this.position >= this.history.length - 1);
		$('history-pos').textContent = this.history.length ? `Step ${this.position + 1} / ${this.history.length}` : '';
		const hasValues = !!this.history[this.position]?.snapshot.main?.values.length;
		$<HTMLButtonElement>('debug-try').disabled = !hasValues;
		$('pg-debugger').classList.toggle('hidden', !this.latestMain());
	}

	latestMain() {
		for (let i = this.history.length - 1; i >= 0; i--) {
			const main = this.history[i].snapshot.main;
			if (main && main.values.length) {
				return main;
			}
		}
		return undefined;
	}

	showCandidates(candidates: Candidate[], frame: string) {
		if (this.watching) {
			return;
		}
		$('debug-empty').classList.add('hidden');
		$('trace').classList.add('hidden');
		$('picker').classList.remove('hidden');
		$('picker-frame').textContent = frame ? `Arrays and linked lists in ${frame}:` : '';
		const list = $('candidates');
		list.replaceChildren();
		for (const candidate of candidates) {
			const button = document.createElement('button');
			button.className = 'candidate';
			button.innerHTML = '<span class="path"></span><span class="kind"></span><span class="preview"></span>';
			button.querySelector('.path')!.textContent = candidate.path;
			button.querySelector('.kind')!.textContent = `${candidate.kind === 'list' ? 'linked list' : 'array'} · ${candidate.length}`;
			button.querySelector('.preview')!.textContent = candidate.preview;
			button.addEventListener('click', () => this.watch(candidate.path, candidate.kind));
			list.appendChild(button);
		}
		$('picker-none').classList.toggle('hidden', candidates.length > 0);
	}

	watch(path: string, kind: 'array' | 'list') {
		this.reset();
		this.watching = path;
		post({ command: 'watch', path, kind });
	}

	reset() {
		this.model = new TraceModel();
		this.history = [];
		this.position = -1;
		this.lastSnapshotJson = '';
		this.stage.clear();
	}

	onSnapshot(snapshot: Snapshot, path: string) {
		if (this.watching !== path) {
			this.reset();
			this.watching = path;
		}
		$('picker').classList.add('hidden');
		$('debug-empty').classList.add('hidden');
		$('trace').classList.remove('hidden');
		// The same stop read twice (VS Code sends several events per step)
		const json = JSON.stringify(snapshot);
		if (json === this.lastSnapshotJson) {
			post({ command: 'rendered', becameSorted: false });
			return;
		}
		this.lastSnapshotJson = json;

		const wasSorted = this.history[this.history.length - 1]?.scene.sorted;
		const scene = this.model.next(snapshot);
		this.history.push({ scene, snapshot, frame: snapshot.frame });
		const live = this.position >= this.history.length - 2;
		if (live) {
			this.go(this.history.length - 1);
		} else {
			this.updateButtons();
		}
		// Play stops at the moment the structure becomes sorted
		post({ command: 'rendered', becameSorted: !!scene.sorted && !wasSorted });
	}

	go(position: number) {
		if (position < 0 || position >= this.history.length) {
			return;
		}
		const step = Math.abs(position - this.position);
		this.position = position;
		const entry = this.history[position];
		this.stage.render(entry.scene, saved.view, step > 1 ? 0 : durationFor(saved.debugSpeed));
		setNote($('debug-note'), entry.scene, !!entry.snapshot.error && !entry.snapshot.main, position === 0 ? `Watching ${this.watching}: step through your code` : `No change on this step (${entry.frame})`);
		const c = entry.scene.counters;
		const list = entry.snapshot.main?.kind === 'list';
		$('debug-counters').innerHTML = counterHtml(list ? [['Steps', c.steps], ['Relinks', c.writes]] : [['Steps', c.steps], ['Swaps', c.swaps], ['Writes', c.writes]]);
		if (position < this.history.length - 1) {
			$('debug-status').querySelector('.text')!.textContent = `Step ${position + 1}: ${entry.frame}`;
		} else if (this.state === 'paused') {
			$('debug-status').querySelector('.text')!.textContent = `Paused at ${entry.frame}`;
		}
		this.updateButtons();
	}

	redraw() {
		const entry = this.history[this.position];
		if (entry && activeTab === 'debug') {
			this.stage.render(entry.scene, saved.view, 0);
		}
	}
})();

// ---------------------------------------------------------------- Playground

const playground = new (class {
	readonly stage = new Stage($('pg-stage'));
	scenes: Scene[] = [];
	position = 0;
	timer: ReturnType<typeof setTimeout> | undefined;
	kind: 'array' | 'list' = 'array';
	built = false;

	constructor() {
		const select = $<HTMLSelectElement>('pg-algorithm');
		for (const kind of ['array', 'list'] as const) {
			const group = document.createElement('optgroup');
			group.label = kind === 'array' ? 'Arrays' : 'Linked lists';
			for (const algorithm of ALGORITHMS.filter(a => a.kind === kind)) {
				const option = document.createElement('option');
				option.value = algorithm.id;
				option.textContent = algorithm.name + (kind === 'list' ? ' (linked list)' : '');
				group.appendChild(option);
			}
			select.appendChild(group);
		}
		select.value = saved.algorithm;
		select.addEventListener('change', () => {
			save({ algorithm: select.value as AlgorithmId });
			this.build();
		});
		const input = $<HTMLInputElement>('pg-input');
		input.value = saved.input;
		input.addEventListener('change', () => {
			save({ input: input.value });
			this.build();
		});
		input.addEventListener('keydown', e => {
			if (e.key === 'Enter') {
				save({ input: input.value });
				this.build();
			}
		});
		const size = $<HTMLInputElement>('pg-size');
		size.value = String(Math.max(MIN_SIZE, Math.min(MAX_PLAYGROUND_SIZE, parseValues(saved.input).length || 10)));
		const random = () => {
			const n = clampSize(size, MAX_PLAYGROUND_SIZE);
			input.value = randomValues(n).join(' ');
			save({ input: input.value });
			this.build();
		};
		$('pg-random').addEventListener('click', random);
		size.addEventListener('change', random);
		document.querySelectorAll<HTMLElement>('[data-code]').forEach(b => b.addEventListener('click', () => {
			save({ codeView: b.dataset.code as SavedState['codeView'] });
			this.showCode();
			this.highlight();
		}));
		$('pg-debugger').addEventListener('click', () => {
			const main = debug.latestMain();
			if (main) {
				this.load(main.values, main.kind, main.name);
			}
		});
		const speed = $<HTMLInputElement>('pg-speed');
		speed.value = String(saved.playgroundSpeed);
		speed.addEventListener('input', () => save({ playgroundSpeed: +speed.value }));
		$('pg-play').addEventListener('click', () => this.togglePlay());
		$('pg-next').addEventListener('click', () => { this.pause(); this.go(this.position + 1); });
		$('pg-back').addEventListener('click', () => { this.pause(); this.go(this.position - 1); });
		$('pg-reset').addEventListener('click', () => { this.pause(); this.go(0); });
	}

	ensure() {
		if (!this.built) {
			this.build();
		} else {
			this.redraw();
		}
	}

	/**
	 * Values from the debugger: picks an algorithm for the structure if the current one does not fit
	 */
	load(values: string[], kind: 'array' | 'list', source: string) {
		const input = $<HTMLInputElement>('pg-input');
		input.value = values.join(' ');
		save({ input: input.value });
		const current = ALGORITHMS.find(a => a.id === saved.algorithm);
		if (current?.kind !== kind) {
			const fallback = kind === 'list' ? 'listMerge' : 'bubble';
			$<HTMLSelectElement>('pg-algorithm').value = fallback;
			save({ algorithm: fallback });
		}
		input.title = `From ${source}`;
		this.build();
	}

	build() {
		this.pause();
		this.built = true;
		const info = ALGORITHMS.find(a => a.id === saved.algorithm) || ALGORITHMS[0];
		this.kind = info.kind;
		let values = parseValues(saved.input);
		if (values.length === 0) {
			values = randomValues(10);
			$<HTMLInputElement>('pg-input').value = values.join(' ');
		}
		this.scenes = runAlgorithm(info.id, values);
		this.stage.clear();
		$('pg-title').textContent = info.name + (info.kind === 'list' ? ' on a linked list' : '');
		$('pg-complexity').textContent = info.complexity;
		$<HTMLInputElement>('pg-size').value = String(values.length);
		this.showCode();
		this.position = -1;
		this.go(0);
	}

	/**
	 * The algorithm as pseudocode, Python or Java; real code lines remember their pseudocode line
	 */
	showCode() {
		const info = ALGORITHMS.find(a => a.id === saved.algorithm) || ALGORITHMS[0];
		document.querySelectorAll<HTMLElement>('[data-code]').forEach(b => b.classList.toggle('active', b.dataset.code === saved.codeView));
		const lines = saved.codeView === 'pseudo'
			? info.pseudocode.map((text, i) => ({ text, step: i + 1 }))
			: algorithmCode(info.id, saved.codeView);
		const code = $('pg-code');
		code.replaceChildren();
		code.classList.toggle('source', saved.codeView !== 'pseudo');
		document.querySelector('.pg-body')!.classList.toggle('wide', saved.codeView !== 'pseudo');
		for (const line of lines) {
			const li = document.createElement('li');
			li.textContent = line.text || ' ';
			li.dataset.step = String(line.step);
			code.appendChild(li);
		}
	}

	highlight() {
		const scene = this.scenes[this.position];
		let first: HTMLElement | undefined;
		$('pg-code').querySelectorAll<HTMLElement>('li').forEach(li => {
			const active = !!scene?.line && li.dataset.step === String(scene.line);
			li.classList.toggle('active', active);
			if (active && !first) {
				first = li;
			}
		});
		first?.scrollIntoView({ block: 'nearest' });
	}

	go(position: number) {
		if (position < 0 || position >= this.scenes.length) {
			return;
		}
		const jump = Math.abs(position - this.position) > 1;
		this.position = position;
		const scene = this.scenes[position];
		this.stage.render(scene, saved.view, jump ? 0 : durationFor(saved.playgroundSpeed));
		setNote($('pg-note'), scene);
		const c = scene.counters;
		const list = ALGORITHMS.find(a => a.id === saved.algorithm)?.kind === 'list';
		$('pg-counters').innerHTML = counterHtml(list ? [['Step', position], ['Comparisons', c.comparisons], ['Relinks', c.writes]] : [['Step', position], ['Comparisons', c.comparisons], ['Swaps', c.swaps], ['Moves', c.writes]]);
		this.highlight();
		$<HTMLButtonElement>('pg-back').disabled = position === 0;
		$<HTMLButtonElement>('pg-reset').disabled = position === 0;
		$<HTMLButtonElement>('pg-next').disabled = position === this.scenes.length - 1;
		if (position === this.scenes.length - 1 && this.timer) {
			this.pause();
			post({ command: 'finished' });
		}
	}

	togglePlay() {
		if (this.timer) {
			this.pause();
			return;
		}
		if (this.position >= this.scenes.length - 1) {
			this.go(0);
		}
		const tick = () => {
			this.timer = setTimeout(() => {
				this.go(this.position + 1);
				if (this.timer) {
					tick();
				}
			}, delayFor(saved.playgroundSpeed));
		};
		$('pg-play').textContent = '❚❚ Pause';
		tick();
	}

	pause() {
		if (this.timer) {
			clearTimeout(this.timer);
			this.timer = undefined;
		}
		$('pg-play').textContent = '▶ Play';
	}

	redraw() {
		const scene = this.scenes[this.position];
		if (scene && activeTab === 'playground') {
			this.stage.render(scene, saved.view, 0);
		}
	}
})();

function clampSize(input: HTMLInputElement, max: number): number {
	const n = Math.max(MIN_SIZE, Math.min(max, Math.round(+input.value) || MIN_SIZE));
	input.value = String(n);
	return n;
}

// ---------------------------------------------------------------- Stats

const stats = new (class {
	values: string[] = [];
	built = false;
	timers: ReturnType<typeof setTimeout>[] = [];

	constructor() {
		const size = $<HTMLInputElement>('st-size');
		size.value = String(saved.statsSize);
		const order = $<HTMLSelectElement>('st-order');
		order.value = saved.statsOrder;
		size.addEventListener('change', () => { save({ statsSize: clampSize(size, MAX_STATS_SIZE) }); this.generate(); });
		order.addEventListener('change', () => { save({ statsOrder: order.value as StatsOrder }); this.generate(); });
		$('st-new').addEventListener('click', () => this.generate());
		$('st-run').addEventListener('click', () => this.run());
	}

	ensure() {
		if (!this.built) {
			this.built = true;
			this.generate();
		}
	}

	generate() {
		const n = clampSize($<HTMLInputElement>('st-size'), MAX_STATS_SIZE);
		let values = randomValues(n, n > 90 ? 999 : 99);
		const ascending = () => [...values].sort(compareValues);
		if (saved.statsOrder === 'sorted') {
			values = ascending();
		} else if (saved.statsOrder === 'reversed') {
			values = ascending().reverse();
		} else if (saved.statsOrder === 'nearly') {
			// Sorted, then a few neighbours swapped (about 5%)
			values = ascending();
			for (let k = 0; k < Math.max(1, Math.round(n / 20)); k++) {
				const i = Math.floor(Math.random() * (n - 1));
				[values[i], values[i + 1]] = [values[i + 1], values[i]];
			}
		}
		this.values = values;
		const shown = values.slice(0, 30).join(' ');
		$('st-values').textContent = `${n} values: ${shown}${n > 30 ? ' …' : ''}`;
		this.renderTable(null);
	}

	run() {
		this.timers.forEach(t => clearTimeout(t));
		const results: (ReturnType<typeof countAlgorithm> | null)[] = ALGORITHMS.map(() => null);
		this.renderTable(results);
		// One algorithm after another, so the table fills like a race
		ALGORITHMS.forEach((algorithm, i) => {
			this.timers.push(setTimeout(() => {
				results[i] = countAlgorithm(algorithm.id, this.values);
				this.renderTable(results);
			}, 120 * (i + 1)));
		});
	}

	renderTable(results: (ReturnType<typeof countAlgorithm> | null)[] | null) {
		const body = $('st-body');
		body.replaceChildren();
		const done = (results || []).filter((r): r is NonNullable<typeof r> => !!r);
		const max = (key: 'comparisons' | 'swaps' | 'writes' | 'steps') => Math.max(1, ...done.map(r => r[key] || 0));
		const min = (key: 'comparisons' | 'steps') => done.length === ALGORITHMS.length ? Math.min(...done.map(r => r[key] || 0)) : -1;
		ALGORITHMS.forEach((algorithm, i) => {
			const row = document.createElement('tr');
			const cell = (text: string, className = '') => {
				const td = document.createElement('td');
				td.textContent = text;
				td.className = className;
				row.appendChild(td);
				return td;
			};
			cell(algorithm.name + (algorithm.kind === 'list' ? ' (linked list)' : ''), 'name');
			cell(algorithm.best, 'o');
			cell(algorithm.average, 'o');
			cell(algorithm.worst, 'o' + (algorithm.worst.includes('²') ? ' slow' : ''));
			cell(algorithm.space, 'o');
			cell(algorithm.stable ? 'yes' : 'no');
			const result = results?.[i];
			for (const key of ['comparisons', 'swaps', 'writes', 'steps'] as const) {
				const td = cell('', 'num');
				if (!result) {
					td.textContent = results ? '…' : '–';
					continue;
				}
				const value = result[key] || 0;
				const bar = document.createElement('span');
				bar.className = 'bar';
				bar.style.width = `${Math.round((value / max(key)) * 100)}%`;
				const label = document.createElement('span');
				label.className = 'value';
				label.textContent = value.toLocaleString('en-US');
				td.append(bar, label);
				if ((key === 'comparisons' || key === 'steps') && value === min(key)) {
					td.classList.add('best');
				}
			}
			body.appendChild(row);
		});
	}
})();

// ---------------------------------------------------------------- keyboard

document.addEventListener('keydown', e => {
	const target = e.target as HTMLElement;
	if (target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'text' || target.tagName === 'SELECT') {
		return;
	}
	if (activeTab === 'playground') {
		if (e.key === ' ') { e.preventDefault(); playground.togglePlay(); }
		if (e.key === 'ArrowRight') { playground.pause(); playground.go(playground.position + 1); }
		if (e.key === 'ArrowLeft') { playground.pause(); playground.go(playground.position - 1); }
		if (e.key === 'Home') { playground.pause(); playground.go(0); }
	} else if (debug.history.length) {
		if (e.key === ' ' && target.tagName !== 'BUTTON') { e.preventDefault(); debug.togglePlay(); }
		if (e.key === 'ArrowRight') { debug.go(debug.position + 1); }
		if (e.key === 'ArrowLeft') { debug.go(debug.position - 1); }
	}
});

// ---------------------------------------------------------------- messages

window.addEventListener('message', (event: MessageEvent<ToPanel>) => {
	const message = event.data;
	switch (message.command) {
		case 'candidates':
			debug.showCandidates(message.candidates, message.frame);
			if (activeTab !== 'debug' && !debug.history.length) {
				showTab('debug');
			}
			break;
		case 'snapshot':
			debug.onSnapshot(message.snapshot, message.path);
			break;
		case 'status':
			debug.setStatus(message.state, message.text);
			break;
		case 'playing':
			debug.setPlaying(message.playing);
			break;
		case 'playground':
			if (message.values) {
				playground.load(message.values, message.kind || 'array', message.source || '');
			}
			showTab('playground');
			break;
	}
});

setView(saved.view);
showTab(saved.tab);
post({ command: 'ready' });
