# Bubble sort

Bubble sort walks the array again and again, swapping neighbours that are out of order. After each pass the largest remaining value has "bubbled up" to the end.

## Files

- [`bubble_sort.py`](bubble_sort.py): Python version
- [`BubbleSort.java`](BubbleSort.java): Java version

## Before you start

- Install **Debug Sorting Algorithms Visualizer** from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=MCCProgrammer.debug-sorting-algorithms-visualizer) or [Open VSX](https://open-vsx.org/extension/MCCProgrammer/debug-sorting-algorithms-visualizer).
- For Python: the **Python Debugger** extension (`ms-python.debugpy`).
- For Java: the **Extension Pack for Java** (`vscjava.vscode-java-pack`).
- Open the `examples` folder in VS Code (**File → Open Folder**), so the launch configurations in `examples/.vscode` are available.

## How to test

1. Open `bubble_sort.py` or `BubbleSort.java`.
2. Set a breakpoint on the line marked `BREAKPOINT` (click left of the line number).
3. In **Run and Debug**, pick **Python: current file** or **Java: current file** and press F5.
4. When the program stops, click **Sorting** in the status bar (or the sorting icon at the top right of the editor, or right-click `arr` in **Variables** → **Visualize Sorting**).
5. Click **arr** in the list.
6. Press **Play** (with Step Over), or **Step Over** one line at a time.

## What you should see

- [ ] `arr` is drawn as bars: `38 27 43 3 9 82 10`.
- [ ] `i` and `j` are drawn as pointers under the array; `n` and `swapped` as values above it.
- [ ] Python: every swap animates the two bars crossing ("Swapped 27 and 38").
- [ ] Java: the swap takes three lines. `arr[j] = arr[j + 1]` copies a bar (purple), then `arr[j + 1] = temp` brings the old value back from the `temp` chip. The counter shows one swap.
- [ ] When the array is sorted, Play stops by itself and every bar turns green: "Sorted!". 11 swaps in total.

Use **◀ ▶** to go back and forth through the steps already drawn, and **Try an algorithm on this data** to run the same values in the playground.
