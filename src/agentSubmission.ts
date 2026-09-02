export function createSubmissionGate() {
  let busy = false;
  const submitted = new Set<string>();
  return {
    start(requestId: string) {
      if (busy || submitted.has(requestId)) return false;
      busy = true;
      submitted.add(requestId);
      return true;
    },
    finish() { busy = false; },
  };
}
