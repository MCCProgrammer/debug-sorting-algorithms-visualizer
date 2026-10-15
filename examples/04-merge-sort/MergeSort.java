import java.util.Arrays;

/**
 * Merge sort for Debug Sorting Algorithms Visualizer.
 *
 * Set a breakpoint on the line marked "BREAKPOINT", start debugging (F5), open the
 * visualizer (the "Sorting" button in the status bar) and pick "arr". See README.md.
 */
public class MergeSort {

    static void mergeSort(int[] arr, int left, int right) {
        if (left < right) { // BREAKPOINT
            int mid = left + (right - left) / 2;
            mergeSort(arr, left, mid);
            mergeSort(arr, mid + 1, right);
            merge(arr, left, mid, right);
        }
    }

    static void merge(int[] arr, int left, int mid, int right) {
        int[] leftPart = Arrays.copyOfRange(arr, left, mid + 1);
        int[] rightPart = Arrays.copyOfRange(arr, mid + 1, right + 1);

        int i = 0, j = 0, k = left;
        while (i < leftPart.length && j < rightPart.length) {
            if (leftPart[i] <= rightPart[j]) {
                arr[k] = leftPart[i];
                i++;
            } else {
                arr[k] = rightPart[j];
                j++;
            }
            k++;
        }
        while (i < leftPart.length) {
            arr[k] = leftPart[i];
            i++;
            k++;
        }
        while (j < rightPart.length) {
            arr[k] = rightPart[j];
            j++;
            k++;
        }
    }

    public static void main(String[] args) {
        int[] numbers = {38, 27, 43, 3, 9, 82, 10};
        mergeSort(numbers, 0, numbers.length - 1);
        System.out.println(Arrays.toString(numbers));
    }
}
