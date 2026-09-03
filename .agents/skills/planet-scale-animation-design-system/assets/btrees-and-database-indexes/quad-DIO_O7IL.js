function u(n) {
  return ((n *= 2) <= 1 ? n * n : --n * (2 - n) + 1) / 2;
}
export { u as q };
