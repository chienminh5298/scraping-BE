import sockjs from 'sockjs';
import { createServer } from 'http';
import { Server } from 'socket.io';

export const runSocket = () => {
	global.io = new Server(9999, {
		cors: {
			origin: ['http://scraping.minhnguyen.website'],
		},
	});
	io.on('connection', (socket) => {});
};
