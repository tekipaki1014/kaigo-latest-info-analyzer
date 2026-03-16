import * as cheerio from "cheerio";

export interface ScrapedItem {
  vol_number: number;
  title: string;
  pdf_url: string;
  published_date: string | null;
}

const BASE_URL = "https://www.mhlw.go.jp";
const INDEX_URL = `${BASE_URL}/stf/seisakunitsuite/bunya/hukushi_kaigo/kaigo_koureisha/index_00010.html`;
const MIN_VOL = 1121;

export async function scrapeLatestInfoPage(): Promise<ScrapedItem[]> {
  const response = await fetch(INDEX_URL, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "ja,en-US;q=0.7,en;q=0.3",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch page: ${response.status}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);
  const items: ScrapedItem[] = [];

  // The page lists items with links to PDFs
  // Each entry typically has text like "介護保険最新情報vol.XXXX（PDF：XXXkB）"
  $("a[href$='.pdf']").each((_, element) => {
    const $el = $(element);
    const href = $el.attr("href");
    if (!href) return;

    const pdfUrl = href.startsWith("http") ? href : `${BASE_URL}${href}`;

    // Extract vol number from surrounding text or link text
    const parentText = $el.parent().text() || "";
    const linkText = $el.text() || "";
    const fullText = parentText + " " + linkText;

    // Match vol number patterns: vol.XXXX, Vol.XXXX, ＶＯＬ．XXXX etc.
    const volMatch = fullText.match(
      /[Vv][Oo][Ll][.．][\s]*([0-9０-９]+)/
    );
    if (!volMatch) return;

    // Convert full-width numbers to half-width
    const volStr = volMatch[1].replace(/[０-９]/g, (s) =>
      String.fromCharCode(s.charCodeAt(0) - 0xfee0)
    );
    const volNumber = parseInt(volStr, 10);

    if (isNaN(volNumber) || volNumber < MIN_VOL) return;

    // Extract title - text content around the link, cleaned up
    const title = parentText
      .replace(/\s+/g, " ")
      .replace(/\[PDF形式.*?\]/g, "")
      .replace(/（PDF[：:][^）]*）/g, "")
      .replace(/\(PDF[：:][^)]*\)/g, "")
      .trim()
      .slice(0, 200);

    // Try to extract date from surrounding text
    const dateMatch = fullText.match(
      /令和[０-９0-9]+年[０-９0-9]+月[０-９0-9]+日/
    );

    items.push({
      vol_number: volNumber,
      title: title || `介護保険最新情報 Vol.${volNumber}`,
      pdf_url: pdfUrl,
      published_date: dateMatch ? dateMatch[0] : null,
    });
  });

  // Deduplicate by vol_number (keep first occurrence)
  const seen = new Set<number>();
  const unique = items.filter((item) => {
    if (seen.has(item.vol_number)) return false;
    seen.add(item.vol_number);
    return true;
  });

  return unique.sort((a, b) => b.vol_number - a.vol_number);
}

export async function downloadPdf(url: string): Promise<Buffer> {
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to download PDF: ${response.status} from ${url}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
