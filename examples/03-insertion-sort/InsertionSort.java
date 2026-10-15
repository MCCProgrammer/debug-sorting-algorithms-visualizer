import java.util.Arrays;

/**
 * Insertion sort for Debug Sorting Algorithms Visualizer.
 *
 * Set a breakpoint on the line marked "BREAKPOINT", start debugging (F5), open the
 * visualizer (the "Sorting" button in the status bar) and pick "arr". See README.md.
 */
public class InsertionSort {

    static void insertionSort(int[] arr) {
        for (int i = 1; i < arr.length; i++) { // BREAKPOINT
            int key = arr[i];
            int j = i - 1;
            while (j >= 0 && arr[j] > key) {
                arr[j + 1] = arr[j];
                j--;
            }
            arr[j + 1] = key;
        }
    }

    public static void main(String[] args) {
        int[] numbers = {12, 11, 13, 5, 6, 30, 1};
        insertionSort(numbers);
        System.out.println(Arrays.toString(numbers));
    }
}
