import java.util.ArrayList;
import java.util.List;

/**
 * Sorting a singly linked list for Debug Sorting Algorithms Visualizer:
 * insertion sort and merge sort, both by relinking the nodes.
 *
 * Set breakpoints on the lines marked "BREAKPOINT", start debugging (F5), open the
 * visualizer (the "Sorting" button in the status bar) and pick "head". See README.md.
 */
public class LinkedListSort {

    static class Node {
        int value;
        Node next;

        Node(int value, Node next) {
            this.value = value;
            this.next = next;
        }
    }

    static Node fromArray(int... values) {
        Node head = null;
        for (int i = values.length - 1; i >= 0; i--) {
            head = new Node(values[i], head);
        }
        return head;
    }

    static List<Integer> toList(Node head) {
        List<Integer> values = new ArrayList<>();
        for (Node node = head; node != null; node = node.next) {
            values.add(node.value);
        }
        return values;
    }

    static Node insertionSort(Node head) {
        Node sortedHead = null; // BREAKPOINT 1
        Node current = head;
        while (current != null) {
            Node nextNode = current.next;
            if (sortedHead == null || current.value < sortedHead.value) {
                current.next = sortedHead;
                sortedHead = current;
            } else {
                Node walker = sortedHead;
                while (walker.next != null && walker.next.value <= current.value) {
                    walker = walker.next;
                }
                current.next = walker.next;
                walker.next = current;
            }
            current = nextNode;
        }
        return sortedHead;
    }

    static Node middleOf(Node head) {
        Node slow = head;
        Node fast = head.next;
        while (fast != null && fast.next != null) {
            slow = slow.next;
            fast = fast.next.next;
        }
        return slow;
    }

    static Node merge(Node a, Node b) {
        Node dummy = new Node(0, null);
        Node tail = dummy;
        while (a != null && b != null) {
            if (a.value <= b.value) {
                tail.next = a;
                a = a.next;
            } else {
                tail.next = b;
                b = b.next;
            }
            tail = tail.next;
        }
        tail.next = (a != null) ? a : b;
        return dummy.next;
    }

    static Node mergeSort(Node head) {
        if (head == null || head.next == null) { // BREAKPOINT 2
            return head;
        }
        Node middle = middleOf(head);
        Node second = middle.next;
        middle.next = null;
        Node left = mergeSort(head);
        Node right = mergeSort(second);
        return merge(left, right);
    }

    public static void main(String[] args) {
        Node head = fromArray(4, 2, 5, 1, 3);
        head = insertionSort(head);
        System.out.println(toList(head));

        head = fromArray(38, 27, 43, 3, 9, 82, 10);
        head = mergeSort(head);
        System.out.println(toList(head));
    }
}
