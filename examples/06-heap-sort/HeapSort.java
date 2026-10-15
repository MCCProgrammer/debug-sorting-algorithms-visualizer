import java.util.Arrays;

/**
 * Heap sort for Debug Sorting Algorithms Visualizer.
 *
 * Set a breakpoint on the line marked "BREAKPOINT", start debugging (F5), open the
 * visualizer (the "Sorting" button in the status bar) and pick "arr". See README.md.
 */
public class HeapSort {

    static void heapify(int[] arr, int n, int i) {
        int largest = i;
        int left = 2 * i + 1;
        int right = 2 * i + 2;
        if (left < n && arr[left] > arr[largest]) {
            largest = left;
        }
        if (right < n && arr[right] > arr[largest]) {
            largest = right;
        }
        if (largest != i) {
            int temp = arr[i];
            arr[i] = arr[largest];
            arr[largest] = temp;
            heapify(arr, n, largest);
        }
    }

    static void heapSort(int[] arr) {
        int n = arr.length; // BREAKPOINT
        for (int i = n / 2 - 1; i >= 0; i--) {
            heapify(arr, n, i);
        }
        for (int end = n - 1; end > 0; end--) {
            int temp = arr[0];
            arr[0] = arr[end];
            arr[end] = temp;
            heapify(arr, end, 0);
        }
    }

    public static void main(String[] args) {
        int[] numbers = {12, 11, 13, 5, 6, 7, 2};
        heapSort(numbers);
        System.out.println(Arrays.toString(numbers));
    }
}
