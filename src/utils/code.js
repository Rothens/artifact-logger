export function buildCodeKey(codeType, codeValue) {
  return `${codeType}:${codeValue}`;
}

export function generateId() {
  return crypto.randomUUID();
}