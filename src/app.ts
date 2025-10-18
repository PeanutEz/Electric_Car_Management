import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';
import { createServer } from 'http';
import { testConnection } from './config/db';
//import { initializeSocket } from './config/socket';
import routes from './routes/index.route';
import { setupSwagger } from './utils/swagger';

dotenv.config();

const app = express();
//const httpServer = createServer(app); // Create HTTP server for Socket.IO

app.use(bodyParser.json());
const PORT = process.env.PORT || 3006;

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

// Initialize WebSocket server
//initializeSocket(httpServer);

// Start server with HTTP server (instead of app.listen)
// httpServer.listen(PORT, async () => {
// 	await testConnection();

// 	console.log(`🚀 Server pham gia lac running on http://localhost:${PORT}`);
// 	console.log(`📄 Swagger UI available at http://localhost:${PORT}/api-docs`);
// 	console.log(`🔌 WebSocket server ready on ws://localhost:${PORT}`);
// });

app.listen(PORT, async () => {
	await testConnection();

	console.log(`🚀 Server SWP391 running on http://localhost:${PORT}`);
	console.log(`📄 Swagger UI available at http://localhost:${PORT}/api-docs`);
});