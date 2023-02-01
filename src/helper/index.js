export async function autoScroll(page) {
	await page.evaluate(async () => {
		await new Promise((resolve) => {
			var totalHeight = 0;
			var distance = 100;
			var timer = setInterval(() => {
				var scrollHeight = document.body.scrollHeight;
				window.scrollBy(0, distance);
				totalHeight += distance;

				if (totalHeight >= scrollHeight - window.innerHeight) {
					clearInterval(timer);
					resolve();
				}
			}, 100);
		});
	});
}

export function getDate() {
	const today = new Date();
	const day = today.getDate().toString().padStart(2, '0');
	const month = (today.getMonth() + 1).toString().padStart(2, '0');
	const year = today.getFullYear();

	return `${day}-${month}-${year}`;
}

export const generate_random_MD5 = () => {
	let result = '';
	const characters = '0123456789abcdef';

	for (let i = 0; i < 32; i++) {
		result += characters.charAt(Math.floor(Math.random() * 16));
	}

	return result;
};
