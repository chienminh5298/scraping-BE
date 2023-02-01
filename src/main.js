import puppeteer, { Page } from 'puppeteer';
import Element from 'puppeteer';
import XLSX from 'xlsx';

import { autoScroll, generate_random_MD5 } from './helper/index.js';

async function scrapShopee(page, items) {
	let itemsHandles = await page.$$('div.container div.row a[data-sqe="link"]');
	for (let itemhandle of itemsHandles) {
		let links, img, img365, name, price, oldPrice, percent, sold, location;
		try {
			links = await page.evaluate((el) => el.getAttribute('href'), itemhandle);
			links = 'https://shopee.vn' + links;
		} catch (error) {
			links = '-';
		}
		try {
			name = await page.evaluate((el) => el.querySelector('div[data-sqe="name"] div div').textContent, itemhandle);
		} catch (error) {
			name = '-';
		}
		try {
			img = await page.evaluate((el) => el.querySelector(`div:nth-child(1) > div:nth-child(1) > div:nth-child(1) > div:nth-child(1) > img`).getAttribute('src'), itemhandle);
		} catch (error) {
			img = '-';
		}
		img365 = `=IMAGE("${img}";1)`;
		try {
			price = await page.evaluate((el) => el.querySelector('div:nth-child(1) > div:nth-child(1) > div:nth-child(2) > div:nth-child(2) > div:nth-child(1) span').textContent, itemhandle);
			price = await page.evaluate((el) => el.querySelector('div:nth-child(1) > div:nth-child(1) > div:nth-child(2) > div:nth-child(2)').textContent, itemhandle);
		} catch (error) {
			price = await page.evaluate((el) => el.querySelector('div:nth-child(1) > div:nth-child(1) > div:nth-child(2) > div:nth-child(2) > div:nth-child(2)').textContent, itemhandle);
		}
		try {
			oldPrice = await page.evaluate((el) => el.querySelector('div:nth-child(1) > div:nth-child(1) > div:nth-child(2) > div:nth-child(2) > div:nth-child(1) span').textContent, itemhandle);
			oldPrice = 0;
		} catch (error) {
			oldPrice = await page.evaluate((el) => el.querySelector('div:nth-child(1) > div:nth-child(1) > div:nth-child(2) > div:nth-child(2) > div:nth-child(1)').textContent, itemhandle);
		}
		try {
			percent = await page.evaluate((el) => el.querySelector('div:nth-child(1) > div:nth-child(1) > div:nth-child(1) > div:nth-child(1) > div:nth-child(3) > div:nth-child(1) > span:nth-child(1)').textContent, itemhandle);
		} catch (error) {
			percent = '-';
		}
		try {
			sold = await page.evaluate((el) => el.querySelector('div:nth-child(1) > div:nth-child(1) > div:nth-child(2) > div:nth-child(3) > div:nth-child(2)').textContent, itemhandle);
			sold = sold.replace(',', '').replace('k', '00').replace('Đã bán', '');
		} catch (error) {
			sold = 0;
		}
		try {
			location = await page.evaluate((el) => el.querySelector('div:nth-child(1) > div:nth-child(1) > div:nth-child(2) > div:nth-child(4)').textContent, itemhandle);
		} catch (error) {
			location = '-';
		}
		items.push({ links, name, price, oldPrice, percent, sold, location, img, img365 });
	}
}

export const shopee = async (data) => {
	let type = data.type;
	let value = data.value;
	let pageNum = 0;
	let items = [];

	const browser = await puppeteer.launch({ headless: true });
	const page = await browser.newPage();
	await page.setViewport({
		deviceScaleFactor: 1,
		width: 1920,
		height: 1080,
	});

	var url = '';
	while (true) {
		if (type === 'keyword') {
			url = `https://shopee.vn/mall/search?keyword=${value}&page=${pageNum}`;
		} else {
			url = `${value}?page=${pageNum}`;
		}
		try {
			await page.goto(url);
			await page.waitForSelector('a[data-sqe="link"]');

			await autoScroll(page);

			await scrapShopee(page, items);
			pageNum++;
			if (pageNum === 2) break;

			//send update socket
			io.to(data.room).emit('update-file', { ...data, items: items.length });
		} catch (error) {
			break;
		}
	}

	const ws = XLSX.utils.json_to_sheet(items);
	/**format xlsx file */
	var wscols = new Array(items.length).fill({ wpx: 100 });
	var wsrows = new Array(items.length).fill({ hpx: 100 });
	ws['!cols'] = wscols;
	ws['!rows'] = wsrows;

	const wb = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(wb, ws, 'Responses');
	const filename = generate_random_MD5();
	XLSX.writeFile(wb, `${filename}.xlsx`);
	await browser.close();
	//send update socket last time here
	io.to(data.room).emit('update-file', { ...data, items: items.length, file: filename });
};
