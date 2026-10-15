// ============================================================================
// RATING PROMPT
// ============================================================================

import * as vscode from 'vscode';

const SESSIONS_KEY = 'ratingPrompt.sessions';
const LAST_SESSION_KEY = 'ratingPrompt.lastSessionId';
const PROMPTED_KEY = 'ratingPrompt.prompted';

// Debug sessions (or playground days) with a sort shown before asking
const SESSIONS_BEFORE_PROMPT = 5;

const MARKETPLACE_REVIEW_URL = 'https://marketplace.visualstudio.com/items?itemName=MCCProgrammer.debug-sorting-algorithms-visualizer&ssr=false#review-details';
const OPEN_VSX_REVIEW_URL = 'https://open-vsx.org/extension/MCCProgrammer/debug-sorting-algorithms-visualizer/reviews';

/**
 * Syncs the "already asked" flag through Settings Sync, so people are asked once across machines
 */
export function initRatingPrompt(context: vscode.ExtensionContext) {
	context.globalState.setKeysForSync([PROMPTED_KEY]);
}

/**
 * Counts a session in which a sort was shown, and asks for a rating once
 * after SESSIONS_BEFORE_PROMPT of them. Never asks again, whatever the answer.
 */
export async function recordSuccessfulVisualization(context: vscode.ExtensionContext, sessionId: string | undefined) {
	const state = context.globalState;
	if (!sessionId || state.get<boolean>(PROMPTED_KEY) || state.get<string>(LAST_SESSION_KEY) === sessionId) {
		return;
	}

	const sessions = state.get<number>(SESSIONS_KEY, 0) + 1;
	await state.update(SESSIONS_KEY, sessions);
	await state.update(LAST_SESSION_KEY, sessionId);
	if (sessions < SESSIONS_BEFORE_PROMPT) {
		return;
	}

	await state.update(PROMPTED_KEY, true);
	const choice = await vscode.window.showInformationMessage(
		'Is Debug Sorting Algorithms Visualizer helping you? A quick rating helps other students find it.',
		'Rate it',
		'No thanks'
	);
	if (choice === 'Rate it') {
		// VS Code installs from the Marketplace; Cursor, VSCodium, Windsurf and others from Open VSX
		const url = vscode.env.appName.includes('Visual Studio Code') ? MARKETPLACE_REVIEW_URL : OPEN_VSX_REVIEW_URL;
		await vscode.env.openExternal(vscode.Uri.parse(url));
	}
}
