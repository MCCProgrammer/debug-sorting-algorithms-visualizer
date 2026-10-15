"""
Insertion sort for Debug Sorting Algorithms Visualizer.

Set a breakpoint on the line marked "BREAKPOINT", start debugging (F5), open the
visualizer (the "Sorting" button in the status bar) and pick "arr". See README.md.
"""


def insertion_sort(arr):
    for i in range(1, len(arr)):  # BREAKPOINT
        key = arr[i]
        j = i - 1
        while j >= 0 and arr[j] > key:
            arr[j + 1] = arr[j]
            j -= 1
        arr[j + 1] = key


if __name__ == "__main__":
    numbers = [12, 11, 13, 5, 6, 30, 1]
    insertion_sort(numbers)
    print(numbers)
