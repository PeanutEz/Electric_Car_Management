import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';
import http from 'http';
import { testConnection } from './config/db';
import routes from './routes/index.route';
import { setupSwagger } from './utils/swagger';
import { initializeSocket, setupAuctionSocket } from './config/socket';
import { initializeActiveAuctions } from './services/auction.service';

dotenv.config();

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
const io = initializeSocket(server);

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

// Setup auction socket namespace
setupAuctionSocket();

server.listen(PORT, async () => {
	await testConnection();

	// Initialize timers for active auctions on server start
	await initializeActiveAuctions();

	console.log(`🚀 Server SWP391 running on http://localhost:${PORT}`);
	console.log(`📄 Swagger UI available at http://localhost:${PORT}/api-docs`);
	console.log(`🔌 Socket.IO initialized for chat and auction`);
});
