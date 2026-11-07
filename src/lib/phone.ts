export function normalizePhone(value: string): string {
  let digits = value.replace(/\D/g, "");

  if (digits.startsWith("0091")) {
    digits = digits.slice(4);
  } else if (digits.startsWith("91") && digits.length > 10) {
    digits = digits.slice(2);
  } else if (digits.startsWith("0") && digits.length === 11) {
    digits = digits.slice(1);
  }

  return digits.slice(0, 10);
}

export function isValidMobile(value: string): boolean {
  return /^[6-9]\d{9}$/.test(value);
}
