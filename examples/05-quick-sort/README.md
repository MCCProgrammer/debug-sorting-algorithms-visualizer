# Quick sort

Quick sort (Lomuto partition) puts the last value, the pivot, in its final place, with the smaller values on its left and the bigger ones on its right, then sorts both sides recursively.

## Files

- [`quick_sort.py`](quick_sort.py): Python version
- [`QuickSort.java`](QuickSort.java): Java version

## Before you start

- Install **Debug Sorting Algorithms Visualizer** from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=MCCProgrammer.debug-sorting-algorithms-visualizer) or [Open VSX](https://open-vsx.org/extension/MCCProgrammer/debug-sorting-algorithms-visualizer).
- For Python: the **Python Debugger** extension (`ms-python.debugpy`).
- For Java: the **Extension Pack for Java** (`vscjava.vscode-java-pack`).
- Open the `examples` folder in VS Code (**File → Open Folder**), so the launch configurations in `examples/.vscode` are available.

## How to test

1. Open `quick_sort.py` or `QuickSort.java`.
2. Set a breakpoint on the line marked `BREAKPOINT` (click left of the line number).
3. In **Run and Debug**, pick **Python: current file** or **Java: current file** and press F5.
4. When the program stops, click **Sorting** in the status bar (or the sorting icon at the top right of the editor, or right-click `arr` in **Variables** → **Visualize Sorting**).
5. Click **arr** in the list.
6. Choose **Play with Step Into (recursion)** and press **Play**.

## What you should see

- [ ] Inside `partition`, `arr` is still drawn (read from `quick_sort`), with the pointers `low`, `high`, `i` and `j`.
- [ ] `pivot` is shown as a value.
- [ ] Every swap of the partition animates; the last one puts the pivot in place.

Use **◀ ▶** to go back and forth through the steps already drawn, and **Try an algorithm on this data** to run the same values in the playground.
