import java.util.Arrays;

/**
 * Quick sort (Lomuto partition) for Debug Sorting Algorithms Visualizer.
 *
 * Set a breakpoint on the line marked "BREAKPOINT", start debugging (F5), open the
 * visualizer (the "Sorting" button in the status bar) and pick "arr". See README.md.
 */
public class QuickSort {

    static int partition(int[] arr, int low, int high) {
        int pivot = arr[high];
        int i = low - 1;
        for (int j = low; j < high; j++) {
            if (arr[j] <= pivot) {
                i++;
                int temp = arr[i];
                arr[i] = arr[j];
                arr[j] = temp;
            }
        }
        int temp = arr[i + 1];
        arr[i + 1] = arr[high];
        arr[high] = temp;
        return i + 1;
    }

    static void quickSort(int[] arr, int low, int high) {
        if (low < high) { // BREAKPOINT
            int p = partition(arr, low, high);
            quickSort(arr, low, p - 1);
            quickSort(arr, p + 1, high);
        }
    }

    public static void main(String[] args) {
        int[] numbers = {10, 80, 30, 90, 40, 50, 70};
        quickSort(numbers, 0, numbers.length - 1);
        System.out.println(Arrays.toString(numbers));
    }
}
