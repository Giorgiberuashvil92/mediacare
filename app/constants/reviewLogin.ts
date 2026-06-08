/** App Store / QA review account — OTP is skipped when these credentials are used. */
export const REVIEW_LOGIN_EMAIL = "reviewer@medicare.com";
export const REVIEW_LOGIN_PASSWORD = "MedicareReview2026!";

export function isReviewLoginCredentials(
  email: string,
  password: string,
): boolean {
  return (
    email.trim().toLowerCase() === REVIEW_LOGIN_EMAIL.toLowerCase() &&
    password === REVIEW_LOGIN_PASSWORD
  );
}
