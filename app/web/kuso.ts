import fs from 'fs';
import path from 'path';
import sanitize from 'sanitize-filename';
import chalk from 'chalk';
import { openLinks, downloadImage, sleep } from '../libs/function';
import {
  extractImageInfo,
  generatePageUrls,
  extractPostInfo,
  extractTimestampFromText,
} from '../libs/function-kuso';

const baseUrl = process.env.BASE_URL || '';
const start = Number(process.env.START) || 1;
const end = Number(process.env.END) || 2;
const delayListPage = Number(process.env.DELAY_LIST_PAGE) || 1000;
const delayDetailPage = Number(process.env.DELAY_DETAIL_PAGE) || 1000;

const listUrl = generatePageUrls(baseUrl, start, end);
const log = console.log;

for (const link of listUrl) {
  log(chalk.cyan('Visit:', link));
  await openLinks(link, '.venz .kover h2.episodeye a', async (url, $) => {
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

    const pathname = new URL(url).pathname;
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
        if (text.includes(`src="${new URL(url).origin}`)) {
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
      .replaceAll(`href="${new URL(url).origin}`, 'href="')
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
    log(chalk.green('Scraped:', url));
    await sleep(delayDetailPage);
  });
  await sleep(delayListPage);
}
