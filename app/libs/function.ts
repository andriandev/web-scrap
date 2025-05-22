import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import * as cheerio from 'cheerio';

function fetchOption({ url = '' }) {
  return {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      Referer: url,
    },
    tls: {
      rejectUnauthorized: false,
    },
  };
}

export async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, fetchOption({ url: url }));
  const html = await res.text();
  return cheerio.load(html);
}

export async function openLinks(
  baseUrl: string,
  selector: string,
  callback: (url: string, $: cheerio.CheerioAPI) => Promise<void>
) {
  const $ = await fetchHTML(baseUrl);

  const links = $(selector)
    .map((_, el) => $(el).attr('href'))
    .get()
    .filter(Boolean);

  for (const link of links) {
    const fullUrl = new URL(link!, baseUrl).href;
    const page$ = await fetchHTML(fullUrl);
    await callback(fullUrl, page$);
  }
}

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

export async function downloadImage(
  url: string,
  folderPath: string
): Promise<string> {
  const res = await fetch(url, fetchOption({ url }));
  if (!res.ok) throw new Error(`Failed to fetch ${url}`);

  const buffer = await res.arrayBuffer();

  fs.mkdirSync(folderPath, { recursive: true });

  const imgFilename = url.split('/').pop() || 'image';
  const filenameWithoutExt = path.parse(imgFilename).name;
  const outputPath = path.join(folderPath, filenameWithoutExt + '.webp');

  await sharp(Buffer.from(buffer)).webp({ quality: 50 }).toFile(outputPath);

  return filenameWithoutExt + '.webp';
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
