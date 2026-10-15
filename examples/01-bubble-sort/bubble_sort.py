"""
Bubble sort for Debug Sorting Algorithms Visualizer.

Set a breakpoint on the line marked "BREAKPOINT", start debugging (F5), open the
visualizer (the "Sorting" button in the status bar) and pick "arr". See README.md.
"""


def bubble_sort(arr):
    n = len(arr)  # BREAKPOINT
    for i in range(n - 1):
        swapped = False
        for j in range(n - 1 - i):
            if arr[j] > arr[j + 1]:
                arr[j], arr[j + 1] = arr[j + 1], arr[j]
                swapped = True
        if not swapped:
            break


if __name__ == "__main__":
    numbers = [38, 27, 43, 3, 9, 82, 10]
    bubble_sort(numbers)
    print(numbers)
