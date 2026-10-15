// ============================================================================
// DEBUG ADAPTER PROTOCOL: frames, scopes and variables of the active session
// ============================================================================

import * as vscode from 'vscode';

export interface DapVariable {
	name: string;
	value?: string;
	type?: string;
	variablesReference?: number;
	indexedVariables?: number;
	evaluateName?: string;
}

export interface DapFrame {
	id: number;
	name: string;
	line: number;
}

// Thread that reported the last "stopped" event, per debug session
const stoppedThreads = new Map<string, number>();

export function rememberStoppedThread(sessionId: string, threadId: number | undefined) {
	if (threadId !== undefined) {
		stoppedThreads.set(sessionId, threadId);
	}
}

function session(): vscode.DebugSession {
	const debugSession = vscode.debug.activeDebugSession;
	if (!debugSession) {
		throw new Error('No active debug session');
	}
	return debugSession;
}

/**
 * Thread to read: the one selected in the Call Stack view, else the one that stopped, else the first
 */
async function currentThreadId(): Promise<number | undefined> {
	const debugSession = session();
	const stackItem = (vscode.debug as any).activeStackItem;
	if (stackItem && stackItem.session && stackItem.session.id === debugSession.id && stackItem.threadId !== undefined) {
		return stackItem.threadId;
	}
	const stopped = stoppedThreads.get(debugSession.id);
	if (stopped !== undefined) {
		return stopped;
	}
	const response = await debugSession.customRequest('threads', {});
	const threads = response?.threads || response?.body?.threads || [];
	return threads.length ? threads[0].id : undefined;
}

/**
 * Call stack of the current thread, top frame first. Empty while the program runs.
 */
export async function getStackFrames(levels = 200): Promise<DapFrame[]> {
	const threadId = await currentThreadId();
	if (threadId === undefined) {
		return [];
	}
	try {
		const response = await session().customRequest('stackTrace', { threadId, startFrame: 0, levels });
		const frames: DapFrame[] = response?.stackFrames || response?.body?.stackFrames || [];
		// A frame selected in the Call Stack view becomes the top: what the user is looking at
		const stackItem = (vscode.debug as any).activeStackItem;
		const selected = stackItem?.frameId !== undefined ? frames.findIndex(f => f.id === stackItem.frameId) : -1;
		return selected > 0 ? frames.slice(selected) : frames;
	} catch {
		return [];
	}
}

/**
 * Local variables of a frame (the first scope: "Locals" in Python, "Local" in Java)
 */
export async function getLocals(frameId: number): Promise<DapVariable[]> {
	const response = await session().customRequest('scopes', { frameId });
	const scopes = response?.scopes || response?.body?.scopes || [];
	const locals = scopes.find((s: any) => !s.expensive);
	return locals ? getVariableChildren(locals.variablesReference) : [];
}

/**
 * Children of a variable (fields of an object, items of a list)
 */
export async function getVariableChildren(variablesReference: number | undefined): Promise<DapVariable[]> {
	if (!variablesReference) {
		return [];
	}
	try {
		const response = await session().customRequest('variables', { variablesReference });
		const variables: DapVariable[] = response?.variables || response?.body?.variables || [];
		// Java (java-debug) wraps an object's fields in a single unnamed child when its class has toString()
		if (variables.length === 1 && variables[0].name === '' && variables[0].variablesReference) {
			return getVariableChildren(variables[0].variablesReference);
		}
		return variables;
	} catch {
		return [];
	}
}

/**
 * The first `count` indexed children (Java arrays are paged)
 */
export async function getIndexedChildren(variable: DapVariable, count: number): Promise<DapVariable[]> {
	if ((variable.indexedVariables || 0) > count) {
		try {
			const response = await session().customRequest('variables', { variablesReference: variable.variablesReference, filter: 'indexed', start: 0, count });
			return response?.variables || response?.body?.variables || [];
		} catch {
			return [];
		}
	}
	return getVariableChildren(variable.variablesReference);
}

/**
 * Evaluates an expression in a frame, undefined when it fails
 */
export async function evaluate(expression: string, frameId: number): Promise<string | undefined> {
	try {
		const response = await session().customRequest('evaluate', { expression, frameId, context: 'watch' });
		return response?.result ?? response?.body?.result;
	} catch {
		return undefined;
	}
}

export function debuggerType(): string {
	return vscode.debug.activeDebugSession?.type || '';
}
