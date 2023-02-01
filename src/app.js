import createError from 'http-errors';
import express from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import logger from 'morgan';
import cors from 'cors';

import { runSocket } from './socket/index.js';
import { router } from '../routes/index.js';

var app = express();

// view engine setup
app.set('views', path.join('./', 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
// app.use(express.static(path.join(__dirname, 'public')));

app.use(
	cors({
		origin: ['http://localhost:3000', '*'],
		methods: ['GET'],
	})
);

// Socket.io server
runSocket();

// Port
app.listen(4000, () => {
	console.log(`Listening on port: 4000`);
});

// Router
router(app);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
	next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
	// set locals, only providing error in development
	res.locals.message = err.message;
	res.locals.error = req.app.get('env') === 'development' ? err : {};

	// render the error page
	res.status(err.status || 500);
	res.render('error');
});