// ============================================================================
// THE SORTING VISUALIZER PANEL
// ============================================================================

import * as vscode from 'vscode';
import { FromPanel, StepAction, ToPanel } from '../shared/types';
import { getStackFrames } from './debugAdapter';
import { detectCandidates, frameLabel, readSnapshot, Watch, watchFor } from './reader';
import { getNonce } from './utils';
import { recordSuccessfulVisualization } from './ratingPrompt';

const STEP_COMMANDS: Record<StepAction, string> = {
	stepOver: 'workbench.action.debug.stepOver',
	stepInto: 'workbench.action.debug.stepInto',
	stepOut: 'workbench.action.debug.stepOut',
	continue: 'workbench.action.debug.continue',
};

// How long Play waits for the debugger to stop again before giving up (no breakpoint ahead)
const STOP_TIMEOUT = 10000;

// vscode.debug.onDidChangeActiveStackItem (VS Code 1.90+)
const HAS_STACK_ITEM_EVENT = typeof (vscode.debug as any).onDidChangeActiveStackItem === 'function';

export interface OpenOptions {
	watch?: { path: string; kind: 'array' | 'list' };
	playground?: boolean;
}

export class SortingPanel {
	static current: SortingPanel | undefined;

	private watch: Watch | undefined;
	private previousWatch: { path: string; kind: 'array' | 'list' } | undefined; // From the last debug session
	private ready = false;
	private queued: ToPanel[] = [];
	private refreshing: Promise<void> = Promise.resolve();
	private refreshAgain = false;
	private refreshTimer: ReturnType<typeof setTimeout> | undefined;
	private playing = false;
	private playDelay = 600; // Pause between steps while playing, changed live by the speed slider
	private stopWaiters: ((stopped: boolean) => void)[] = [];
	private renderedWaiters: (() => void)[] = [];
	private becameSorted = false;
	private disposables: vscode.Disposable[] = [];

	static async open(context: vscode.ExtensionContext, options: OpenOptions = {}) {
		if (!SortingPanel.current) {
			SortingPanel.current = new SortingPanel(context);
		} else {
			SortingPanel.current.panel.reveal(vscode.ViewColumn.Beside, true);
		}
		await SortingPanel.current.start(options);
	}

	private constructor(private readonly context: vscode.ExtensionContext, readonly panel = vscode.window.createWebviewPanel(
		'sortingVisualizer',
		'Sorting Visualizer',
		{ viewColumn: vscode.ViewColumn.Beside, preserveFocus: true },
		{
			enableScripts: true,
			retainContextWhenHidden: true,
			localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'dist', 'webview'), vscode.Uri.joinPath(context.extensionUri, 'media')],
		}
	)) {
		panel.iconPath = vscode.Uri.joinPath(context.extensionUri, 'media', 'panel-icon.svg');
		panel.webview.html = this.html();
		this.disposables.push(
			panel.onDidDispose(() => this.dispose()),
			panel.webview.onDidReceiveMessage((message: FromPanel) => this.onMessage(message))
		);
	}

	private async start(options: OpenOptions) {
		if (options.playground || !vscode.debug.activeDebugSession) {
			this.post({ command: 'playground' });
			if (!vscode.debug.activeDebugSession) {
				this.post({ command: 'status', state: 'none', text: 'Start debugging (F5) and stop at a breakpoint to watch your own sorting code.' });
			}
			return;
		}
		if (options.watch) {
			const frames = await getStackFrames();
			this.watch = watchFor(options.watch.path, options.watch.kind, frames);
		}
		this.scheduleRefresh(0);
	}

	// ------------------------------------------------------------ debugger events

	onStopped() {
		const waiters = this.stopWaiters.splice(0);
		waiters.forEach(w => w(true));
		this.scheduleRefresh();
	}

	/**
	 * The focused stack item changed: a stack frame means the debugger stopped (or the user
	 * picked another frame in the Call Stack view); a thread or nothing, that it runs
	 */
	onStackItem(item: unknown) {
		if (item && typeof item === 'object' && 'frameId' in item) {
			this.onStopped();
		} else {
			this.scheduleRefresh();
		}
	}

	onRunning() {
		this.post({ command: 'status', state: 'running', text: 'Running…' });
	}

	onEnded() {
		const waiters = this.stopWaiters.splice(0);
		waiters.forEach(w => w(false));
		this.setPlaying(false);
		if (this.watch) {
			this.previousWatch = { path: this.watch.path, kind: this.watch.kind };
		}
		this.watch = undefined;
		this.post({ command: 'status', state: 'ended', text: 'The debug session ended. Start it again (F5) to watch your code, or try an algorithm in the playground.' });
	}

	/**
	 * Debounced: VS Code sends several events per step (stopped, then the focused frame)
	 */
	scheduleRefresh(delay = 60) {
		if (this.refreshTimer) {
			clearTimeout(this.refreshTimer);
		}
		this.refreshTimer = setTimeout(() => {
			this.refreshTimer = undefined;
			void this.refresh();
		}, delay);
	}

	refresh(): Promise<void> {
		if (this.refreshAgain) {
			return this.refreshing;
		}
		this.refreshAgain = true;
		this.refreshing = this.refreshing.then(async () => {
			this.refreshAgain = false;
			try {
				await this.read();
			} catch (error: any) {
				this.post({ command: 'status', state: 'paused', text: `Could not read the variables: ${error?.message || error}` });
			}
		});
		return this.refreshing;
	}

	private async read() {
		if (!vscode.debug.activeDebugSession) {
			return;
		}
		const frames = await getStackFrames();
		if (!frames.length) {
			this.post({ command: 'status', state: 'running', text: 'Running… the structure is shown when the debugger stops.' });
			return;
		}
		this.post({ command: 'status', state: 'paused', text: `Paused at ${frameLabel(frames[0])}` });
		if (this.watch) {
			const snapshot = await readSnapshot(this.watch);
			this.post({ command: 'snapshot', snapshot, path: this.watch.path });
			if (snapshot.main && snapshot.main.values.length > 1) {
				void recordSuccessfulVisualization(this.context, vscode.debug.activeDebugSession?.id);
			}
			return;
		}
		const { candidates, frame, frames: stack } = await detectCandidates();
		// A new debug session of the same program: watch the same structure again
		const again = this.previousWatch && candidates.find(c => c.path === this.previousWatch!.path && c.kind === this.previousWatch!.kind);
		if (again) {
			this.previousWatch = undefined;
			this.watch = watchFor(again.path, again.kind, stack);
			const snapshot = await readSnapshot(this.watch);
			this.post({ command: 'snapshot', snapshot, path: this.watch.path });
			return;
		}
		this.post({ command: 'candidates', candidates, frame });
	}

	// ------------------------------------------------------------ messages

	private async onMessage(message: FromPanel) {
		switch (message.command) {
			case 'ready':
				this.ready = true;
				this.queued.splice(0).forEach(m => void this.panel.webview.postMessage(m));
				break;
			case 'watch': {
				this.previousWatch = undefined;
				const frames = await getStackFrames();
				this.watch = watchFor(message.path, message.kind, frames);
				await this.refresh();
				break;
			}
			case 'unwatch':
				this.setPlaying(false);
				this.watch = undefined;
				this.previousWatch = undefined;
				await this.refresh();
				break;
			case 'detect':
				await this.refresh();
				break;
			case 'debug':
				await this.step(message.action);
				break;
			case 'play':
				if (!this.playing) {
					this.setPlaying(true);
					this.playDelay = message.delay;
					void this.playLoop(message.action);
				}
				break;
			case 'pause':
				this.setPlaying(false);
				break;
			case 'speed':
				this.playDelay = message.delay;
				break;
			case 'rendered':
				if (message.becameSorted) {
					this.becameSorted = true;
				}
				this.renderedWaiters.splice(0).forEach(w => w());
				break;
			case 'finished':
				void recordSuccessfulVisualization(this.context, 'playground-' + new Date().toDateString());
				break;
		}
	}

	/**
	 * Steps and resolves when the debugger has stopped again (false: it did not stop in time,
	 * or the session ended). The stop is seen through the focused stack frame, which VS Code moves
	 * to the new top frame after every stop: a debug adapter tracker cannot be relied on, because
	 * this web extension runs in another extension host than the Python and Java debuggers.
	 */
	private async step(action: StepAction): Promise<boolean> {
		if (!vscode.debug.activeDebugSession) {
			return false;
		}
		const before = HAS_STACK_ITEM_EVENT ? undefined : (await getStackFrames(1))[0];
		let settled = false;
		const stopped = new Promise<boolean>(resolve => {
			const done = (value: boolean) => {
				settled = true;
				resolve(value);
			};
			this.stopWaiters.push(done);
			setTimeout(() => done(false), STOP_TIMEOUT);
		});
		this.post({ command: 'status', state: 'running', text: 'Running…' });
		try {
			await vscode.commands.executeCommand(STEP_COMMANDS[action]);
		} catch {
			return false;
		}
		if (!HAS_STACK_ITEM_EVENT) {
			// VS Code before 1.90: watch the top frame change
			void (async () => {
				while (!settled) {
					await new Promise(r => setTimeout(r, 150));
					const top = (await getStackFrames(1))[0];
					if (!settled && top && (!before || top.id !== before.id || top.line !== before.line)) {
						this.onStopped();
					}
				}
			})();
		}
		return stopped;
	}

	private async playLoop(action: StepAction) {
		while (this.playing) {
			this.becameSorted = false;
			const stopped = await this.step(action);
			if (!stopped || !this.playing) {
				break;
			}
			// Read the new state now and wait until the panel has drawn it
			if (this.refreshTimer) {
				clearTimeout(this.refreshTimer);
				this.refreshTimer = undefined;
			}
			const rendered = new Promise<void>(resolve => {
				this.renderedWaiters.push(resolve);
				setTimeout(resolve, 3000);
			});
			await this.refresh();
			await rendered;
			// Stop at the moment the structure becomes sorted
			if (this.becameSorted) {
				break;
			}
			await new Promise(r => setTimeout(r, this.playDelay));
		}
		this.setPlaying(false);
	}

	private setPlaying(playing: boolean) {
		if (this.playing !== playing) {
			this.playing = playing;
			this.post({ command: 'playing', playing });
		}
	}

	post(message: ToPanel) {
		if (this.ready) {
			void this.panel.webview.postMessage(message);
		} else {
			this.queued.push(message);
		}
	}

	private html(): string {
		const webview = this.panel.webview;
		const nonce = getNonce();
		const script = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview', 'main.js'));
		const style = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'media', 'panel.css'));
		return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; img-src ${webview.cspSource} data:; script-src 'nonce-${nonce}';">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<link rel="stylesheet" href="${style}">
	<title>Sorting Visualizer</title>
</head>
<body>
	<div id="app"></div>
	<script nonce="${nonce}" src="${script}"></script>
</body>
</html>`;
	}

	private dispose() {
		this.setPlaying(false);
		SortingPanel.current = undefined;
		this.disposables.forEach(d => d.dispose());
	}
}
