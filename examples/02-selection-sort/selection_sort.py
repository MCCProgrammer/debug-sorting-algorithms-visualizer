"""
Selection sort for Debug Sorting Algorithms Visualizer.

Set a breakpoint on the line marked "BREAKPOINT", start debugging (F5), open the
visualizer (the "Sorting" button in the status bar) and pick "arr". See README.md.
"""


def selection_sort(arr):
    n = len(arr)  # BREAKPOINT
    for i in range(n - 1):
        min_index = i
        for j in range(i + 1, n):
            if arr[j] < arr[min_index]:
                min_index = j
        arr[i], arr[min_index] = arr[min_index], arr[i]


if __name__ == "__main__":
    numbers = [64, 25, 12, 22, 11, 90, 3]
    selection_sort(numbers)
    print(numbers)
