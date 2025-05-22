export function extractImageInfo(url: string) {
  const regexWithTimestamp = /\/(\d{4})\/(\d{2})\/(\d+)_/;
  const regexWithoutTimestamp = /\/(\d{4})\/(\d{2})\//;

  let year = '2000';
  let month = '01';
  let timestamp = `${new Date(`${year}-${month}-01`).getTime() / 1000}`;

  const matchWithTS = url.match(regexWithTimestamp);
  const matchWithoutTS = url.match(regexWithoutTimestamp);

  if (matchWithTS) {
    [, year, month, timestamp] = matchWithTS;
  } else if (matchWithoutTS) {
    [, year, month] = matchWithoutTS;
    timestamp = `${new Date(`${year}-${month}-01`).getTime() / 1000}`;
  }

  return { year, month, timestamp };
}

export function extractYouTubeId(url: string): string | null {
  if (!url.includes('youtube.com')) return null;
  const match = url.match(/\/embed\/([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

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
