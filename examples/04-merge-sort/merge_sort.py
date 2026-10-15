"""
Merge sort for Debug Sorting Algorithms Visualizer.

Set a breakpoint on the line marked "BREAKPOINT", start debugging (F5), open the
visualizer (the "Sorting" button in the status bar) and pick "arr". See README.md.
"""


def merge_sort(arr):
    if len(arr) > 1:  # BREAKPOINT
        mid = len(arr) // 2
        left = arr[:mid]
        right = arr[mid:]

        merge_sort(left)
        merge_sort(right)

        i = j = k = 0
        while i < len(left) and j < len(right):
            if left[i] <= right[j]:
                arr[k] = left[i]
                i += 1
            else:
                arr[k] = right[j]
                j += 1
            k += 1

        while i < len(left):
            arr[k] = left[i]
            i += 1
            k += 1

        while j < len(right):
            arr[k] = right[j]
            j += 1
            k += 1


if __name__ == "__main__":
    numbers = [38, 27, 43, 3, 9, 82, 10]
    merge_sort(numbers)
    print(numbers)
