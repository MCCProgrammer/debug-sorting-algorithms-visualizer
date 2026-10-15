# Insertion sort

Insertion sort takes each value (`key`) and shifts the bigger values on its left one place right, until the key's place is free.

## Files

- [`insertion_sort.py`](insertion_sort.py): Python version
- [`InsertionSort.java`](InsertionSort.java): Java version

## Before you start

- Install **Debug Sorting Algorithms Visualizer** from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=MCCProgrammer.debug-sorting-algorithms-visualizer) or [Open VSX](https://open-vsx.org/extension/MCCProgrammer/debug-sorting-algorithms-visualizer).
- For Python: the **Python Debugger** extension (`ms-python.debugpy`).
- For Java: the **Extension Pack for Java** (`vscjava.vscode-java-pack`).
- Open the `examples` folder in VS Code (**File → Open Folder**), so the launch configurations in `examples/.vscode` are available.

## How to test

1. Open `insertion_sort.py` or `InsertionSort.java`.
2. Set a breakpoint on the line marked `BREAKPOINT` (click left of the line number).
3. In **Run and Debug**, pick **Python: current file** or **Java: current file** and press F5.
4. When the program stops, click **Sorting** in the status bar (or the sorting icon at the top right of the editor, or right-click `arr` in **Variables** → **Visualize Sorting**).
5. Click **arr** in the list.
6. Press **Play** (with Step Over), or **Step Over** one line at a time.

## What you should see

- [ ] `key` appears as a value chip when it is taken out of the array.
- [ ] Each `arr[j + 1] = arr[j]` animates as a copy flying one place right (purple): for a moment the value is in the array twice.
- [ ] `arr[j + 1] = key` brings the key back from its chip into the free place.
- [ ] `j` becomes `-1` when the key goes to the front: it is then shown as a value, not a pointer.

Use **◀ ▶** to go back and forth through the steps already drawn, and **Try an algorithm on this data** to run the same values in the playground.
