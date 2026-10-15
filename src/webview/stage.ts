// ============================================================================
// STAGE: draws a scene and animates the change from the previous one
// ============================================================================
//
// Every bar, cell or node is an element keyed by its item id. Rendering a new scene moves
// the elements to their new place (CSS transitions), so swaps, shifts and relinks animate
// by themselves, and in both directions when stepping back.

import { Item, Row, Scene } from '../shared/types';
import { isNumeric } from '../shared/values';

export type View = 'bars' | 'cells';

interface Box {
	x: number;
	y: number;
	w: number;
	h: number;
}

const PAD_X = 14;
const LABEL_H = 18;
const INDEX_H = 16;
const POINTER_H = 17;
const LINE_GAP = 12;
const BAR_VALUE_H = 18; // Room above a bar for its value

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, parent?: Element): HTMLElementTagNameMap[K] {
	const element = document.createElement(tag);
	element.className = className;
	parent?.appendChild(element);
	return element;
}

export class Stage {
	private readonly chips: HTMLElement;
	private readonly scroller: HTMLElement;
	private readonly canvas: HTMLElement;
	private readonly svg: SVGSVGElement;
	private readonly indexLayer: HTMLElement;
	private readonly boundary: HTMLElement;
	private readonly items = new Map<string, HTMLElement>();
	private readonly boxes = new Map<string, Box>();
	private readonly pointers = new Map<string, HTMLElement>();
	private readonly labels = new Map<string, HTMLElement>();
	private links: { from: string; to?: string; tail: number }[] = [];
	private linkFrame = 0;
	private last: { scene: Scene; view: View } | null = null;

	constructor(root: HTMLElement) {
		root.classList.add('stage');
		this.chips = el('div', 'chips', root);
		this.scroller = el('div', 'scroller', root);
		this.canvas = el('div', 'canvas', this.scroller);
		this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		this.svg.classList.add('links');
		this.svg.innerHTML = '<defs><marker id="arrowhead" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z"></path></marker></defs>';
		this.canvas.appendChild(this.svg);
		this.indexLayer = el('div', 'index-layer', this.canvas);
		this.boundary = el('div', 'boundary hidden', this.canvas);

		// Redraw at the new width, without animating
		let width = 0;
		new ResizeObserver(() => {
			if (this.last && Math.abs(this.scroller.clientWidth - width) > 4) {
				width = this.scroller.clientWidth;
				this.render(this.last.scene, this.last.view, 0);
			}
		}).observe(this.scroller);
	}

	clear() {
		for (const element of [...this.items.values(), ...this.pointers.values(), ...this.labels.values()]) {
			element.remove();
		}
		this.items.clear();
		this.boxes.clear();
		this.pointers.clear();
		this.labels.clear();
		this.chips.replaceChildren();
		this.indexLayer.replaceChildren();
		this.svg.querySelectorAll('g').forEach(g => g.remove());
		this.boundary.classList.add('hidden');
		this.canvas.style.height = '0px';
		this.last = null;
	}

	render(scene: Scene, view: View, duration: number) {
		const previous = this.last?.scene;
		this.last = { scene, view };
		this.canvas.style.setProperty('--duration', `${duration}ms`);
		this.renderChips(scene, previous);

		const all = scene.rows.flatMap(r => r.items.filter(i => !i.empty));
		const numeric = all.length > 0 && all.every(i => isNumeric(i.value));
		const bars = view === 'bars' && numeric;
		const nums = numeric ? all.map(i => parseFloat(i.value)) : [];
		const min = Math.min(0, ...nums);
		const max = Math.max(...nums, min + 1);

		// Columns and their width
		const hasList = scene.rows.some(r => r.kind === 'list');
		const widthOf = (row: Row) => Math.max(1, row.items.length + (row.kind === 'list' ? 0.7 : 0));
		let columns = 1;
		for (const row of scene.rows) {
			columns = Math.max(columns, (row.offset || 0) + widthOf(row));
		}
		for (const pointer of scene.pointers) {
			const row = scene.rows.find(r => r.id === pointer.row);
			columns = Math.max(columns, (row?.offset || 0) + pointer.index + 1);
		}
		const available = Math.max(this.scroller.clientWidth, 260) - 2 * PAD_X;
		const cw = Math.max(hasList ? 58 : 20, Math.min(hasList ? 92 : 88, Math.floor(available / columns)));
		const canvasWidth = Math.max(available + 2 * PAD_X, Math.ceil(columns * cw + 2 * PAD_X));

		// Lines: rows sharing a line are drawn side by side. Algorithms place their rows; in the
		// debugger view, helper rows (left, right, other lists) flow side by side while they fit.
		const lineOf = new Map<Row, number>();
		const offsetOf = new Map<Row, number>();
		if (scene.rows.some(r => r.line !== undefined)) {
			scene.rows.forEach((row, i) => {
				lineOf.set(row, row.line ?? i);
				offsetOf.set(row, row.offset || 0);
			});
		} else {
			const capacity = Math.max(columns, Math.floor(available / cw));
			let line = -1;
			let cursor = Infinity;
			for (const row of scene.rows) {
				const flows = row.small && row.offset === undefined;
				if (!flows || cursor + widthOf(row) > capacity) {
					line++;
					cursor = 0;
				}
				lineOf.set(row, line);
				offsetOf.set(row, flows ? cursor : row.offset || 0);
				cursor = flows ? cursor + widthOf(row) + 0.6 : Infinity;
			}
		}
		this.canvas.style.width = `${canvasWidth}px`;
		this.canvas.classList.toggle('bars', bars);
		this.canvas.classList.toggle('tiny', cw < 30);

		const contentHeight = (row: Row) => row.kind === 'list' ? (row.small ? 36 : 42)
			: bars ? (row.small ? 96 : 176) : (row.small ? 34 : 42);
		const showsIndexes = (row: Row) => row.kind === 'array' && (row.items.length > 1 || !row.small);

		const lines = [...new Set(lineOf.values())].sort((a, b) => a - b);
		const pointerStacks = new Map<string, number>(); // "row:index" -> pointers already placed
		const stackSize = (row: Row) => {
			const counts = new Map<number, number>();
			scene.pointers.filter(p => p.row === row.id).forEach(p => counts.set(p.index, (counts.get(p.index) || 0) + 1));
			return Math.max(0, ...counts.values());
		};
		const lineTop = new Map<number, number>();
		const lineGeometry = new Map<number, { content: number; index: number }>();
		let y = 4;
		for (const line of lines) {
			const rows = scene.rows.filter(r => lineOf.get(r) === line);
			const content = Math.max(...rows.map(contentHeight));
			const index = rows.some(showsIndexes) ? INDEX_H : 0;
			const stack = Math.max(...rows.map(stackSize));
			lineTop.set(line, y);
			lineGeometry.set(line, { content, index });
			y += LABEL_H + content + index + stack * POINTER_H + LINE_GAP;
		}
		this.canvas.style.height = `${y}px`;

		// Items
		const seen = new Set<string>();
		const indexHtml: string[] = [];
		const links: { from: string; to?: string; tail: number }[] = [];
		const newBoxes = new Map<string, Box>();
		for (const row of scene.rows) {
			const line = lineOf.get(row)!;
			const top = lineTop.get(line)! + LABEL_H;
			const { content } = lineGeometry.get(line)!;
			const rowHeight = contentHeight(row);
			const offset = offsetOf.get(row)!;

			// An emptied helper row (a merged half, the held key) keeps no label behind
			if (row.items.length || !row.small) {
				this.placeLabel(row, PAD_X + offset * cw, lineTop.get(line)!, seen);
			}

			row.items.forEach((item, index) => {
				const x0 = PAD_X + (offset + index) * cw;
				let box: Box;
				if (row.kind === 'list') {
					const w = Math.round(cw * 0.6);
					box = { x: x0 + 2, y: top + content - rowHeight, w, h: rowHeight };
				} else if (bars && !item.empty) {
					const w = Math.max(6, Math.round(cw * 0.74));
					const usable = rowHeight - BAR_VALUE_H;
					const h = Math.max(4, Math.round(((parseFloat(item.value) - min) / (max - min)) * usable));
					box = { x: x0 + (cw - w) / 2, y: top + content - h, w, h };
				} else if (bars) {
					const w = Math.max(6, Math.round(cw * 0.74));
					box = { x: x0 + (cw - w) / 2, y: top + content - 22, w, h: 22 };
				} else {
					const w = Math.max(14, cw - 6);
					box = { x: x0 + (cw - w) / 2, y: top + content - rowHeight, w, h: rowHeight };
				}
				newBoxes.set(item.id, box);
				this.placeItem(item, row, box, scene, duration);
				seen.add(item.id);

				if (row.kind === 'list') {
					const last = index === row.items.length - 1;
					links.push({ from: item.id, to: last ? row.next : row.items[index + 1].id, tail: Math.min(cw - box.w - 4, 26) });
				}
			});
			if (showsIndexes(row)) {
				for (let i = 0; i < row.items.length; i++) {
					const x = PAD_X + (offset + i + 0.5) * cw;
					indexHtml.push(`<span class="index" data-x="${x}" data-y="${top + content + 1}">${offset + i}</span>`);
				}
			}
		}
		this.boxes.clear();
		newBoxes.forEach((box, id) => this.boxes.set(id, box));

		// Elements that are gone fade out
		for (const [id, element] of this.items) {
			if (!seen.has(id)) {
				this.items.delete(id);
				element.classList.add('leaving');
				setTimeout(() => element.remove(), duration + 50);
			}
		}

		// Index numbers (positioned from data attributes: no inline styles under the CSP)
		this.indexLayer.innerHTML = indexHtml.join('');
		this.indexLayer.querySelectorAll<HTMLElement>('.index').forEach(e => {
			e.style.transform = `translate(${e.dataset.x}px, ${e.dataset.y}px) translateX(-50%)`;
		});

		this.placePointers(scene, lineOf, offsetOf, lineTop, lineGeometry, cw, pointerStacks);
		this.placeBoundary(scene, lineOf, offsetOf, lineTop, lineGeometry, cw);
		this.drawLinks(links, duration);

		for (const [key, label] of this.labels) {
			if (!seen.has('label:' + key)) {
				label.remove();
				this.labels.delete(key);
			}
		}

		if (scene.sorted && previous && !previous.sorted) {
			this.celebrate(scene);
		}
	}

	private renderChips(scene: Scene, previous: Scene | undefined) {
		const before = new Map((previous?.vars || []).map(v => [v.name, v.value]));
		this.chips.replaceChildren();
		for (const variable of scene.vars) {
			const chip = el('span', 'chip', this.chips);
			chip.dataset.name = variable.name;
			el('b', '', chip).textContent = variable.name;
			chip.append(` = ${variable.value}`);
			if (before.has(variable.name) && before.get(variable.name) !== variable.value) {
				chip.classList.add('changed');
			}
		}
	}

	private placeLabel(row: Row, x: number, y: number, seen: Set<string>) {
		let label = this.labels.get(row.id);
		if (!label) {
			label = el('div', 'row-label', this.canvas);
			this.labels.set(row.id, label);
			label.style.transform = `translate(${x}px, ${y}px)`;
		}
		label.textContent = row.label;
		label.classList.toggle('small', !!row.small);
		label.style.transform = `translate(${x}px, ${y}px)`;
		seen.add('label:' + row.id);
	}

	private placeItem(item: Item, row: Row, box: Box, scene: Scene, duration: number) {
		let element = this.items.get(item.id);
		const isNew = !element;
		if (!element) {
			element = el('div', 'item', this.canvas);
			el('div', 'box', element);
			el('span', 'val', element);
			this.items.set(item.id, element);
			// Start where the value comes from: the copied element, a variable chip, or in place
			const start = this.startBox(item, box);
			this.applyBox(element, start.box);
			element.classList.toggle('entering', start.fade);
			element.getBoundingClientRect(); // Commit the start position before transitioning
		}
		element.className = 'item';
		element.classList.add(row.kind === 'list' ? 'node' : 'cell');
		if (item.empty) { element.classList.add('empty'); }
		if (row.small) { element.classList.add('small'); }
		const mark = scene.marks[item.id];
		if (mark) { element.classList.add('mark-' + mark); }
		if (scene.pointers.some(p => p.row === row.id && row.items[p.index] === item) && !item.empty) { element.classList.add('pointed'); }
		if (isNew && item.from) { element.classList.add('copy'); }
		element.querySelector('.val')!.textContent = item.empty ? '' : item.value;
		element.title = item.empty ? '' : item.value;
		this.applyBox(element, box);
		// Moving elements pass over the others
		const old = this.boxes.get(item.id);
		element.style.zIndex = !old || old.x !== box.x || old.y !== box.y ? '3' : '1';
		if (duration === 0) {
			element.classList.remove('entering');
		}
	}

	private startBox(item: Item, target: Box): { box: Box; fade: boolean } {
		if (item.from && !item.from.startsWith('var:')) {
			const source = this.boxes.get(item.from);
			if (source) {
				return { box: { ...source, h: target.h, y: source.y + source.h - target.h }, fade: false };
			}
		}
		if (item.from?.startsWith('var:')) {
			const chip = this.chips.querySelector<HTMLElement>(`[data-name="${CSS.escape(item.from.slice(4))}"]`);
			if (chip) {
				const c = chip.getBoundingClientRect();
				const canvas = this.canvas.getBoundingClientRect();
				return { box: { x: c.left - canvas.left + c.width / 2 - target.w / 2, y: c.top - canvas.top, w: target.w, h: target.h }, fade: false };
			}
		}
		return { box: target, fade: true };
	}

	private applyBox(element: HTMLElement, box: Box) {
		element.style.transform = `translate(${box.x}px, ${box.y}px)`;
		element.style.width = `${box.w}px`;
		element.style.height = `${box.h}px`;
	}

	private placePointers(scene: Scene, lineOf: Map<Row, number>, offsetOf: Map<Row, number>, lineTop: Map<number, number>,
		lineGeometry: Map<number, { content: number; index: number }>, cw: number, stacks: Map<string, number>) {
		const seen = new Set<string>();
		for (const pointer of scene.pointers) {
			const row = scene.rows.find(r => r.id === pointer.row);
			if (!row) {
				continue;
			}
			const line = lineOf.get(row)!;
			const { content, index } = lineGeometry.get(line)!;
			const slot = `${row.id}:${pointer.index}`;
			const level = stacks.get(slot) || 0;
			stacks.set(slot, level + 1);
			const x = PAD_X + (offsetOf.get(row)! + pointer.index + 0.5) * cw;
			const y = lineTop.get(line)! + LABEL_H + content + index + level * POINTER_H;
			const key = `${row.id}:${pointer.name}`;
			let element = this.pointers.get(key);
			if (!element) {
				element = el('div', 'pointer', this.canvas);
				el('span', 'arrow', element).textContent = '▲';
				el('span', 'name', element).textContent = pointer.name;
				this.pointers.set(key, element);
				element.style.transform = `translate(${x}px, ${y}px) translateX(-50%)`;
				element.classList.add('entering');
				element.getBoundingClientRect();
			}
			element.classList.remove('entering');
			element.style.transform = `translate(${x}px, ${y}px) translateX(-50%)`;
			seen.add(key);
		}
		for (const [key, element] of this.pointers) {
			if (!seen.has(key)) {
				element.remove();
				this.pointers.delete(key);
			}
		}
	}

	private placeBoundary(scene: Scene, lineOf: Map<Row, number>, offsetOf: Map<Row, number>, lineTop: Map<number, number>,
		lineGeometry: Map<number, { content: number; index: number }>, cw: number) {
		const row = scene.rows.find(r => r.boundary !== undefined);
		this.boundary.classList.toggle('hidden', !row);
		if (!row) {
			return;
		}
		const line = lineOf.get(row)!;
		const { content } = lineGeometry.get(line)!;
		const x = PAD_X + (offsetOf.get(row)! + row.boundary!) * cw;
		this.boundary.style.transform = `translate(${x}px, ${lineTop.get(line)! + LABEL_H - 4}px)`;
		this.boundary.style.height = `${content + 8}px`;
	}

	/**
	 * List arrows follow the nodes while they move: redrawn from the elements' positions
	 * on every animation frame until the transitions end
	 */
	private drawLinks(links: { from: string; to?: string; tail: number }[], duration: number) {
		this.svg.querySelectorAll('g').forEach(g => g.remove());
		const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
		group.innerHTML = links.map(l => '<path marker-end="url(#arrowhead)"></path>' + (l.to ? '' : '<text>∅</text>')).join('');
		this.svg.appendChild(group);
		this.svg.setAttribute('width', this.canvas.style.width);
		this.svg.setAttribute('height', this.canvas.style.height);
		this.links = links;
		cancelAnimationFrame(this.linkFrame);
		const start = performance.now();
		const tick = () => {
			this.updateLinks(group);
			if (performance.now() - start < duration + 80) {
				this.linkFrame = requestAnimationFrame(tick);
			}
		};
		tick();
	}

	private updateLinks(group: SVGGElement) {
		const canvas = this.canvas.getBoundingClientRect();
		const paths = group.querySelectorAll('path');
		const texts = group.querySelectorAll('text');
		let t = 0;
		this.links.forEach((link, i) => {
			const a = this.items.get(link.from)?.getBoundingClientRect();
			if (!a) {
				return;
			}
			const x1 = a.right - canvas.left;
			const y1 = a.top + a.height / 2 - canvas.top;
			const b = link.to ? this.items.get(link.to)?.getBoundingClientRect() : undefined;
			let d: string;
			if (b && Math.abs(b.top - a.top) < a.height / 2) {
				// Next node on the same line
				d = `M ${x1} ${y1} L ${b.left - canvas.left - 1} ${b.top + b.height / 2 - canvas.top}`;
			} else if (b) {
				// The list goes on in a node drawn on another line: curve into its top or bottom edge
				const x2 = b.right - canvas.left - Math.min(10, b.width / 4);
				const below = b.top > a.top;
				const y2 = (below ? b.top : b.bottom) - canvas.top + (below ? -1 : 1);
				d = `M ${x1} ${y1} C ${x1 + 28} ${y1}, ${x2} ${y2 + (below ? -28 : 28)}, ${x2} ${y2}`;
			} else {
				d = `M ${x1} ${y1} L ${x1 + link.tail} ${y1}`;
				const text = texts[t++];
				text.setAttribute('x', String(x1 + link.tail + 3));
				text.setAttribute('y', String(y1 + 4));
			}
			paths[i].setAttribute('d', d);
		});
	}

	private celebrate(scene: Scene) {
		const main = scene.rows[0];
		main?.items.forEach((item, i) => {
			const element = this.items.get(item.id);
			if (element) {
				element.style.setProperty('--wave', `${i * 35}ms`);
				element.classList.add('wave');
			}
		});
	}
}
