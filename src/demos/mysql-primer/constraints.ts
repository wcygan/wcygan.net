export type Candidate =
  | "valid"
  | "missing-customer"
  | "duplicate-id"
  | "negative-stock";
/** Each candidate is a separate statement against the unchanged bookstore seed. */
export function checkCandidate(candidate: Candidate) {
  switch (candidate) {
    case "valid":
      return {
        failed: null,
        value: "order 104 · customer 2",
        message:
          "Accepted: order 104 has a unique id and an existing customer. The inventory remains nonnegative.",
      };
    case "duplicate-id":
      return {
        failed: 0,
        value: "order 101 again",
        message:
          "Rejected: PRIMARY KEY prevents a second order with id 101. The stored rows remain unchanged.",
      };
    case "missing-customer":
      return {
        failed: 1,
        value: "customer_id = 99",
        message:
          "Rejected: FOREIGN KEY prevents an order for customer 99, who does not exist. The stored rows remain unchanged.",
      };
    case "negative-stock":
      return {
        failed: 2,
        value: "stock = -1",
        message:
          "Rejected: CHECK (stock >= 0) prevents negative inventory. The stored rows remain unchanged.",
      };
  }
}
