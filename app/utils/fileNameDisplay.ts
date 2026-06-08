/** მოდალის ჰედერში გრძელი ფაილის სახელი (მაგ. UUID.jpg) */
export function truncateDisplayFileName(
  name: string | undefined,
  maxLength = 20,
): string {
  if (!name) return "";
  const trimmed = name.trim();
  if (trimmed.length <= maxLength) return trimmed;
  if (maxLength <= 3) return `${trimmed.slice(0, maxLength)}`;

  const extMatch = trimmed.match(/(\.[^.]+)$/);
  const ext = extMatch?.[1] ?? "";
  const base = ext ? trimmed.slice(0, -ext.length) : trimmed;

  const budget = maxLength - ext.length - 3;
  if (budget < 2) {
    return `${trimmed.slice(0, maxLength - 3)}...`;
  }

  const head = Math.ceil(budget / 2);
  const tail = budget - head;
  return `${base.slice(0, head)}...${base.slice(-tail)}${ext}`;
}
