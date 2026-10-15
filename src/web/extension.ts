// ============================================================================
// EXTENSION ACTIVATION
// ============================================================================

import * as vscode from 'vscode';
import { initRatingPrompt } from './ratingPrompt';
import { rememberStoppedThread } from './debugAdapter';
import { classifyVariable } from './reader';
import { SortingPanel } from './panel';

export function activate(context: vscode.ExtensionContext) {
	initRatingPrompt(context);

	/**
	 * Command: Open Sorting Visualizer (the debugger view while debugging, the playground otherwise)
	 */
	const openCommand = vscode.commands.registerCommand('sortingVisualizer.open', async () => {
		await SortingPanel.open(context);
	});

	/**
	 * Command: Open Sorting Playground (works without debugging)
	 */
	const playgroundCommand = vscode.commands.registerCommand('sortingVisualizer.openPlayground', async () => {
		await SortingPanel.open(context, { playground: true });
	});

	/**
	 * Command: Visualize Sorting (right-click a variable in the Variables view)
	 */
	const visualizeVariableCommand = vscode.commands.registerCommand(
		'sortingVisualizer.visualizeVariable',
		async (arg?: { variable?: { name: string; value?: string; type?: string; evaluateName?: string; variablesReference?: number; indexedVariables?: number } }) => {
			const variable = arg?.variable;
			if (!variable) {
				await SortingPanel.open(context);
				return;
			}
			const path = variable.evaluateName || variable.name;
			const kind = await classifyVariable(variable);
			if (!kind || !/^[A-Za-z_$][\w$]*(\.[A-Za-z_$][\w$]*)*$/.test(path)) {
				vscode.window.showInformationMessage(`"${path}" is not an array of numbers or strings, or a linked list. Open the Sorting Visualizer to see what can be sorted in this frame.`);
				return;
			}
			await SortingPanel.open(context, { watch: { path, kind } });
		}
	);

	/**
	 * Status bar button while debugging
	 */
	const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 0);
	statusBarItem.text = '$(list-ordered) Sorting';
	statusBarItem.tooltip = 'Open Sorting Visualizer';
	statusBarItem.command = 'sortingVisualizer.open';
	const updateStatusBar = () => vscode.debug.activeDebugSession ? statusBarItem.show() : statusBarItem.hide();
	updateStatusBar();

	// A tracker sees the debugger's events only when the debug adapter runs in the same extension
	// host. This web extension runs in the web worker host and the Python and Java debuggers in the
	// Node one, so stops are also detected from the focused stack frame (below), and the end of a
	// session from onDidTerminateDebugSession.
	const tracker = vscode.debug.registerDebugAdapterTrackerFactory('*', {
		createDebugAdapterTracker: (session) => ({
			onDidSendMessage: (message: any) => {
				if (message.type !== 'event') {
					return;
				}
				const panel = SortingPanel.current;
				if (message.event === 'stopped') {
					rememberStoppedThread(session.id, message.body?.threadId);
					panel?.onStopped();
				} else if (message.event === 'continued') {
					panel?.onRunning();
				} else if (message.event === 'terminated' || message.event === 'exited') {
					panel?.onEnded();
				}
			},
		}),
	});

	const terminateListener = vscode.debug.onDidTerminateDebugSession(session => {
		const active = vscode.debug.activeDebugSession;
		if (!active || active.id === session.id) {
			SortingPanel.current?.onEnded();
		}
	});

	const sessionListener = vscode.debug.onDidChangeActiveDebugSession(session => {
		updateStatusBar();
		if (session) {
			SortingPanel.current?.scheduleRefresh();
		}
	});

	// The focused frame moves to the new top frame after every stop (and when another frame is
	// picked in the Call Stack view): this is how the panel sees steps (VS Code 1.90+)
	const onStackItem = (vscode.debug as any).onDidChangeActiveStackItem as vscode.Event<unknown> | undefined;
	const stackItemListener = onStackItem
		? onStackItem(item => SortingPanel.current?.onStackItem(item))
		: new vscode.Disposable(() => {});

	context.subscriptions.push(openCommand, playgroundCommand, visualizeVariableCommand, statusBarItem, tracker, terminateListener, sessionListener, stackItemListener);
}

export function deactivate() {}
