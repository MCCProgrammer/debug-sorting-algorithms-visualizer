# Sorting a linked list

Insertion sort and merge sort on a singly linked list, both by relinking the nodes (the values never move between nodes).

## Files

- [`linked_list_sort.py`](linked_list_sort.py): Python version
- [`LinkedListSort.java`](LinkedListSort.java): Java version

## Before you start

- Install **Debug Sorting Algorithms Visualizer** from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=MCCProgrammer.debug-sorting-algorithms-visualizer) or [Open VSX](https://open-vsx.org/extension/MCCProgrammer/debug-sorting-algorithms-visualizer).
- For Python: the **Python Debugger** extension (`ms-python.debugpy`).
- For Java: the **Extension Pack for Java** (`vscjava.vscode-java-pack`).
- Open the `examples` folder in VS Code (**File → Open Folder**), so the launch configurations in `examples/.vscode` are available.

## How to test

1. Open `linked_list_sort.py` or `LinkedListSort.java`.
2. Set breakpoints on the lines marked `BREAKPOINT 1` and `BREAKPOINT 2`.
3. In **Run and Debug**, pick **Python: current file** or **Java: current file** and press F5.
4. When the program stops at `BREAKPOINT 1`, click **Sorting** in the status bar and pick **head** (a linked list of 5 nodes).
5. Press **Play** (with Step Over).
6. Then press **Continue** to reach `BREAKPOINT 2`, click **Watch something else**, pick **head** (7 nodes), choose **Play with Step Into (recursion)** and press **Play**.

## What you should see

### BREAKPOINT 1: insertion sort
- [ ] Each row is a list from its first node: `sorted_head` (`sortedHead`) grows while `current` shrinks.
- [ ] Variables pointing into a list (`head`, `walker`, `next_node`) are drawn as pointers under their node.
- [ ] Each `node.next = ...` is described ("2.next → 4") and the node turns purple. The counter counts the relinks.
- [ ] After `head = insertion_sort(head)`, `head` is `1 → 2 → 3 → 4 → 5`: Play stops, "Sorted!".

### BREAKPOINT 2: merge sort
- [ ] The nodes held by the outer calls stay drawn while a recursive call works on a part of the list: the list splits into `second`, `middle`, `left`, `right` rows.
- [ ] In `merge`, the `dummy` node (value 0) starts the merged list, and `tail`, `a` and `b` are pointers.
- [ ] At the end, `head` is `3 → 9 → 10 → 27 → 38 → 43 → 82`.

Node identities come from the debugger (`Node@45` in Java, the object address in Python), so a node keeps its place in the drawing when it is relinked.
