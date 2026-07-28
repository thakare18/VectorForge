# KD-Tree Search Design

## Objective

Implement an efficient nearest neighbor search using a KD-Tree instead of comparing every vector.

---

## Search Flow

Query Vector

↓

Start from Root

↓

Compare Current Node

↓

Update Best Candidate

↓

Choose Next Branch

↓

Reach Leaf

↓

Backtrack

↓

Check Opposite Branch

↓

Update Best Candidate

↓

Return Final Result

---

## Algorithm

1. Start from the root node.
2. Compare the query vector with the current node.
3. Calculate the distance.
4. Update the best node if required.
5. Move to the left or right subtree based on the current axis.
6. Continue until a leaf node is reached.
7. Backtrack to parent nodes.
8. Decide whether the opposite subtree should be visited.
9. Continue until the root is reached.
10. Return the nearest vector.

---
## Advantages

- Faster than Brute Force for low-dimensional data.
- Efficient tree traversal.
- Suitable for exact nearest neighbor search.

---

---
