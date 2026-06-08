/** App Store / QA review account — must match app/constants/reviewLogin.ts */
export const REVIEW_LOGIN_EMAIL = (
  process.env.REVIEW_LOGIN_EMAIL ?? 'reviewer@medicare.com'
)
  .trim()
  .toLowerCase();

export const REVIEW_LOGIN_PASSWORD =
  process.env.REVIEW_LOGIN_PASSWORD ?? 'MedicareReview2026!';

export function isReviewLoginEmail(email: string): boolean {
  return email.trim().toLowerCase() === REVIEW_LOGIN_EMAIL;
}

export function getReviewLoginInfo() {
  return {
    success: true,
    data: {
      email: REVIEW_LOGIN_EMAIL,
      skipOtp: true,
    },
  };
}
