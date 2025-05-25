import * as cheerio from 'cheerio';

interface MovieData {
  genre?: string[];
  release?: string;
  stars?: string[];
  duration?: string;
  director?: string[];
  country?: string;
  quality?: string;
  score?: string;
  rating?: string;
  // Tambahkan properti lain jika ada li lain yang ingin Anda ambil
  [key: string]: string | string[] | undefined;
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
      ? normalizedBaseUrl + '?fb=click'
      : `${normalizedBaseUrl}page/${currentPage}/?fb=click`;
  });
}

export function convertToTimestamp(dateString?: string | null): number {
  let dateObject: Date;

  if (dateString && dateString.trim() !== '') {
    dateObject = new Date(dateString);

    if (isNaN(dateObject.getTime())) {
      console.warn(
        `Peringatan: String tanggal "${dateString}" tidak valid. Menggunakan 2000-01-01.`
      );
      dateObject = new Date('2000-01-01T00:00:00Z');
    }
  } else {
    console.log(`Menggunakan 2000-01-01 karena dateString tidak disediakan.`);
    dateObject = new Date('2000-01-01T00:00:00Z');
  }

  // Mengambil timestamp dalam milidetik dan membaginya dengan 1000 untuk mendapatkan detik
  return Math.floor(dateObject.getTime() / 1000);
}

export function getYearMonth(ts: number): { year: string; month: string } {
  const dObj = new Date(ts * 1000); // Konversi detik ke milidetik untuk Date object

  const yearNum = dObj.getUTCFullYear();
  const monthNum = dObj.getUTCMonth() + 1; // +1 karena bulan 0-indexed

  // Format bulan menjadi 2 digit (misal: 5 -> "05")
  const formattedMonth = monthNum < 10 ? `0${monthNum}` : `${monthNum}`;

  return {
    year: String(yearNum), // Konversi tahun ke string
    month: formattedMonth, // Bulan sudah dalam format string 2 digit
  };
}

export function getInfoMovie(htmlString: string): MovieData {
  const $ = cheerio.load(htmlString);
  const result: MovieData = {};

  // Iterasi setiap elemen <li> di dalam <ul> dengan class "data"
  $('li').each((_i, el) => {
    const $li = $(el);
    const keyText = $li.find('b').text().replace(':', '').trim(); // Ambil teks kunci (misal: "Genre")
    const key = keyText.toLowerCase(); // Ubah kunci ke huruf kecil

    // Ambil elemen span.colspan yang berisi nilai
    const $valueSpan = $li.find('.colspan');

    let value: string | string[] | undefined;

    if (key === 'genre') {
      // Untuk genre, ambil semua teks dari <a> di dalam span, dan jadikan array
      value = $valueSpan
        .find('a')
        .map((_j, aEl) => $(aEl).text().trim())
        .get();
    } else if (key === 'stars' || key === 'director') {
      // Untuk stars dan director, ambil teks dari <a>, dan batasi hingga 3 item
      const items = $valueSpan
        .find('a')
        .map((_j, aEl) => $(aEl).text().trim())
        .get();
      value = items.slice(0, 3); // Ambil hanya 3 item pertama
    } else if (key === 'release') {
      // Untuk release, ambil nilai dari atribut 'datetime' jika ada, jika tidak ambil text content
      value = $valueSpan.find('time').text().trim() || $valueSpan.text().trim();
    } else {
      // Untuk key lain, ambil langsung teksnya
      value = $valueSpan.text().trim();
    }

    // Assign nilai ke objek hasil
    result[key] = value;
  });

  return result;
}

export function getSinopsis(htmlString: string): string {
  const $ = cheerio.load(htmlString);

  // Seleksi semua elemen <p> yang berada di dalam '.synops .entry-content'
  const allPs = $('.entry-content p');

  // Periksa apakah ada tag <p> yang ditemukan
  if (allPs.length > 0) {
    // Konversi koleksi Cheerio menjadi array JavaScript DOM node.
    // Kemudian, untuk setiap node, ambil outer HTML-nya (termasuk tag <p> itu sendiri)
    // dan gabungkan semua string HTML menjadi satu.
    const combinedPsHtml = allPs
      .toArray()
      .map((el) => $.html(el))
      .join('');
    return combinedPsHtml;
  }

  // Jika tidak ada tag <p> yang ditemukan, kembalikan string kosong
  return '';
}
