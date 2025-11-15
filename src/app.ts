import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';
import http from 'http';
import cron from 'node-cron';
import { testConnection } from './config/db';
import routes from './routes/index.route';
import { setupSwagger } from './utils/swagger';
import { initializeSocket, setupAuctionSocket } from './config/socket';
import {
	initializeActiveAuctions,
	cancelExpiredDraftAuctions,
} from './services/auction.service';
import { cancelExpiredPendingOrders } from './services/service.service';

dotenv.config();

const app = express();
const server = http.createServer(app);

initializeSocket(server);
// Setup auction socket namespace
setupAuctionSocket();

app.use(bodyParser.json());
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Cấu hình CORS cho phép truy cập từ frontend
app.use(
	cors({
		origin: '*',
		credentials: true,
	}),
);

app.use(routes);

setupSwagger(app);

server.listen(PORT, async () => {
	await testConnection();

	// Initialize timers for active auctions on server start
	await initializeActiveAuctions();

	// ⏰ Cron job: Hủy các order pending quá 5 phút (chạy mỗi phút)
	cron.schedule('* * * * *', async () => {
		try {
			const cancelledCount = await cancelExpiredPendingOrders();
			if (cancelledCount > 0) {
				console.log(
					`⏰ Cron: Cancelled ${cancelledCount} expired pending orders`,
				);
			}
		} catch (error) {
			console.error('❌ Cron error (pending orders):', error);
		}
	});

	// ⏰ Cron job: Hủy các auction draft quá 20 ngày (chạy mỗi ngày lúc 00:00)
	cron.schedule('0 0 * * *', async () => {
		try {
			const cancelledCount = await cancelExpiredDraftAuctions();
			if (cancelledCount > 0) {
				console.log(
					`⏰ Cron: Cancelled ${cancelledCount} expired draft auctions`,
				);
			}
		} catch (error) {
			console.error('❌ Cron error (draft auctions):', error);
		}
	});

	console.log(`🚀 Server SWP391 running on http://localhost:${PORT}`);
	console.log(`📄 Swagger UI available at http://localhost:${PORT}/api-docs`);
	console.log(`🔌 Socket.IO initialized for auction`);
	console.log(
		`⏰ Cron job started: Cancel expired pending orders every minute`,
	);
	console.log(
		`⏰ Cron job started: Cancel expired draft auctions daily at 00:00`,
	);
});
