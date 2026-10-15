# Examples

Programs to try **Debug Sorting Algorithms Visualizer** with your own code. Each folder has a Python version, a Java version and a README with the steps and what you should see.

| Folder | Algorithm |
|---|---|
| [01-bubble-sort](01-bubble-sort/) | Bubble sort |
| [02-selection-sort](02-selection-sort/) | Selection sort |
| [03-insertion-sort](03-insertion-sort/) | Insertion sort |
| [04-merge-sort](04-merge-sort/) | Merge sort (recursive, with sub-arrays) |
| [05-quick-sort](05-quick-sort/) | Quick sort (Lomuto partition) |
| [06-heap-sort](06-heap-sort/) | Heap sort |
| [07-linked-list-sort](07-linked-list-sort/) | Insertion sort and merge sort on a linked list |

## Getting the examples

Download the repository ([ZIP](https://github.com/MCCProgrammer/debug-sorting-algorithms-visualizer/archive/refs/heads/main.zip)) or clone it:

```bash
git clone https://github.com/MCCProgrammer/debug-sorting-algorithms-visualizer.git
```

Then open the `examples` folder in VS Code (**File → Open Folder**). You need the **Python Debugger** extension for Python and the **Extension Pack for Java** for Java.

## In every folder

1. Set a breakpoint on the line marked `BREAKPOINT`.
2. Press F5 with **Python: current file** or **Java: current file** (from `examples/.vscode/launch.json`).
3. When the program stops, click **Sorting** in the status bar and pick the array or list.
4. Press **Play**. Use **Step Into (recursion)** for merge, quick and heap sort.
