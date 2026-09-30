/** A 0 to 4 password score, as `Meter` shows it. */
export type PasswordScore = 0 | 1 | 2 | 3 | 4;

/**
 * A small, dependency-free strength estimate from length and character classes (lower, upper, digit, symbol).
 * It is a hint for the person typing, not a security check: use a server-side policy or a real estimator
 * (zxcvbn) and pass its result as `score` when it matters.
 *
 * 0 empty, or shorter than 6, or made of three or fewer distinct characters
 * 1 length of 6 or more
 * 2 length of 8 or more with two character classes
 * 3 length of 10 or more with three character classes
 * 4 length of 12 or more with all four character classes, or 16 or more with three
 */
export function estimatePasswordStrength(password: string): PasswordScore {
  const chars = Array.from(password);
  const length = chars.length;
  if (length < 6 || new Set(chars).size <= 3) return 0;
  const classes = [/\p{Ll}/u, /\p{Lu}/u, /\p{Nd}/u, /[^\p{L}\p{Nd}]/u].filter((re) => re.test(password)).length;
  // Letters without case (Arabic, CJK) are a class of their own.
  const uncased = /[\p{Lo}]/u.test(password) ? 1 : 0;
  const variety = classes + uncased;
  if (length >= 16 && variety >= 3) return 4;
  if (length >= 12 && variety >= 4) return 4;
  if (length >= 10 && variety >= 3) return 3;
  if (length >= 8 && variety >= 2) return 2;
  return 1;
}
