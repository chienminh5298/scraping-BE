import * as main from '../src/main.js';

/* GET home page. */
export const router = (app) => {
	app.get('/', function (req, res, next) {
		res.render('index', { title: 'Hey', message: 'Hello there!' });
	});
	app.post('/download', async function (req, res, next) {
		const search = req.body;
		res.status(200).end();
		if (search.platform == 'shopee.vn') {
			await main.shopee(search);
		}
	});
	app.get('/files', async function (req, res, next) {
		let file = req.query.id;
		res.download(`${file}.xlsx`);
	});
};
