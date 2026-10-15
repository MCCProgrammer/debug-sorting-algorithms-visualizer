// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Debugger value as people expect to read it: Java shows `Integer@24 "8"`,
 * `SortDemo$Node@22 "Node(4)"` or `SortDemo$Node@49`, which become `8`, `Node(4)` and `Node@49`
 */
export function cleanValue(value: unknown): string {
	const text = String(value);
	const match = /^[\w$.]+@[0-9a-f]+ "(.*)"$/s.exec(text);
	if (match) {
		return match[1];
	}
	// Drop the package and outer class names of an object reference
	return /^[\w$.]+@\d+$/.test(text) ? text.replace(/^.*[.$](?=[^.$]+@\d+$)/, '') : text;
}

/**
 * Random nonce for the webview Content Security Policy
 */
export function getNonce(): string {
	const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	let nonce = '';
	for (let i = 0; i < 32; i++) {
		nonce += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	return nonce;
}
