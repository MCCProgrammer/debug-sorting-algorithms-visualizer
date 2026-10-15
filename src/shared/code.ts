// ============================================================================
// PLAYGROUND SOURCE CODE: each algorithm in Python and Java
// ============================================================================
//
// A line ending in "# @N" / "// @N" runs pseudocode line N, so the playground highlights
// it in the real code too. The markers are removed before the code is shown.

import { AlgorithmId } from './algorithms';

export type CodeLanguage = 'python' | 'java';

export interface CodeLine {
	text: string;
	step: number; // Pseudocode line, 0 when none
}

const PYTHON: Record<AlgorithmId, string> = {
	bubble: `
def bubble_sort(a):
    n = len(a)
    for i in range(n - 1):  # @1
        swapped = False  # @2
        for j in range(n - 1 - i):  # @3
            if a[j] > a[j + 1]:  # @4
                a[j], a[j + 1] = a[j + 1], a[j]  # @5
                swapped = True  # @6
        if not swapped:  # @7
            break  # @7`,

	selection: `
def selection_sort(a):
    n = len(a)
    for i in range(n - 1):  # @1
        min_index = i  # @2
        for j in range(i + 1, n):  # @3
            if a[j] < a[min_index]:  # @4
                min_index = j  # @5
        a[i], a[min_index] = a[min_index], a[i]  # @6`,

	insertion: `
def insertion_sort(a):
    for i in range(1, len(a)):  # @1
        key = a[i]  # @2
        j = i - 1  # @3
        while j >= 0 and a[j] > key:  # @4
            a[j + 1] = a[j]  # @5
            j -= 1  # @6
        a[j + 1] = key  # @7`,

	merge: `
def merge_sort(a, lo, hi):  # @1
    if lo >= hi:  # @2
        return  # @2
    mid = (lo + hi) // 2  # @3
    merge_sort(a, lo, mid)  # @4
    merge_sort(a, mid + 1, hi)  # @5
    aux = a[lo:hi + 1]  # @6
    i, j, k = 0, mid + 1 - lo, lo  # @6
    while i <= mid - lo and j <= hi - lo:  # @7
        if aux[i] <= aux[j]:  # @8
            a[k] = aux[i]  # @8
            i += 1  # @8
        else:  # @8
            a[k] = aux[j]  # @8
            j += 1  # @8
        k += 1  # @8
    for rest in aux[i:mid - lo + 1] + aux[j:]:  # @9
        a[k] = rest  # @9
        k += 1  # @9`,

	quick: `
def quick_sort(a, lo, hi):  # @1
    if lo >= hi:  # @2
        return  # @2
    pivot = a[hi]  # @3
    i = lo  # @4
    for j in range(lo, hi):  # @5
        if a[j] < pivot:  # @6
            a[i], a[j] = a[j], a[i]  # @7
            i += 1  # @7
    a[i], a[hi] = a[hi], a[i]  # @8
    quick_sort(a, lo, i - 1)  # @9
    quick_sort(a, i + 1, hi)  # @9`,

	heap: `
def heap_sort(a):
    n = len(a)
    for i in range(n // 2 - 1, -1, -1):  # @1
        sift_down(a, i, n)  # @1
    for end in range(n - 1, 0, -1):  # @2
        a[0], a[end] = a[end], a[0]  # @3
        sift_down(a, 0, end)  # @4

def sift_down(a, i, size):
    while 2 * i + 1 < size:  # @5
        c = 2 * i + 1  # @6
        if c + 1 < size and a[c + 1] > a[c]:  # @6
            c += 1  # @6
        if a[i] >= a[c]:  # @7
            return  # @7
        a[i], a[c] = a[c], a[i]  # @8
        i = c  # @8`,

	listInsertion: `
def insertion_sort(head):
    sorted_head = None  # @1
    while head is not None:  # @2
        node = head  # @3
        head = head.next  # @3
        if sorted_head is None or node.value < sorted_head.value:  # @4
            node.next = sorted_head  # @5
            sorted_head = node  # @5
        else:
            cur = sorted_head  # @4
            while cur.next is not None and cur.next.value <= node.value:  # @4
                cur = cur.next  # @4
            node.next = cur.next  # @5
            cur.next = node  # @5
    return sorted_head`,

	listMerge: `
def merge_sort(head):  # @1
    if head is None or head.next is None:  # @2
        return head  # @2
    slow, fast = head, head.next  # @3
    while fast is not None and fast.next is not None:  # @3
        slow, fast = slow.next, fast.next.next  # @3
    second = slow.next  # @3
    slow.next = None  # @3
    left = merge_sort(head)  # @4
    right = merge_sort(second)  # @5
    return merge(left, right)  # @6

def merge(a, b):
    dummy = tail = Node(0)
    while a is not None and b is not None:  # @7
        if a.value <= b.value:  # @7
            tail.next, a = a, a.next  # @7
        else:  # @7
            tail.next, b = b, b.next  # @7
        tail = tail.next  # @7
    tail.next = a if a is not None else b  # @8
    return dummy.next`,
};

const JAVA: Record<AlgorithmId, string> = {
	bubble: `
static void bubbleSort(int[] a) {
    int n = a.length;
    for (int i = 0; i < n - 1; i++) { // @1
        boolean swapped = false; // @2
        for (int j = 0; j < n - 1 - i; j++) { // @3
            if (a[j] > a[j + 1]) { // @4
                int temp = a[j]; // @5
                a[j] = a[j + 1]; // @5
                a[j + 1] = temp; // @5
                swapped = true; // @6
            }
        }
        if (!swapped) { // @7
            break; // @7
        }
    }
}`,

	selection: `
static void selectionSort(int[] a) {
    int n = a.length;
    for (int i = 0; i < n - 1; i++) { // @1
        int minIndex = i; // @2
        for (int j = i + 1; j < n; j++) { // @3
            if (a[j] < a[minIndex]) { // @4
                minIndex = j; // @5
            }
        }
        int temp = a[minIndex]; // @6
        a[minIndex] = a[i]; // @6
        a[i] = temp; // @6
    }
}`,

	insertion: `
static void insertionSort(int[] a) {
    for (int i = 1; i < a.length; i++) { // @1
        int key = a[i]; // @2
        int j = i - 1; // @3
        while (j >= 0 && a[j] > key) { // @4
            a[j + 1] = a[j]; // @5
            j--; // @6
        }
        a[j + 1] = key; // @7
    }
}`,

	merge: `
static void mergeSort(int[] a, int lo, int hi) { // @1
    if (lo >= hi) { // @2
        return; // @2
    }
    int mid = (lo + hi) / 2; // @3
    mergeSort(a, lo, mid); // @4
    mergeSort(a, mid + 1, hi); // @5
    int[] aux = Arrays.copyOfRange(a, lo, hi + 1); // @6
    int i = 0, j = mid + 1 - lo, k = lo; // @6
    while (i <= mid - lo && j <= hi - lo) { // @7
        if (aux[i] <= aux[j]) { // @8
            a[k++] = aux[i++]; // @8
        } else { // @8
            a[k++] = aux[j++]; // @8
        }
    }
    while (i <= mid - lo) { // @9
        a[k++] = aux[i++]; // @9
    }
    while (j <= hi - lo) { // @9
        a[k++] = aux[j++]; // @9
    }
}`,

	quick: `
static void quickSort(int[] a, int lo, int hi) { // @1
    if (lo >= hi) { // @2
        return; // @2
    }
    int pivot = a[hi]; // @3
    int i = lo; // @4
    for (int j = lo; j < hi; j++) { // @5
        if (a[j] < pivot) { // @6
            int temp = a[i]; // @7
            a[i] = a[j]; // @7
            a[j] = temp; // @7
            i++; // @7
        }
    }
    a[hi] = a[i]; // @8
    a[i] = pivot; // @8
    quickSort(a, lo, i - 1); // @9
    quickSort(a, i + 1, hi); // @9
}`,

	heap: `
static void heapSort(int[] a) {
    int n = a.length;
    for (int i = n / 2 - 1; i >= 0; i--) { // @1
        siftDown(a, i, n); // @1
    }
    for (int end = n - 1; end > 0; end--) { // @2
        int temp = a[0]; // @3
        a[0] = a[end]; // @3
        a[end] = temp; // @3
        siftDown(a, 0, end); // @4
    }
}

static void siftDown(int[] a, int i, int size) {
    while (2 * i + 1 < size) { // @5
        int c = 2 * i + 1; // @6
        if (c + 1 < size && a[c + 1] > a[c]) { // @6
            c++; // @6
        }
        if (a[i] >= a[c]) { // @7
            return; // @7
        }
        int temp = a[i]; // @8
        a[i] = a[c]; // @8
        a[c] = temp; // @8
        i = c; // @8
    }
}`,

	listInsertion: `
static Node insertionSort(Node head) {
    Node sorted = null; // @1
    while (head != null) { // @2
        Node node = head; // @3
        head = head.next; // @3
        if (sorted == null || node.value < sorted.value) { // @4
            node.next = sorted; // @5
            sorted = node; // @5
        } else {
            Node cur = sorted; // @4
            while (cur.next != null && cur.next.value <= node.value) { // @4
                cur = cur.next; // @4
            }
            node.next = cur.next; // @5
            cur.next = node; // @5
        }
    }
    return sorted;
}`,

	listMerge: `
static Node mergeSort(Node head) { // @1
    if (head == null || head.next == null) { // @2
        return head; // @2
    }
    Node slow = head, fast = head.next; // @3
    while (fast != null && fast.next != null) { // @3
        slow = slow.next; // @3
        fast = fast.next.next; // @3
    }
    Node second = slow.next; // @3
    slow.next = null; // @3
    Node left = mergeSort(head); // @4
    Node right = mergeSort(second); // @5
    return merge(left, right); // @6
}

static Node merge(Node a, Node b) {
    Node dummy = new Node(0), tail = dummy;
    while (a != null && b != null) { // @7
        if (a.value <= b.value) { // @7
            tail.next = a; // @7
            a = a.next; // @7
        } else { // @7
            tail.next = b; // @7
            b = b.next; // @7
        }
        tail = tail.next; // @7
    }
    tail.next = (a != null) ? a : b; // @8
    return dummy.next;
}`,
};

const MARKER = /\s*(?:#|\/\/) @(\d+)$/;

export function algorithmCode(id: AlgorithmId, language: CodeLanguage): CodeLine[] {
	const source = (language === 'python' ? PYTHON : JAVA)[id];
	return source.replace(/^\n/, '').split('\n').map(line => {
		const match = MARKER.exec(line);
		return { text: match ? line.slice(0, match.index) : line, step: match ? parseInt(match[1], 10) : 0 };
	});
}
