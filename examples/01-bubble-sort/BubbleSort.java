import java.util.Arrays;

/**
 * Bubble sort for Debug Sorting Algorithms Visualizer.
 *
 * Set a breakpoint on the line marked "BREAKPOINT", start debugging (F5), open the
 * visualizer (the "Sorting" button in the status bar) and pick "arr". See README.md.
 */
public class BubbleSort {

    static void bubbleSort(int[] arr) {
        int n = arr.length; // BREAKPOINT
        for (int i = 0; i < n - 1; i++) {
            boolean swapped = false;
            for (int j = 0; j < n - 1 - i; j++) {
                if (arr[j] > arr[j + 1]) {
                    int temp = arr[j];
                    arr[j] = arr[j + 1];
                    arr[j + 1] = temp;
                    swapped = true;
                }
            }
            if (!swapped) {
                break;
            }
        }
    }

    public static void main(String[] args) {
        int[] numbers = {38, 27, 43, 3, 9, 82, 10};
        bubbleSort(numbers);
        System.out.println(Arrays.toString(numbers));
    }
}
