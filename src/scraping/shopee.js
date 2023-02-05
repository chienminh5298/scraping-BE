import puppeteer, { Page } from 'puppeteer';
import Element from 'puppeteer';

import { autoScroll } from '../helper/index.js';

async function scrapShopee(page, items) {
	let itemsHandles = await page.$$('div.container div.row a[data-sqe="link"]');
	for (let itemhandle of itemsHandles) {
		let links, img, imageId, name, price, oldPrice, percent, sold, location;
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
			percent = '0%';
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
		items.push({ links, name, price, oldPrice, percent, sold, location, img });
	}
}

const scraping = async (data, pageNum) => {
	const browser = await puppeteer.launch({ headless: true, executablePath: '/usr/bin/chromium-browser', args: ['--no-sandbox'] });
	// const browser = await puppeteer.launch({ headless: false });
	const page = await browser.newPage();
	await page.setViewport({
		deviceScaleFactor: 1,
		width: 1920,
		height: 1080,
	});

	let type = data.type;
	let value = data.value;
	var items = [];
	var url = '';
	while (true) {
		let items_per_page = [];
		if (type === 'keyword') {
			url = `https://shopee.vn/mall/search?keyword=${value}&page=${pageNum}`;
		} else {
			url = `${value}?page=${pageNum}`;
		}
		try {
			await page.goto(url);
			await page.waitForSelector('a[data-sqe="link"]');

			await autoScroll(page);

			await scrapShopee(page, items_per_page);
			pageNum += 2;
			// if (pageNum === 2) break;

			items = items.concat(items_per_page);
			//send update socket
			io.to(data.room).emit('update-file', { ...data, items: items_per_page.length });
		} catch (error) {
			break;
		}
	}

	await browser.close();
	return items;
};

export default scraping;
