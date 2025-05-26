export const baseUrl = process.env.BASE_URL || '';
export const listPageUrl = process.env.LIST_PAGE_URL || '';
export const start = Number(process.env.START) || 1;
export const end = Number(process.env.END) || 2;
export const delayListPage = Number(process.env.DELAY_LIST_PAGE) || 1000;
export const delayDetailPage = Number(process.env.DELAY_DETAIL_PAGE) || 1000;
export const scrapType: 'detail' | 'list' =
  (process.env.SCRAP_TYPE as 'detail') || 'detail';
export const log = console.log;
