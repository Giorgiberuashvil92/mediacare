/** Client-side fallback when API privacy term is empty (matches backend default-privacy-policy.ts). */

export const PRIVACY_POLICY_DEFAULTS = {
  ka: `კონფიდენციალურობის პოლიტიკა

Medcompass AI ჯანმრთელობის ასისტენტისთვის თქვენი შეტყობინებები გადაეცემა Anthropic PBC (აშშ, Claude API) და PubMed/NCBI-ს ლიტერატურის ძიებისთვის — მხოლოდ თქვენი თანხმობის შემდეგ. მონაცემები არ გამოიყენება რეკლამისთვის. სრული პოლიტიკა: support@medcompass.ge`,

  en: `Privacy Policy

For the AI Health Assistant, your messages are sent to Anthropic PBC (US, Claude API) and PubMed/NCBI to find cited sources — only after you consent. Data is not used for advertising. Full policy: support@medcompass.ge`,

  ru: `Политика конфиденциальности

Для AI-ассистента сообщения передаются в Anthropic PBC (США, Claude API) и PubMed/NCBI — только после согласия. Данные не используются для рекламы. support@medcompass.ge`,
};

export function resolvePrivacyContent(
  data: { content?: string; contentEn?: string; contentRu?: string } | null,
  language: "ka" | "en" | "ru",
): string {
  if (!data) {
    return PRIVACY_POLICY_DEFAULTS[language];
  }

  const byLang =
    language === "en"
      ? data.contentEn
      : language === "ru"
        ? data.contentRu
        : data.content;

  if (byLang?.trim()) return byLang.trim();

  if (data.content?.trim()) return data.content.trim();
  if (data.contentEn?.trim()) return data.contentEn.trim();
  if (data.contentRu?.trim()) return data.contentRu.trim();

  return PRIVACY_POLICY_DEFAULTS[language];
}
