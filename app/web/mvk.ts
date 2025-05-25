import fs from 'fs';
import path from 'path';
import sanitize from 'sanitize-filename';
import chalk from 'chalk';
import { openLinks, downloadImage, sleep, fetchHTML } from '../libs/function';
import {
  generatePageUrls,
  convertToTimestamp,
  getYearMonth,
  getInfoMovie,
  getSinopsis,
} from '../libs/function-mvk';

const baseUrl = process.env.BASE_URL || '';
const start = Number(process.env.START) || 1;
const end = Number(process.env.END) || 2;
const delayListPage = Number(process.env.DELAY_LIST_PAGE) || 1000;
const delayDetailPage = Number(process.env.DELAY_DETAIL_PAGE) || 1000;

const listUrl = generatePageUrls(baseUrl, start, end);
const log = console.log;

for (const link of listUrl) {
  log(chalk.cyan('Visit:', link));
  await openLinks(link, '.latest .los article a', async (url, $) => {
    const dateElement =
      $('meta[property="article:published_time"]').attr('content') ||
      $('meta[property="article:modified_time"]').attr('content') ||
      '';
    const date = convertToTimestamp(dateElement);
    const { year, month } = getYearMonth(date);

    let type: string;
    if (link.includes('/latest-movies/')) {
      type = 'movie';
    } else if (link.includes('/series/')) {
      type = 'series';
    } else {
      type = 'post';
    }

    const folderPath = path.join(
      process.cwd(),
      'data',
      'mvk',
      type,
      year,
      month
    );
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

    const pathname = new URL(url).pathname;
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
      log(chalk.blue('Fetch', batchHrefLink));
      const htmlData = await fetchHTML(batchHrefLink);
      const allLinks = htmlData('#smokeddl .smokeurl').html() || '';
      linkDl = allLinks
        .replaceAll('\n', '')
        .replaceAll('\t', '')
        .replaceAll('&nbsp;', '');
    }

    if (!linkDl || linkDl.trim() == '') {
      log(chalk.yellow('No link_dl =>', link, url, batchHrefLink));
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
    log(chalk.green('Scraped:', url));
    await sleep(delayDetailPage);
  });
  await sleep(delayListPage);
}
