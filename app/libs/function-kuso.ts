import * as cheerio from 'cheerio';

export function generatePageUrls(
  baseUrl: string,
  start: number,
  end: number
): string[] {
  if (!baseUrl?.trim())
    throw new Error('Baseurl is required and cannot be empty');
  if (start < 1) throw new Error('Start page must be greater than 0');
  if (end < start) throw new Error('End page cannot be less than start page');

  const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;

  return Array.from({ length: end - start + 1 }, (_, index) => {
    const currentPage = start + index;
    return currentPage === 1
      ? normalizedBaseUrl
      : `${normalizedBaseUrl}page/${currentPage}/`;
  });
}

export function extractImageInfo(url: string) {
  const regex = /\/(\d{4})\/(\d{2})\//;
  const match = url.match(regex);

  const [, year = '2000', month = '01'] = match ?? [];

  return { year, month };
}

export function extractPostInfo(elements: any) {
  const info: Record<string, string | string[]> = {};

  elements.each((_: any, el: any) => {
    const $el = cheerio.load(el);
    const label = $el('b').text().trim().replace(/:$/, '');
    if (!label) return;

    const key = label.toLowerCase().replace(/\s+/g, '_');

    if (key === 'genre') {
      const genres = $el('a')
        .map((_: any, a: any) => $el(a).text().trim())
        .get();
      info[key] = genres;
    } else {
      const value = $el
        .root()
        .text()
        .replace(label, '')
        .trim()
        .replace(/^:/, '');
      info[key] = value.trim();
    }
  });

  return info;
}

export function extractTimestampFromText(text: string): number {
  const match = text.match(/on (\d{1,2} \w+, \d{4})/);

  const date = match ? new Date(match[1]) : new Date('2000-01-01');
  const ms = isNaN(date.getTime())
    ? new Date('2000-01-01').getTime()
    : date.getTime();

  return Math.floor(ms / 1000);
}
