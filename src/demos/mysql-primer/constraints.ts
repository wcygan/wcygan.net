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
        message: "Accepted · order 104",
      };
    case "duplicate-id":
      return {
        failed: 0,
        value: "order 101 again",
        message: "Rejected · PRIMARY KEY · id 101",
      };
    case "missing-customer":
      return {
        failed: 1,
        value: "customer_id = 99",
        message: "Rejected · FOREIGN KEY · customer 99",
      };
    case "negative-stock":
      return {
        failed: 2,
        value: "stock = -1",
        message: "Rejected · CHECK (stock >= 0)",
      };
  }
}
