# Selection sort

Selection sort finds the smallest value in the unsorted part and swaps it to the front, one position at a time.

## Files

- [`selection_sort.py`](selection_sort.py): Python version
- [`SelectionSort.java`](SelectionSort.java): Java version

## Before you start

- Install **Debug Sorting Algorithms Visualizer** from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=MCCProgrammer.debug-sorting-algorithms-visualizer) or [Open VSX](https://open-vsx.org/extension/MCCProgrammer/debug-sorting-algorithms-visualizer).
- For Python: the **Python Debugger** extension (`ms-python.debugpy`).
- For Java: the **Extension Pack for Java** (`vscjava.vscode-java-pack`).
- Open the `examples` folder in VS Code (**File → Open Folder**), so the launch configurations in `examples/.vscode` are available.

## How to test

1. Open `selection_sort.py` or `SelectionSort.java`.
2. Set a breakpoint on the line marked `BREAKPOINT` (click left of the line number).
3. In **Run and Debug**, pick **Python: current file** or **Java: current file** and press F5.
4. When the program stops, click **Sorting** in the status bar (or the sorting icon at the top right of the editor, or right-click `arr` in **Variables** → **Visualize Sorting**).
5. Click **arr** in the list.
6. Press **Play** (with Step Over), or **Step Over** one line at a time.

## What you should see

- [ ] `min_index` (`minIndex` in Java) moves along with `j` while the smallest value is searched for.
- [ ] One swap per pass, at most: 3 swaps for `64 25 12 22 11 90 3`.
- [ ] Play stops when the array is sorted.

Use **◀ ▶** to go back and forth through the steps already drawn, and **Try an algorithm on this data** to run the same values in the playground.
