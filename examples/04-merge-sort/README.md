# Merge sort

Merge sort splits the array in halves, sorts each half recursively and merges the two sorted halves.

## Files

- [`merge_sort.py`](merge_sort.py): Python version
- [`MergeSort.java`](MergeSort.java): Java version

## Before you start

- Install **Debug Sorting Algorithms Visualizer** from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=MCCProgrammer.debug-sorting-algorithms-visualizer) or [Open VSX](https://open-vsx.org/extension/MCCProgrammer/debug-sorting-algorithms-visualizer).
- For Python: the **Python Debugger** extension (`ms-python.debugpy`).
- For Java: the **Extension Pack for Java** (`vscjava.vscode-java-pack`).
- Open the `examples` folder in VS Code (**File → Open Folder**), so the launch configurations in `examples/.vscode` are available.

## How to test

1. Open `merge_sort.py` or `MergeSort.java`.
2. Set a breakpoint on the line marked `BREAKPOINT` (click left of the line number).
3. In **Run and Debug**, pick **Python: current file** or **Java: current file** and press F5.
4. When the program stops, click **Sorting** in the status bar (or the sorting icon at the top right of the editor, or right-click `arr` in **Variables** → **Visualize Sorting**).
5. Click **arr** in the list.
6. Choose **Play with Step Into (recursion)** and press **Play**. Step Over would run each recursive call in one step.

## What you should see

- [ ] Inside the recursive calls, `arr` stays the array you picked: its label says where it was read ("outer call of merge_sort" in Python, "in mergeSort" in Java).
- [ ] The halves are drawn below it: `left` and `right` in Python (and the `arr` of the current call), `leftPart` and `rightPart` in Java.
- [ ] While the halves are there, `i`, `j` and `k` are shown as values: they index different arrays.
- [ ] Values copied back from a half fly in from where they are.

Use **◀ ▶** to go back and forth through the steps already drawn, and **Try an algorithm on this data** to run the same values in the playground.
