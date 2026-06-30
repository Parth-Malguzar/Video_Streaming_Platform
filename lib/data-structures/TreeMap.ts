class TreeNode<K, V> {
  key: K;
  values: V[] = [];
  left: TreeNode<K, V> | null = null;
  right: TreeNode<K, V> | null = null;
  height: number = 1;

  constructor(key: K, value: V) {
    this.key = key;
    this.values = [value];
  }
}

export class TreeMap<K, V> {
  private root: TreeNode<K, V> | null = null;
  private size: number = 0;

  // Get height of a node
  private getHeight(node: TreeNode<K, V> | null): number {
    return node ? node.height : 0;
  }

  // Get balance factor of a node
  private getBalance(node: TreeNode<K, V> | null): number {
    return node ? this.getHeight(node.left) - this.getHeight(node.right) : 0;
  }

  // Right rotate
  private rightRotate(y: TreeNode<K, V>): TreeNode<K, V> {
    const x = y.left!;
    const T2 = x.right;

    // Perform rotation
    x.right = y;
    y.left = T2;

    // Update heights
    y.height = Math.max(this.getHeight(y.left), this.getHeight(y.right)) + 1;
    x.height = Math.max(this.getHeight(x.left), this.getHeight(x.right)) + 1;

    // Return new root
    return x;
  }

  // Left rotate
  private leftRotate(x: TreeNode<K, V>): TreeNode<K, V> {
    const y = x.right!;
    const T2 = y.left;

    // Perform rotation
    y.left = x;
    x.right = T2;

    // Update heights
    x.height = Math.max(this.getHeight(x.left), this.getHeight(x.right)) + 1;
    y.height = Math.max(this.getHeight(y.left), this.getHeight(y.right)) + 1;

    // Return new root
    return y;
  }

  // Insert helper
  private insertNode(node: TreeNode<K, V> | null, key: K, value: V): TreeNode<K, V> {
    // 1. Perform normal BST insertion
    if (!node) {
      this.size++;
      return new TreeNode<K, V>(key, value);
    }

    if (key === node.key) {
      node.values.push(value);
      this.size++;
      return node;
    }

    if (key < node.key) {
      node.left = this.insertNode(node.left, key, value);
    } else {
      node.right = this.insertNode(node.right, key, value);
    }

    // 2. Update height of this ancestor node
    node.height = 1 + Math.max(this.getHeight(node.left), this.getHeight(node.right));

    // 3. Get the balance factor of this ancestor node to check if it became unbalanced
    const balance = this.getBalance(node);

    // If node becomes unbalanced, there are 4 cases:

    // Left Left Case
    if (balance > 1 && key < node.left!.key) {
      return this.rightRotate(node);
    }

    // Right Right Case
    if (balance < -1 && key > node.right!.key) {
      return this.leftRotate(node);
    }

    // Left Right Case
    if (balance > 1 && key > node.left!.key) {
      node.left = this.leftRotate(node.left!);
      return this.rightRotate(node);
    }

    // Right Left Case
    if (balance < -1 && key < node.right!.key) {
      node.right = this.rightRotate(node.right!);
      return this.leftRotate(node);
    }

    // Return the (unchanged) node pointer
    return node;
  }

  // Public Insert
  public insert(key: K, value: V): void {
    this.root = this.insertNode(this.root, key, value);
  }

  // Helper for in-order traversal (ascending keys)
  private inOrder(node: TreeNode<K, V> | null, result: V[]): void {
    if (node) {
      this.inOrder(node.left, result);
      result.push(...node.values);
      this.inOrder(node.right, result);
    }
  }

  // Public in-order values
  public getValuesAscending(): V[] {
    const result: V[] = [];
    this.inOrder(this.root, result);
    return result;
  }

  // Helper for reverse in-order traversal (descending keys)
  private descendingOrder(node: TreeNode<K, V> | null, result: V[]): void {
    if (node) {
      this.descendingOrder(node.right, result);
      result.push(...node.values);
      this.descendingOrder(node.left, result);
    }
  }

  // Public descending order values
  public getValuesDescending(): V[] {
    const result: V[] = [];
    this.descendingOrder(this.root, result);
    return result;
  }

  // Public size getter
  public getSize(): number {
    return this.size;
  }
}
