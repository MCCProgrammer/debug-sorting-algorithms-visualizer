import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { ALGORITHMS, countAlgorithm, runAlgorithm } from '../shared/algorithms';
import { algorithmCode } from '../shared/code';
import { compareValues, isSorted, parseValues } from '../shared/values';
import { Scene } from '../shared/types';

function values(scene: Scene): string[] {
	return scene.rows.flatMap(r => r.items.filter(i => !i.empty).map(i => i.value));
}

function sortedCopy(input: string[]): string[] {
	return [...input].sort(compareValues);
}

function checkRun(id: string, input: string[]) {
	const scenes = runAlgorithm(id as any, input);
	const last = scenes[scenes.length - 1];
	assert.equal(last.rows.length, 1, `${id}: one row at the end`);
	assert.deepEqual(last.rows[0].items.map(i => i.value), sortedCopy(input), `${id} sorts ${input.join(' ')}`);
	assert.ok(last.sorted, `${id}: last scene is marked sorted`);
	for (const [n, scene] of scenes.entries()) {
		// Nothing is lost or duplicated while items move between rows
		assert.deepEqual(sortedCopy(values(scene)), sortedCopy(input), `${id} scene ${n} keeps every value`);
		const ids = scene.rows.flatMap(r => r.items.map(i => i.id));
		assert.equal(new Set(ids).size, ids.length, `${id} scene ${n}: unique ids`);
		for (const pointer of scene.pointers) {
			assert.ok(scene.rows.some(r => r.id === pointer.row), `${id} scene ${n}: pointer ${pointer.name} on an existing row`);
		}
	}
	return scenes;
}

test('every algorithm sorts and keeps every value in every scene', () => {
	const inputs = [
		['38', '27', '43', '3', '9', '82', '10'],
		['5', '4', '3', '2', '1'],
		['1', '2', '3', '4'],
		['2', '2', '1', '1', '3', '3'],
		['-5', '0', '3.5', '-1.25', '10'],
		['pear', 'apple', 'fig', 'banana'],
		['7'],
		[],
		['1', '1'],
	];
	for (const algorithm of ALGORITHMS) {
		for (const input of inputs) {
			checkRun(algorithm.id, input);
		}
	}
});

test('random arrays', () => {
	for (const algorithm of ALGORITHMS) {
		for (let n = 0; n < 60; n++) {
			const length = Math.floor(Math.random() * 14);
			const input = Array.from({ length }, () => String(Math.floor(Math.random() * 20)));
			checkRun(algorithm.id, input);
		}
	}
});

test('stable algorithms keep equal values in order', () => {
	const input = ['3', '1', '3', '2', '1'];
	for (const algorithm of ALGORITHMS.filter(a => a.complexity.includes('stable') && !a.complexity.includes('not stable'))) {
		const scenes = runAlgorithm(algorithm.id, input);
		const first = scenes[0].rows[0].items;
		const last = scenes[scenes.length - 1].rows[0].items;
		const order = (items: typeof first, value: string) => items.filter(i => i.value === value).map(i => i.id);
		for (const value of ['1', '3']) {
			assert.deepEqual(order(last, value), order(first, value), `${algorithm.id} is stable for ${value}`);
		}
	}
});

test('counters and pseudocode lines', () => {
	const scenes = runAlgorithm('bubble', ['3', '2', '1']);
	const last = scenes[scenes.length - 1];
	assert.equal(last.counters.comparisons, 3);
	assert.equal(last.counters.swaps, 3);
	for (const algorithm of ALGORITHMS) {
		for (const scene of runAlgorithm(algorithm.id, ['4', '1', '3', '2'])) {
			if (scene.line !== undefined) {
				assert.ok(scene.line >= 1 && scene.line <= algorithm.pseudocode.length, `${algorithm.id}: line ${scene.line} exists`);
			}
		}
	}
});

test('values helpers', () => {
	assert.deepEqual(parseValues('[5, 3, 8]'), ['5', '3', '8']);
	assert.deepEqual(parseValues(' 5 3;8 '), ['5', '3', '8']);
	assert.ok(compareValues('10', '9') > 0, 'numbers compare as numbers');
	assert.ok(compareValues("'b'", "'a'") > 0, 'quoted strings compare without quotes');
	assert.ok(isSorted(['1', '2', '2', '10']));
	assert.ok(!isSorted(['1', '3', '2']));
});

test('counting without scenes gives the same numbers, fast on large arrays', () => {
	const input = ['38', '27', '43', '3', '9', '82', '10', '27'];
	for (const algorithm of ALGORITHMS) {
		const scenes = runAlgorithm(algorithm.id, input);
		const last = scenes[scenes.length - 1].counters;
		const counted = countAlgorithm(algorithm.id, input);
		assert.deepEqual([counted.comparisons, counted.swaps, counted.writes, counted.steps], [last.comparisons, last.swaps, last.writes, scenes.length], algorithm.id);
	}
	const large = Array.from({ length: 1000 }, () => String(Math.floor(Math.random() * 999)));
	const start = Date.now();
	for (const algorithm of ALGORITHMS) {
		assert.ok(countAlgorithm(algorithm.id, large).comparisons! > 0);
	}
	assert.ok(Date.now() - start < 5000, `1000 values in ${Date.now() - start} ms`);
	// Theory shows in practice: insertion sort on sorted values makes n - 1 comparisons
	const sorted = Array.from({ length: 100 }, (_, i) => String(i));
	assert.equal(countAlgorithm('insertion', sorted).comparisons, 99);
	assert.equal(countAlgorithm('bubble', sorted).comparisons, 99);
	assert.equal(countAlgorithm('selection', sorted).comparisons, 4950);
});

test('the Python and Java code covers every pseudocode line', () => {
	for (const algorithm of ALGORITHMS) {
		for (const language of ['python', 'java'] as const) {
			const lines = algorithmCode(algorithm.id, language);
			assert.ok(lines.length > 3 && lines.every(l => !/@\d/.test(l.text)), `${algorithm.id} ${language}: markers removed`);
			const steps = new Set(lines.map(l => l.step).filter(n => n > 0));
			for (let n = 1; n <= algorithm.pseudocode.length; n++) {
				assert.ok(steps.has(n), `${algorithm.id} ${language}: pseudocode line ${n} has code`);
			}
			assert.ok([...steps].every(n => n <= algorithm.pseudocode.length), `${algorithm.id} ${language}: no marker past the pseudocode`);
		}
	}
});
