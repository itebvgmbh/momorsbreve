let pendingFile: File | null = null;

export function setPendingFile(f: File) {
  pendingFile = f;
}

export function consumePendingFile(): File | null {
  const f = pendingFile;
  pendingFile = null;
  return f;
}
