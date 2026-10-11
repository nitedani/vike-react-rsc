export function getError(call: () => unknown): string {
  try {
    call();
    return "No error";
  } catch (error) {
    return (error as Error).message;
  }
}
