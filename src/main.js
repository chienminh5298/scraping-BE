import axios from 'axios';
import excelJS from 'exceljs';
import Jimp from 'jimp';
import fs from 'fs';
import shopee_scraping from './scraping/shopee.js';

import { generate_random_MD5 } from './helper/index.js';

async function resizeImage(imageBuffer) {
	// Read the image buffer using jimp
	const image = await Jimp.read(imageBuffer);

	// Resize the image
	image.resize(Jimp.AUTO, 50);

	// Get the resized image buffer
	const resizedImageBuffer = await image.getBufferAsync(Jimp.MIME_PNG);

	return resizedImageBuffer;
}

export const shopee = async (data) => {
	let items;

	// scraping here
	var promises = [shopee_scraping(data, 0), shopee_scraping(data, 1)];
	await Promise.all(promises).then((values) => {
		items = values[0].concat(values[1]);
	});

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
			const resizedImageBuffer = await resizeImage(image);

			const imageId2 = workbook.addImage({
				buffer: resizedImageBuffer,
				extension: 'jpeg',
			});
			worksheet.addImage(imageId2, {
				tl: { col: 7, row: i + 1 },
				ext: { width: 100, height: 100 },
			});
		} catch (error) {}
	}

	await workbook.xlsx.writeFile(`${filename}.xlsx`);
	const xlsxBuffer = fs.readFileSync(`${filename}.xlsx`);

	//send update socket last time here
	io.to(data.room).emit('update-file', { ...data, items: items.length, file: filename, status: 'prepair' });
};
