import puppeteer, { Page } from 'puppeteer';
import Element from 'puppeteer';
import XLSX from 'xlsx';
import axios from 'axios';
import excelJS from 'exceljs';
import fs from 'fs';
import { autoScroll, generate_random_MD5 } from './helper/index.js';

// download item image
const getImage = async (imageUrl) => {
	const response = await axios({
		method: 'get',
		url: imageUrl,
		responseType: 'arraybuffer',
	});
	const buffer = new Buffer.from(response.data, 'binary');

	return buffer;
};

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

export const shopee = async (data) => {
	let type = data.type;
	let value = data.value;
	let pageNum = 0;
	let items = [];

	const browser = await puppeteer.launch({ headless: false });
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
			// if (pageNum === 4) break;

			//send update socket
			io.to(data.room).emit('update-file', { ...data, items: items.length });
		} catch (error) {
			break;
		}
	}
	io.to(data.room).emit('update-file', { ...data, items: items.length, status: 'prepair' });
	const filename = generate_random_MD5();
	const workbook = new excelJS.Workbook();
	const worksheet = workbook.addWorksheet('My Sheet');
	// Add the header row to the worksheet
	worksheet.columns = [
		{ header: 'Links', key: 'links', width: 10 },
		{ header: 'Name', key: 'name', width: 30 },
		{ header: 'Price', key: 'price', width: 25 },
		{ header: 'Old Price', key: 'oldPrice', width: 15 },
		{ header: 'Percent', key: 'percent', width: 10 },
		{ header: 'Sold', key: 'sold', width: 10 },
		{ header: 'Location', key: 'location', width: 15 },
		{ header: 'Image', key: 'img', width: 20 },
	];

	/**Fill header color */
	let headerRow = worksheet.getRow(1);
	let cellCount = headerRow.cellCount;
	for (let cell = 1; cell <= cellCount; cell++) {
		let currentCell = headerRow.getCell(cell);
		currentCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E90FF' } };
		currentCell.font = { bold: true };
		currentCell.alignment = { vertical: 'middle', horizontal: 'center' };
	}

	/**Insert item value */
	for (let i = 0; i < items.length; i++) {
		const row = worksheet.getRow(i + 2);
		row.height = 100;

		/**Set value */
		row.getCell(1).value = {
			text: items[i].links,
			hyperlink: items[i].links,
			tooltip: items[i].links,
		};
		row.getCell(2).value = items[i].name;
		row.getCell(3).value = items[i].price;
		row.getCell(4).value = items[i].oldPrice;
		row.getCell(5).value = items[i].percent;
		row.getCell(6).value = items[i].sold;
		row.getCell(7).value = items[i].location;
		/**Align center value */
		row.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
		row.getCell(2).alignment = { vertical: 'middle', horizontal: 'center' };
		row.getCell(3).alignment = { vertical: 'middle', horizontal: 'center' };
		row.getCell(4).alignment = { vertical: 'middle', horizontal: 'center' };
		row.getCell(5).alignment = { vertical: 'middle', horizontal: 'center' };
		row.getCell(6).alignment = { vertical: 'middle', horizontal: 'center' };
		row.getCell(7).alignment = { vertical: 'middle', horizontal: 'center' };

		/**Insert item image */
		try {
			const response = await axios.get(items[i].img, { responseType: 'arraybuffer' });
			const image = Buffer.from(response.data, 'binary');
			const imageId2 = workbook.addImage({
				buffer: image,
				extension: 'jpeg',
			});
			worksheet.addImage(imageId2, {
				tl: { col: 7, row: i + 1 },
				ext: { width: 100, height: 100 },
			});
		} catch (error) {}
	}

	await workbook.xlsx.writeFile(`${filename}.xlsx`);
	await browser.close();
	//send update socket last time here
	io.to(data.room).emit('update-file', { ...data, items: items.length, file: filename, status: 'prepair' });
};
