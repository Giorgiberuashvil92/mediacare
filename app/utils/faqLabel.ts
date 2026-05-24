import type { SupportedLanguage } from "@/app/contexts/LanguageContext";

export interface FaqItem {
  question: string;
  answer: string;
  questionEn?: string;
  answerEn?: string;
  questionRu?: string;
  answerRu?: string;
}

export const getFaqDisplayText = (
  faq: FaqItem,
  language: SupportedLanguage,
): { question: string; answer: string } => {
  if (language === "en") {
    return {
      question: faq.questionEn?.trim() || faq.question,
      answer: faq.answerEn?.trim() || faq.answer,
    };
  }
  if (language === "ru") {
    return {
      question: faq.questionRu?.trim() || faq.question,
      answer: faq.answerRu?.trim() || faq.answer,
    };
  }
  return {
    question: faq.question,
    answer: faq.answer,
  };
};
