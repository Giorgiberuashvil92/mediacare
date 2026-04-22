/**
 * HIS GetFormsByServiceID მასივში ფორმა IV–100-ის არსებობა (იგივე regex-ლოგიკა რაც აპის lib/mis-print-forms/html.ts-ში).
 */
function extractMisHtmlTitle(html: string): string {
  const m = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return (m?.[1] ?? '').trim();
}

const MIS_TEMPLATE_KEY_FORM_100 =
  /ფორმა\s*iv|iv[\s\u2013\u2014\-]*100|ფორმა.*100\s*ა/i;

function misHisForm100RowBag(o: Record<string, unknown>): string {
  const tk = typeof o.templateKey === 'string' ? o.templateKey.trim() : '';
  const ptn =
    typeof o.printTypeName === 'string' ? o.printTypeName.trim() : '';
  const title = typeof o.title === 'string' ? o.title.trim() : '';
  const formTitle = typeof o.formTitle === 'string' ? o.formTitle.trim() : '';
  const printFormName =
    typeof o.printFormName === 'string' ? o.printFormName.trim() : '';
  const td = typeof o.templateData === 'string' ? o.templateData : '';
  const htmlTitle = td ? extractMisHtmlTitle(td) : '';
  return [tk, ptn, htmlTitle, title, formTitle, printFormName]
    .filter(Boolean)
    .join('\n');
}

/** პირველი IV–100 ჩანაწერის ინდექსი (`GetFormsByServiceID` მასივი, PDF `?index=`). */
export function misHisForm100FirstIndex(body: unknown): number | null {
  if (!Array.isArray(body)) return null;
  for (let i = 0; i < body.length; i++) {
    const row = body[i];
    if (!row || typeof row !== 'object') continue;
    const bag = misHisForm100RowBag(row as Record<string, unknown>);
    if (MIS_TEMPLATE_KEY_FORM_100.test(bag)) return i;
  }
  return null;
}

export function misHisPrintFormsIncludeForm100(body: unknown): boolean {
  return misHisForm100FirstIndex(body) !== null;
}
