// ============================================================================
// VALUE HELPERS
// ============================================================================

const NUMBER = /^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/;

export function isNumeric(value: string): boolean {
	return NUMBER.test(value.trim());
}

/**
 * Compares two values the way the sorted program would: as numbers when both are
 * numbers, otherwise as text (quotes of Python and Java strings ignored)
 */
export function compareValues(a: string, b: string): number {
	if (isNumeric(a) && isNumeric(b)) {
		return parseFloat(a) - parseFloat(b);
	}
	const x = unquote(a);
	const y = unquote(b);
	return x < y ? -1 : x > y ? 1 : 0;
}

export function unquote(value: string): string {
	const match = /^(['"])(.*)\1$/s.exec(value);
	return match ? match[2] : value;
}

export function isSorted(values: string[]): boolean {
	for (let i = 1; i < values.length; i++) {
		if (compareValues(values[i - 1], values[i]) > 0) {
			return false;
		}
	}
	return true;
}

/**
 * Parses what people type in the playground: "5 3 8 1", "5, 3, 8", "[5, 3, 8]" or words
 */
export function parseValues(text: string): string[] {
	return text
		.replace(/^\s*\[|\]\s*$/g, '')
		.split(/[\s,;]+/)
		.map(v => v.trim())
		.filter(v => v !== '')
		.slice(0, 40);
}

export function randomValues(count: number, max = 99): string[] {
	const values: string[] = [];
	for (let i = 0; i < count; i++) {
		values.push(String(1 + Math.floor(Math.random() * max)));
	}
	return values;
}
