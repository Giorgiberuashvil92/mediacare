export type MisPrintFormDocument = {
  id: string;
  /** HIS `templateKey` (ან ცარიელი როცა მხოლოდ `printTypeName` არის). */
  title: string;
  html: string;
  /** HIS `printTypeName` — ზოგჯერ კალკულაცია მხოლოდ აქ წერია. */
  printTypeName?: string;
  /** HIS — რამდენიმე Order-იდან ერთის არჩევა `dateCreatedForm`-ით. */
  formNumber?: string;
  dateCreatedForm?: string;
};

/** UI-ში HIS ფორმის სათაური — ფორმა 100 ან კალკულაცია (სხვა ტიპები ფილტრით არ ჩანს). */
export type MisDocumentSectionPresentation = {
  heading: string;
  caption?: string;
};

/** MIS `templateKey` — ფორმა 100 (IV–100). */
const MIS_TEMPLATE_KEY_FORM_100 =
  /ფორმა\s*iv|iv[\s\u2013\u2014\-]*100|ფორმა.*100\s*ა/i;

/**
 * MIS `templateKey` / `printTypeName` — ნამდვილი კალკულაცია / ანგარიშფაქტურა / ფასი.
 */
const MIS_TEMPLATE_KEY_CALC_MONEY =
  /კალკულაცი|ინვოის|ინვოისი|ანგარიშ[-–\u2014\s]*ფაქტურა|ანგარიშფაქტ|ანგარიში|ტარიფ|საფასური|ბილინგ|billing|invoice|calculation/i;

/** HTML `<title>`-ში დამატებითი მონიშვნები (HIS სხვადასხვა სათაურს აბრუნებს). */
const MIS_HTML_TITLE_CALC =
  /კალკულაცი|ინვოის|ინვოისი|ანგარიშ[-–\u2014\s]*ფაქტურა|ანგარიშფაქტ|ანგარიში|ტარიფ|საფასური|ბილინგ|billing|invoice|calculation|ჯამი\s*გადასახდელი|გადასახდელი\s*თანხა|სერვისების\s*ფასი/i;

/** გასინჯვის ფურცელი — არა ფორმა 100 / კალკულაცია. */
const MIS_EXAMINATION_SHEET = /გასინჯვის\s*ფურცელი/i;

function extractMisHtmlTitle(html: string): string {
  const m = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return (m?.[1] ?? "").trim();
}

/**
 * ექიმის ეკრანზე: მხოლოდ ფორმა IV–100 და კალკულაცია/ანგარიშ-ფაქტურა (HIS `Order` + `<title>ანგარიშ-ფაქტურა</title>`).
 * გასინჯვის ფურცელი, ქრონიკული ფორმა და სხვა შაბლონები არ ჩანს.
 */
export function isMisDocumentForm100OrCalculation(
  templateKey: string,
  opts?: { printTypeName?: string; html?: string },
): boolean {
  const tk = templateKey.trim();
  const ptn = (opts?.printTypeName ?? "").trim();
  const html = opts?.html ?? "";
  const htmlTitle = extractMisHtmlTitle(html);
  const keyBag = [tk, ptn].filter(Boolean).join("\n");

  if (
    MIS_EXAMINATION_SHEET.test(tk) ||
    MIS_EXAMINATION_SHEET.test(ptn) ||
    MIS_EXAMINATION_SHEET.test(htmlTitle)
  ) {
    return false;
  }

  if (
    MIS_TEMPLATE_KEY_FORM_100.test(keyBag) ||
    MIS_TEMPLATE_KEY_FORM_100.test(htmlTitle)
  ) {
    return true;
  }

  if (MIS_TEMPLATE_KEY_CALC_MONEY.test(keyBag)) {
    return true;
  }
  if (htmlTitle && MIS_HTML_TITLE_CALC.test(htmlTitle)) {
    return true;
  }
  if (
    /^order$/i.test(tk) &&
    MIS_HTML_TITLE_CALC.test(html.slice(0, 20000))
  ) {
    return true;
  }

  return false;
}

/** მხოლოდ IV–100 (კალკულაცია/Order არა). */
export function isMisDocumentForm100(d: MisPrintFormDocument): boolean {
  const htmlTitle = extractMisHtmlTitle(d.html);
  const bag = [d.title, d.printTypeName ?? "", htmlTitle]
    .filter(Boolean)
    .join("\n");
  return MIS_TEMPLATE_KEY_FORM_100.test(bag);
}

/**
 * HIS GetFormsByServiceID მასივში პირველი IV–100 ჩანაწერის ინდექსი (`mis-print-forms/pdf?index=`).
 * ლოგიკა ემთხვევა `backend/.../mis-form100-his-detect.ts`.
 */
export function misHisForm100FirstIndexInBody(body: unknown): number | null {
  if (!Array.isArray(body)) return null;
  for (let i = 0; i < body.length; i++) {
    const row = body[i];
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    const tk = typeof o.templateKey === "string" ? o.templateKey.trim() : "";
    const ptn =
      typeof o.printTypeName === "string" ? o.printTypeName.trim() : "";
    const title = typeof o.title === "string" ? o.title.trim() : "";
    const formTitle =
      typeof o.formTitle === "string" ? o.formTitle.trim() : "";
    const printFormName =
      typeof o.printFormName === "string" ? o.printFormName.trim() : "";
    const td = typeof o.templateData === "string" ? o.templateData : "";
    const htmlTitle = td ? extractMisHtmlTitle(td) : "";
    const bag = [tk, ptn, htmlTitle, title, formTitle, printFormName]
      .filter(Boolean)
      .join("\n");
    if (MIS_TEMPLATE_KEY_FORM_100.test(bag)) return i;
  }
  return null;
}

function misHisRawRowSortMs(o: Record<string, unknown>): number {
  const dcfRaw = o.dateCreatedForm;
  if (typeof dcfRaw === "string" && dcfRaw.trim()) {
    const t = Date.parse(dcfRaw.trim());
    if (!Number.isNaN(t)) return t;
  }
  const rawFormNum = o.formNumber;
  if (typeof rawFormNum === "string" || typeof rawFormNum === "number") {
    const digits = String(rawFormNum).replace(/\D/g, "");
    if (digits) {
      const n = parseInt(digits, 10);
      if (!Number.isNaN(n)) return n;
    }
  }
  return 0;
}

/**
 * HIS GetFormsByServiceID მასივში უახლესი კალკულაცია/ინვოისის ჩანაწერის ინდექსი (IV–100 არა).
 */
export function misHisCalculationBestIndexInBody(body: unknown): number | null {
  if (!Array.isArray(body)) return null;
  let bestIdx: number | null = null;
  let bestMs = -Infinity;
  for (let i = 0; i < body.length; i++) {
    const row = body[i];
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    const tk = typeof o.templateKey === "string" ? o.templateKey.trim() : "";
    const ptn =
      typeof o.printTypeName === "string" ? o.printTypeName.trim() : "";
    const title = typeof o.title === "string" ? o.title.trim() : "";
    const formTitle =
      typeof o.formTitle === "string" ? o.formTitle.trim() : "";
    const printFormName =
      typeof o.printFormName === "string" ? o.printFormName.trim() : "";
    const td = typeof o.templateData === "string" ? o.templateData : "";
    const htmlTitle = td ? extractMisHtmlTitle(td) : "";
    const bag = [tk, ptn, htmlTitle, title, formTitle, printFormName]
      .filter(Boolean)
      .join("\n");
    if (MIS_TEMPLATE_KEY_FORM_100.test(bag)) continue;

    const keyBag = [tk, ptn].filter(Boolean).join("\n");
    let isCalc = MIS_TEMPLATE_KEY_CALC_MONEY.test(keyBag);
    if (!isCalc && htmlTitle && MIS_HTML_TITLE_CALC.test(htmlTitle)) {
      isCalc = true;
    }
    if (
      !isCalc &&
      /^order$/i.test(tk) &&
      td &&
      MIS_HTML_TITLE_CALC.test(td.slice(0, 20000))
    ) {
      isCalc = true;
    }
    if (!isCalc) continue;

    const ms = misHisRawRowSortMs(o);
    if (bestIdx == null || ms >= bestMs) {
      bestMs = ms;
      bestIdx = i;
    }
  }
  return bestIdx;
}

/** რაც უფრო დიდია, უფრო ახალია (HIS `dateCreatedForm` ან `formNumber`). */
function misCalculationSortMs(d: MisPrintFormDocument): number {
  if (d.dateCreatedForm) {
    const t = Date.parse(d.dateCreatedForm);
    if (!Number.isNaN(t)) return t;
  }
  if (d.formNumber) {
    const digits = d.formNumber.replace(/\D/g, "");
    if (digits) {
      const n = parseInt(digits, 10);
      if (!Number.isNaN(n)) return n;
    }
  }
  return 0;
}

function pickLatestCalculationDocument(
  calcs: MisPrintFormDocument[],
): MisPrintFormDocument {
  return calcs.reduce((best, cur) =>
    misCalculationSortMs(cur) >= misCalculationSortMs(best) ? cur : best,
  );
}

/**
 * ფორმა 100 + კალკულაცია; რამდენიმე ინვოისი/Order → მხოლოდ ერთი (უახლესი `dateCreatedForm`-ით).
 */
export function filterMisPrintDocumentsDoctorVisible(
  documents: MisPrintFormDocument[],
): MisPrintFormDocument[] {
  const filtered = documents.filter((d) =>
    isMisDocumentForm100OrCalculation(d.title, {
      printTypeName: d.printTypeName,
      html: d.html,
    }),
  );
  const form100InOrder = filtered.filter((d) => isMisDocumentForm100(d));
  const calcs = filtered.filter((d) => !isMisDocumentForm100(d));
  if (calcs.length <= 1) {
    return [...form100InOrder, ...calcs];
  }
  return [...form100InOrder, pickLatestCalculationDocument(calcs)];
}

/**
 * UI სათაური: ფორმა 100 / კალკულაცია (ფილტრის შემდეგ ჩვეულებრივ მხოლოდ ეს ორი ტიპია).
 */
export function formatMisDocumentSectionTitle(
  templateKey: string,
  opts?: { printTypeName?: string; html?: string },
): MisDocumentSectionPresentation {
  const raw = templateKey.trim();
  const ptn = (opts?.printTypeName ?? "").trim();
  const htmlTitle = extractMisHtmlTitle(opts?.html ?? "");
  const bag = [raw, ptn, htmlTitle].filter(Boolean).join("\n");
  if (!bag) return { heading: "დოკუმენტი" };

  if (MIS_TEMPLATE_KEY_FORM_100.test(bag)) {
    return {
      heading: "ფორმა 100",
      caption: "IV–100 — ერთი მთლიანი დოკუმენტი",
    };
  }

  if (MIS_TEMPLATE_KEY_CALC_MONEY.test(bag) || MIS_HTML_TITLE_CALC.test(htmlTitle)) {
    return {
      heading: "კალკულაცია",
      caption: "ანგარიშფაქტურა · სერვისები და თანხები",
    };
  }

  return { heading: raw || ptn || htmlTitle || "დოკუმენტი" };
}

function wrapSingleMisHtmlDocument(fragmentOrFull: string): string {
  const t = fragmentOrFull.trim();
  if (!t) return "";
  if (/<html[\s>]/i.test(t)) return t;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head><body style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;padding:12px;font-size:15px;line-height:1.45;color:#111827;">${t}</body></html>`;
}

/**
 * MIS GetFormsByServiceID — თითო ჩანაწერი ცალკე (პრევიუ + PDF), თუ `templateData` სტრიქონია.
 * სხვა სტრუქტურაზე — ერთი გაერთიანებული დოკუმენტი (`extractMisPrintFormsHtml`).
 */
export function parseMisPrintFormDocuments(body: unknown): MisPrintFormDocument[] {
  if (body == null) return [];

  if (Array.isArray(body) && body.length > 0) {
    const out: MisPrintFormDocument[] = [];
    for (let i = 0; i < body.length; i++) {
      const row = body[i];
      if (!row || typeof row !== "object") continue;
      const o = row as Record<string, unknown>;
      const td = o.templateData;
      if (typeof td !== "string" || !td.trim()) continue;
      const id = String(o.id ?? o.objectID ?? `mis-form-${i}`);
      const tk =
        typeof o.templateKey === "string" ? o.templateKey.trim() : "";
      const ptnRaw =
        typeof o.printTypeName === "string" ? o.printTypeName.trim() : "";
      const title =
        tk ||
        ptnRaw ||
        extractMisHtmlTitle(td) ||
        `დოკუმენტი ${i + 1}`;
      const html = wrapSingleMisHtmlDocument(td);
      const rawFormNum = o.formNumber;
      const formNumber =
        typeof rawFormNum === "string" || typeof rawFormNum === "number"
          ? String(rawFormNum).trim() || undefined
          : undefined;
      const dcfRaw = o.dateCreatedForm;
      const dateCreatedForm =
        typeof dcfRaw === "string" && dcfRaw.trim()
          ? dcfRaw.trim()
          : undefined;
      if (html) {
        out.push({
          id,
          title,
          html,
          printTypeName: ptnRaw || undefined,
          formNumber,
          dateCreatedForm,
        });
      }
    }
    if (out.length > 0) return out;
  }

  const merged = extractMisPrintFormsHtml(body);
  if (!merged.trim()) return [];
  return [{ id: "combined", title: "HIS ფორმა", html: merged }];
}

/**
 * MIS GetFormsByServiceID პასუხიდან HTML ფრაგმენტების ამოღება (სხვადასხვა envelope).
 */
export function extractMisPrintFormsHtml(body: unknown): string {
  const chunks: string[] = [];
  const seen = new Set<string>();

  const visit = (val: unknown, depth = 0): void => {
    if (val == null || depth > 14) return;
    if (typeof val === "string") {
      const t = val.trim();
      if (!t || seen.has(t)) return;
      if (t.includes("<") && (t.includes("</") || t.includes("/>"))) {
        seen.add(t);
        chunks.push(t);
      }
      return;
    }
    if (typeof val === "object" && !Array.isArray(val)) {
      const o = val as Record<string, unknown>;
      for (const k of [
        "html",
        "HTML",
        "Html",
        "body",
        "Body",
        "content",
        "Content",
        "template",
        "Template",
        "formHtml",
        "FormHtml",
        "printFormHtml",
        "PrintFormHtml",
      ]) {
        const v = o[k];
        visit(v, depth + 1);
      }
      for (const v of Object.values(o)) {
        visit(v, depth + 1);
      }
    }
    if (Array.isArray(val)) {
      for (const item of val) {
        visit(item, depth + 1);
      }
    }
  };

  visit(body, 0);
  if (chunks.length === 0) return "";
  const combined = chunks.join(
    '<hr style="margin:16px 0;border:none;border-top:1px solid #e5e7eb"/>',
  );
  if (/<html[\s>]/i.test(combined)) {
    return combined;
  }
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head><body style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;padding:12px;font-size:15px;line-height:1.45;color:#111827;">${combined}</body></html>`;
}

/**
 * დევში: HIS პასუხის სრული სტრუქტურა — `templateData` არ იჭრება სრულად, ინახება სიგრძე + ნაწყვეტები
 * (სხვა ველები უცვლელად), რომ ნახო რა გვიბრუნებს და სად შეიძლება „გეშლებოდეს“.
 */
export function devLogMisPrintForms(
  raw: unknown,
  label = "[HIS misPrintFormsByService]",
) {
  if (!__DEV__) return;
  try {
    if (typeof raw === "string") {
      console.log(
        `${label} (string, ${raw.length} chars)`,
        `${raw.slice(0, 4000)}${raw.length > 4000 ? ` … [+${raw.length - 4000}]` : ""}`,
      );
      return;
    }
    const structure = JSON.stringify(
      raw,
      (key, value) => {
        if (key === "templateData" && typeof value === "string") {
          const s = value;
          return {
            _htmlChars: s.length,
            _htmlStart: s.slice(0, 500),
            ...(s.length > 900
              ? { _htmlEnd: s.slice(-400) }
              : {}),
          };
        }
        return value;
      },
      2,
    );
    console.log(`${label} (სრული JSON, templateData შეკუმშილი)`, structure);
  } catch (e) {
    console.log(label, "devLogMisPrintForms error", e, raw);
  }
}
