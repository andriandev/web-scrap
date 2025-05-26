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
  generatePageUrls,
  extractPostInfo,
  extractTimestampFromText,
} from '../libs/function-kuso';

async function saveData(link: string, $: cheerio.CheerioAPI) {
  const img = $('.post-thumb img').attr('src') || '';
  const infoElement = $('.lexot .info > p');
  const info = extractImageInfo(img);
  const infoPost = extractPostInfo(infoElement);
  let type: string;

  if (infoPost.seasons == 'Anime Movie') {
    type = 'movie';
  } else if (infoPost.seasons == 'Anime Special') {
    type = 'special';
  } else if (infoPost.seasons == 'Anime OVA') {
    type = 'ova';
  } else if (infoPost.seasons == 'Anime ONA') {
    type = 'ona';
  } else {
    type = 'series';
  }

  const folderPath = path.join(
    process.cwd(),
    'data',
    'kuso',
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
    'kuso',
    'img',
    info.year,
    info.month
  );
  const imgUpload = await downloadImage(img, imgFolderPath);

  const pathname = new URL(link).pathname;
  const filename = `${sanitize(pathname)}.json`;
  const filepath = path.join(folderPath, filename);

  const title = $('.post-thumb h1')
    .text()
    .replace('BD', '')
    .replace('Batch', '')
    .replace('Subtitle Indonesia', '')
    .trim();
  const imgPost = imgUpload
    ? `/${info.year}/${info.month}/${imgUpload}`
    : '/default/no-image.webp';

  const pElements = $('.lexot').find('.clear').nextAll('p');
  const dataTagP: string[] = [];
  pElements.each((index, element) => {
    const text = $(element).html() || '';
    if (text != '&nbsp;') {
      if (text.includes(`src="${new URL(link).origin}`)) {
        const imgSrc = $(`<div>${text}<div>`).find('img').attr('src');
        if (imgSrc) {
          dataTagP.push(
            `<p><img src="https://ik.imagekit.io/kus/${imgSrc}" alt="${title}" /></p>`
          );
        }
      } else {
        dataTagP.push(`<p>${text}</p>`);
      }
    }
  });
  const sinopsis = dataTagP
    .join(' ')
    .replaceAll(`href="${new URL(link).origin}`, 'href="')
    .replace(/\n/g, '');

  let linkDl = $('#dl').html();
  if (linkDl) {
    linkDl = linkDl.replace(/&nbsp;/g, '');
    linkDl = `<div class="dlbodz">${linkDl}</div>`;
  }

  const dateElement = $('.venutama .kategoz').text();
  const date = extractTimestampFromText(dateElement);

  const data = {
    title,
    slug: sanitize(pathname),
    type,
    img: imgPost,
    info: infoPost,
    sinopsis: sinopsis ? sinopsis.replaceAll('\n', '').trim() : null,
    link_dl: linkDl,
    date,
  };

  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
  log(chalk.green('Scraped:', link));
  await sleep(delayDetailPage);
}

async function getContentTypeList(link: string) {
  log(chalk.magenta('Visit:', link));
  await openLinks(link, '.venz .kover h2.episodeye a', async (url, $) => {
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
