"""
Sorting a singly linked list for Debug Sorting Algorithms Visualizer:
insertion sort and merge sort, both by relinking the nodes.

Set breakpoints on the lines marked "BREAKPOINT", start debugging (F5), open the
visualizer (the "Sorting" button in the status bar) and pick "head". See README.md.
"""


class Node:
    def __init__(self, value, next=None):
        self.value = value
        self.next = next


def from_list(values):
    head = None
    for value in reversed(values):
        head = Node(value, head)
    return head


def to_list(head):
    values = []
    while head is not None:
        values.append(head.value)
        head = head.next
    return values


def insertion_sort(head):
    sorted_head = None  # BREAKPOINT 1
    current = head
    while current is not None:
        next_node = current.next
        if sorted_head is None or current.value < sorted_head.value:
            current.next = sorted_head
            sorted_head = current
        else:
            walker = sorted_head
            while walker.next is not None and walker.next.value <= current.value:
                walker = walker.next
            current.next = walker.next
            walker.next = current
        current = next_node
    return sorted_head


def middle_of(head):
    slow = head
    fast = head.next
    while fast is not None and fast.next is not None:
        slow = slow.next
        fast = fast.next.next
    return slow


def merge(a, b):
    dummy = Node(0)
    tail = dummy
    while a is not None and b is not None:
        if a.value <= b.value:
            tail.next = a
            a = a.next
        else:
            tail.next = b
            b = b.next
        tail = tail.next
    tail.next = a if a is not None else b
    return dummy.next


def merge_sort(head):
    if head is None or head.next is None:  # BREAKPOINT 2
        return head
    middle = middle_of(head)
    second = middle.next
    middle.next = None
    left = merge_sort(head)
    right = merge_sort(second)
    return merge(left, right)


if __name__ == "__main__":
    head = from_list([4, 2, 5, 1, 3])
    head = insertion_sort(head)
    print(to_list(head))

    head = from_list([38, 27, 43, 3, 9, 82, 10])
    head = merge_sort(head)
    print(to_list(head))
