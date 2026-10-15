# Heap sort

Heap sort turns the array into a max-heap, then repeatedly swaps the largest value (at index 0) to the end and sifts the new root down.

## Files

- [`heap_sort.py`](heap_sort.py): Python version
- [`HeapSort.java`](HeapSort.java): Java version

## Before you start

- Install **Debug Sorting Algorithms Visualizer** from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=MCCProgrammer.debug-sorting-algorithms-visualizer) or [Open VSX](https://open-vsx.org/extension/MCCProgrammer/debug-sorting-algorithms-visualizer).
- For Python: the **Python Debugger** extension (`ms-python.debugpy`).
- For Java: the **Extension Pack for Java** (`vscjava.vscode-java-pack`).
- Open the `examples` folder in VS Code (**File → Open Folder**), so the launch configurations in `examples/.vscode` are available.

## How to test

1. Open `heap_sort.py` or `HeapSort.java`.
2. Set a breakpoint on the line marked `BREAKPOINT` (click left of the line number).
3. In **Run and Debug**, pick **Python: current file** or **Java: current file** and press F5.
4. When the program stops, click **Sorting** in the status bar (or the sorting icon at the top right of the editor, or right-click `arr` in **Variables** → **Visualize Sorting**).
5. Click **arr** in the list.
6. Choose **Play with Step Into (recursion)** and press **Play** (`heapify` calls itself).

## What you should see

- [ ] `largest`, `left` and `right` are pointers inside `heapify`; `end` in `heap_sort`.
- [ ] Each swap of the root with `arr[end]` puts one more value in its final place.

Use **◀ ▶** to go back and forth through the steps already drawn, and **Try an algorithm on this data** to run the same values in the playground.
