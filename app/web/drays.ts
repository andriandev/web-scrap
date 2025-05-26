import fs from 'fs';
import path from 'path';
import sanitize from 'sanitize-filename';
import chalk from 'chalk';
import * as cheerio from 'cheerio';
import {
  baseUrl,
  listPageUrl,
  start,
  end,
  delayDetailPage,
  delayListPage,
  scrapType,
  log,
} from '../config/setting';
import {
  fetchHTML,
  openLinks,
  downloadImage,
  sleep,
  generateLinksArray,
  errorScrapType,
} from '../libs/function';
import {
  extractImageInfo,
  extractYouTubeId,
  generatePageUrls,
} from '../libs/function-drays';

export async function saveData(link: string, $: cheerio.CheerioAPI) {
  const img = $('.posthumb img').attr('src') || '';
  const info = extractImageInfo(img);
  const items = $('.postdetail .thn .mr-4');
  const textDuration = $(items[2]).text().trim();

  let type: string;
  if (
    baseUrl.includes('/series/') ||
    ['Min/Eps', 'Minutes/Eps'].includes(textDuration)
  ) {
    type = 'series';
  } else {
    type = 'movies';
  }

  const folderPath = path.join(
    process.cwd(),
    'data',
    'drays',
    type,
    info.year,
    info.month
  );
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }

  const imgFolderPath = path.join(
    process.cwd(),
    'data',
    'drays',
    'img',
    info.year,
    info.month
  );
  const imgUpload = await downloadImage(img, imgFolderPath);

  const pathname = new URL(link).pathname;
  const filename = `${sanitize(pathname)}.json`;
  const filepath = path.join(folderPath, filename);

  const ytSrc = $('#tab-2.tab-content iframe').attr('src');
  let linkElement = $('#dl_tab').html();
  let linkHtml = `<div id="dl_tab">${linkElement}</div>`;
  if (!linkElement) {
    linkElement = $('table.download').html();
    linkHtml = `<table id="download">${linkElement}</table>`;
  }

  const title = $('.postdetail h1').text().trim();
  const imgPost = imgUpload
    ? `/${info.year}/${info.month}/${imgUpload}`
    : '/default/no-image.webp';
  const imgLarge = $('.backdrop img').attr('src');
  const year = $(items[0]).text().trim();
  const country = $(items[1]).text().trim();
  const duration = $(items[2]).text().trim();
  const rate = $('.backdrop span.bg-yellow-105').text().trim() || '6';
  const quality = $('.backdrop span.bg-orange-500').text().trim() || 'BluRay';
  const genres = $('.postdetail .info p.mt-3 a')
    .map((_, el) => $(el).text().trim())
    .get();
  const sinopsis = $('#tab-1.tab-content').html();
  const trailer = ytSrc ? extractYouTubeId(ytSrc) : null;
  const link_dl = linkHtml
    .replaceAll('\n', '')
    .replace(
      ' class="text-center bg-blue-500 rounded font-medium text-white py-2 block"',
      ''
    )
    .replaceAll(' class="flex flex-wrap my-2 mb-3"', '')
    .replaceAll(
      ' bg-blue-500 px-2 py-1 rounded text-center text-white mr-2',
      ''
    );

  const data = {
    title,
    slug: sanitize(pathname),
    img: imgPost,
    img_large: imgLarge,
    duration,
    year,
    country,
    trailer,
    rate,
    quality,
    genres,
    sinopsis: sinopsis ? sinopsis.replaceAll('\n', '').trim() : null,
    link_dl,
    date: info.timestamp,
  };

  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
  log(chalk.green('Scraped:', link));
  await sleep(delayDetailPage);
}

async function getContentTypeList(link: string) {
  log(chalk.magenta('Visit:', link));
  await openLinks(link, '#movies .content a', async (url, $) => {
    await saveData(url, $);
  });
  await sleep(delayListPage);
}

async function getContentTypeDetail(link: string) {
  const $ = await fetchHTML(link);
  await saveData(link, $);
}

if (scrapType == 'list') {
  const listUrl = generatePageUrls(baseUrl, start, end);
  for (const link of listUrl) {
    await getContentTypeList(link);
  }
} else if (scrapType == 'detail') {
  const listUrl = generateLinksArray(listPageUrl);
  for (const link of listUrl) {
    await getContentTypeDetail(link);
  }
} else {
  errorScrapType(scrapType);
}
