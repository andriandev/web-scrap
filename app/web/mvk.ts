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
  generatePageUrls,
  convertToTimestamp,
  getYearMonth,
  getInfoMovie,
  getSinopsis,
} from '../libs/function-mvk';

async function saveData(link: string, type: string, $: cheerio.CheerioAPI) {
  const dateElement =
    $('meta[property="article:published_time"]').attr('content') ||
    $('meta[property="article:modified_time"]').attr('content') ||
    '';
  const date = convertToTimestamp(dateElement);
  const { year, month } = getYearMonth(date);

  const folderPath = path.join(process.cwd(), 'data', 'mvk', type, year, month);
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }

  const imgFolderPath = path.join(
    process.cwd(),
    'data',
    'mvk',
    'img',
    year,
    month
  );
  let img = $('#content .limage img').attr('src') || '';
  if (img.includes('/wp-content/') || img.includes('/image.tmdb.org/')) {
    img = img;
  } else {
    img = $('#content .limage img').attr('data-lazy-src') || '';
  }
  const imgUpload = await downloadImage(img, imgFolderPath);

  const pathname = new URL(link).pathname;
  const filename = `${sanitize(pathname)}.json`;
  const filepath = path.join(folderPath, filename);

  const title = $('h1.entry-title')
    .text()
    .replace('Nonton ', '')
    .replace(/^Film\s+/i, '')
    .replace('Subtitle Indonesia', '')
    .trim();
  const imgPost = imgUpload
    ? `/${year}/${month}/${imgUpload}`
    : '/default/no-image.webp';
  const metaElement = $('.bixbox .right ul.data').html() || '';
  const meta = getInfoMovie(metaElement);
  const sinopsisElement = $('.synops').html() || '';
  const sinopsis = getSinopsis(sinopsisElement);
  const linkDlElement = $('#smokeddl .smokeurl').html() || '';
  const batchHrefLink =
    $(
      '#smokeddl .ts-chl-collapsible-content:last-child .epsdlist ul li:last-child a'
    ).attr('href') || '';
  let linkDl: string = linkDlElement
    .replaceAll('\n', '')
    .replaceAll('\t', '')
    .replaceAll('&nbsp;', '')
    .trim();

  if (!linkDl && batchHrefLink) {
    log(chalk.cyan('Fetch', batchHrefLink));
    const htmlData = await fetchHTML(batchHrefLink);
    const allLinks = htmlData('#smokeddl .smokeurl').html() || '';
    linkDl = allLinks
      .replaceAll('\n', '')
      .replaceAll('\t', '')
      .replaceAll('&nbsp;', '');
  }

  if (!linkDl || linkDl.trim() == '') {
    log(chalk.yellow('No link_dl =>', link, batchHrefLink));
  } else {
    linkDl = `<div id="smokeddl">${linkDl}</div>`;
  }

  const data = {
    title,
    slug: sanitize(pathname),
    type,
    img: imgPost,
    info: meta,
    sinopsis,
    link_dl: linkDl,
    date,
  };

  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
  log(chalk.green('Scraped:', link));
  await sleep(delayDetailPage);
}

async function getContentTypeList(link: string) {
  log(chalk.magenta('Visit:', link));
  await openLinks(link, '.latest .los article a', async (url, $) => {
    let type: string;
    if (link.includes('/latest-movies/')) {
      type = 'movie';
    } else if (link.includes('/series/')) {
      type = 'series';
    } else {
      type = 'post';
    }
    await saveData(url, type, $);
  });
  await sleep(delayListPage);
}

async function getContentTypeDetail(link: string) {
  const $ = await fetchHTML(link);
  const typeElement =
    $('meta[property="article:section"]').attr('content') || '';
  let type: string;
  if (typeElement.toLowerCase().trim() == 'movies') {
    type = 'movie';
  } else if (
    typeElement.toLowerCase().trim() == 'drakor' ||
    typeElement.toLowerCase().trim() == 'tv series'
  ) {
    type = 'series';
  } else {
    type = 'post';
  }
  await saveData(link, type, $);
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
