import { apiService } from "@/app/_services/api";
import {
  devLogMisPrintForms,
  filterMisPrintDocumentsDoctorVisible,
  parseMisPrintFormDocuments,
  type MisPrintFormDocument,
} from "./html";

export type { MisPrintFormDocument };

/** ჩატვირთვის შედეგი — ეკრანზე setMisHisDocuments / setMisHisError-ით გამოყენება. */
export type MisPrintFormsScreenState = {
  documents: MisPrintFormDocument[];
  error: string | null;
  /** HIS სრული პასუხიდან — ფორმა IV–100 ნაპოვნია (ბექენდი `misForm100AvailableAt`). */
  misForm100AvailableAt?: string | null;
};

const emptyContentMsg =
  "ფორმების შიგთავსი ცარიელია ან HTML ვერ მოიძებნა პასუხში.";

/**
 * HIS ფორმების HTML — ყოველთვის ახალი მოთხოვნა HIS-ზე (`refetch=true`), შენახული კეში არ გამოიყენება.
 */
export async function loadMisPrintFormsFromApi(
  appointmentId: string,
): Promise<MisPrintFormsScreenState> {
  try {
    const res = await apiService.getMisPrintForms(appointmentId, true);
    if (!res.success) {
      return { documents: [], error: "HIS ფორმების პასუხი წარმატებული არ არის" };
    }
    const misForm100AvailableAt = res.data?.misForm100AvailableAt ?? null;
    const raw = res.data?.misPrintFormsByService;
    if (__DEV__) {
      console.log("[HIS mis-print-forms] API envelope", {
        success: res.success,
        misGeneratedServiceId: res.data?.misGeneratedServiceId ?? null,
        misPrintFormsFetchedAt: res.data?.misPrintFormsFetchedAt ?? null,
        rawKind:
          raw == null
            ? "null/undefined"
            : Array.isArray(raw)
              ? `array[length=${raw.length}]`
              : typeof raw,
      });
    }
    devLogMisPrintForms(raw);
    const parsedAll = parseMisPrintFormDocuments(raw);
    if (__DEV__) {
      console.log(
        "[HIS mis-print-forms] parseMisPrintFormDocuments",
        parsedAll.length,
        parsedAll.map((d) => ({
          id: d.id,
          title: d.title,
          printTypeName: d.printTypeName,
          htmlChars: d.html.length,
        })),
      );
    }
    const documents = filterMisPrintDocumentsDoctorVisible(parsedAll);
    if (__DEV__) {
      console.log(
        "[HIS mis-print-forms] ეკრანზე (ფორმა 100 + ერთი უახლესი კალკულაცია)",
        documents.length,
        documents.map((d) => ({
          id: d.id,
          title: d.title,
          formNumber: d.formNumber,
          dateCreatedForm: d.dateCreatedForm,
        })),
      );
    }
    if (documents.length > 0) {
      return { documents, error: null, misForm100AvailableAt };
    }
    return {
      documents: [],
      error: emptyContentMsg,
      misForm100AvailableAt,
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { documents: [], error: msg || "HIS ვერ ჩაიტვირთა" };
  }
}
