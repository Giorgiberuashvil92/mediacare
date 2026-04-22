import { apiService } from "@/app/_services/api";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Alert } from "react-native";
import {
  filterMisPrintDocumentsDoctorVisible,
  parseMisPrintFormDocuments,
} from "./html";

export type MisPrintFormsPdfAction = "view" | "download";

export async function runMisPrintFormsPdfAction(options: {
  appointmentId: string;
  action: MisPrintFormsPdfAction;
  htmlForPdf: string;
  shareDialogTitle?: string;
}): Promise<void> {
  const { appointmentId, action, shareDialogTitle } = options;

  let htmlForPdf = options.htmlForPdf.trim();
  if (!htmlForPdf) {
    const formsRes = await apiService.getMisPrintForms(appointmentId, true);
    const raw = formsRes.data?.misPrintFormsByService;
    const docs = filterMisPrintDocumentsDoctorVisible(
      parseMisPrintFormDocuments(raw),
    );
    if (docs.length === 1) {
      htmlForPdf = docs[0].html.trim();
    } else if (docs.length > 1) {
      htmlForPdf = docs
        .map((d) => d.html.trim())
        .join('<div style="page-break-before:always;"></div>');
    } else {
      htmlForPdf = "";
    }
  }

  if (!htmlForPdf) {
    Alert.alert("შეცდომა", "HIS ფორმის HTML ვერ მოიძებნა PDF გენერაციისთვის");
    return;
  }

  const wrappedHtml = /<html[\s>]/i.test(htmlForPdf)
    ? htmlForPdf
    : `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head><body>${htmlForPdf}</body></html>`;

  const printed = await Print.printToFileAsync({
    html: wrappedHtml,
  });

  if (action === "view") {
    await Print.printAsync({ uri: printed.uri });
    return;
  }

  const shareAvailable = await Sharing.isAvailableAsync();
  if (shareAvailable) {
    await Sharing.shareAsync(printed.uri, {
      mimeType: "application/pdf",
      dialogTitle: shareDialogTitle?.trim() || "HIS ფორმა (PDF)",
      UTI: "com.adobe.pdf",
    });
  } else {
    Alert.alert(
      "შენიშვნა",
      "გადმოწერა/გაზიარება ამ მოწყობილობაზე მიუწვდომელია",
    );
  }
}
