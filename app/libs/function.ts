import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import * as cheerio from 'cheerio';

function fetchOption({ url = '' }) {
  return {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      Referer: filterUrl(url),
    },
    tls: {
      rejectUnauthorized: false,
    },
  };
}

export async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, fetchOption({ url: url }));
  if (!res.ok) throw new Error(`Failed fetch ${url}`);
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

export async function downloadImage(
  url: string,
  folderPath: string
): Promise<string | null> {
  try {
    const res = await fetch(url, fetchOption({ url }));
    if (!res.ok) throw new Error(`Failed download image ${url}`);

    const buffer = await res.arrayBuffer();

    fs.mkdirSync(folderPath, { recursive: true });

    const imgFilename = url.split('/').pop() || 'image';
    const filenameWithoutExt = path.parse(imgFilename).name;
    const outputPath = path.join(folderPath, filenameWithoutExt + '.webp');

    await sharp(Buffer.from(buffer)).webp({ quality: 50 }).toFile(outputPath);

    return filenameWithoutExt + '.webp';
  } catch (err) {
    console.log(err);
    return null;
  }
}

export function generateLinksArray(linkString: string): string[] {
  // Trim spasi di awal/akhir string, lalu pisahkan berdasarkan koma.
  // map() digunakan untuk memastikan setiap link juga bersih dari spasi ekstra.
  const links = linkString
    .split(',')
    .map((link) => link.trim())
    .filter((link) => link.length > 0); // Filter untuk menghilangkan string kosong jika ada koma ganda atau di ujung

  return links;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function filterUrl(url: string): string {
  // Gunakan regex untuk menghapus karakter non-alfanumerik kecuali garis miring, titik, dan tanda hubung
  return url.replace(/[^\w\-\/.:]+/g, '');
}

export function errorScrapType(type: string): void {
  console.error(`Scrap type must be list or detail received ${type}`);
}
