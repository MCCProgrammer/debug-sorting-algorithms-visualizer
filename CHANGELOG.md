# Changelog

All notable changes to Debug Sorting Algorithms Visualizer are documented here.

## [0.1.0] - 2026-10-15

First release.

### Your code (while debugging)

- Lists the arrays of numbers or strings and the linked lists in the current frame, and in the fields of `self` / `this`
- Animates every step: moved values, values copied from another cell, array or variable, swaps in one line or through a temporary variable, relinked nodes
- Describes what changed at each step and counts steps, swaps and writes (relinks for linked lists)
- Draws int variables that are positions as pointers, and other variables as values
- Follows the picked array through recursive calls, with the arrays of the current call below it
- Linked lists drawn from their first node, using the node variables of every frame on the call stack
- Play with Step Over, Step Into or breakpoint to breakpoint, at a speed that can be changed while playing (up to 3 s per step, slower animations at slow speeds); stops when the structure is sorted
- History of the steps already drawn, back and forth
- Step Over, Step Into, Step Out and Continue in the panel
- Opens from the status bar, the editor title, the debug toolbar, or the Variables view (right-click → Visualize Sorting)
- Watches the same variable again in a new debug session

### Playground

- Bubble, selection, insertion, merge, quick and heap sort on an array; insertion and merge sort on a linked list
- The algorithm as pseudocode, Python or Java, with the current line highlighted
- Comparisons, swaps and moves counted, complexity of each algorithm
- Your own values, random values of a chosen size (2 to 40), or the values of the array you are debugging
- Play, pause, step forward and back

### Stats

- All 8 algorithms on the same values: 2 to 500 values, in random order, nearly sorted, reversed or sorted
- Best, average and worst case, extra space and stability, then the comparisons, swaps, moves and steps each algorithm made

### Other

- Bars or cells, in the colours of the VS Code theme
- Examples in Python and Java for every algorithm, with a README each
- One-time rating prompt after 5 sessions
