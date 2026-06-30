
export class node<T> {
    value: T;
    next: node<T> | null;
    prev: node<T> | null;
    constructor(value: T) {
        this.value = value;
        this.next = null;
        this.prev = null;
    }
}
export class dll<T> {
    head: node<T> | null = null;
    tail: node<T> | null = null;
    private size: number = 0;
    //append at end
    append(value: T): node<T> {
        const newNode = new node(value);
        if (!this.head) {
            this.head = newNode;
            this.tail = newNode;
        } else {
            newNode.prev = this.tail;
            this.tail!.next = newNode;
            this.tail = newNode;
        }
        this.size++;
        return newNode;
    }
    //prepend-append at start
    prepend(value: T): node<T> {
        const newNode = new node(value);
        if (!this.head) {
            this.head = newNode;
            this.tail = newNode;
        } else {
            newNode.next = this.head;
            this.head.prev = newNode;
            this.head = newNode;
        }
        this.size++;
        return newNode;
    }
    //remove a node
    remove(node: node<T>): void {
        if (!node) return;
        if (node === this.head) {
            this.head = node.next;
        }
        if (node === this.tail) {
            this.tail = node.prev;
        }
        if (node.prev) {
            node.prev.next = node.next;
        }
        if (node.next) {
            node.next.prev = node.prev;
        }
        node.next = null;
        node.prev = null;
        this.size--;
    }
    getSize(): number {
        return this.size;
    }
    toArray(): T[] {
        const res: T[] = [];
        let curr = this.head;
        while (curr) {
            res.push(curr.value);
            curr=curr.next;
        }
        return res;
    }
    clear(): void {
        this.head = null; this.tail = null; this.size = 0;
    }
}