// import { Server as SocketServer } from 'socket.io';
// import { Server as HttpServer } from 'http';

// let io: SocketServer;

// /**
//  * Initialize Socket.IO server
//  * @param server HTTP server instance
//  */
// export function initializeSocket(server: HttpServer): SocketServer {
// 	io = new SocketServer(server, {
// 		cors: {
// 			origin: process.env.FRONTEND_URL || '*', // Cho phép tất cả origins trong development
// 			credentials: true,
// 			methods: ['GET', 'POST'],
// 		},
// 		transports: ['websocket', 'polling'], // Hỗ trợ cả websocket và polling
// 	});

// 	// Connection event
// 	io.on('connection', (socket) => {
// 		console.log(`✅ Client connected: ${socket.id}`);
// 		console.log(`📊 Total connected clients: ${io.engine.clientsCount}`);

// 		// Send welcome message
// 		socket.emit('connection:success', {
// 			message: 'Connected to WebSocket server',
// 			socketId: socket.id,
// 			timestamp: new Date().toISOString(),
// 		});

// 		// Handle disconnection
// 		socket.on('disconnect', (reason) => {
// 			console.log(
// 				`❌ Client disconnected: ${socket.id}, Reason: ${reason}`,
// 			);
// 			console.log(`📊 Remaining clients: ${io.engine.clientsCount}`);
// 		});

// 		// Handle errors
// 		socket.on('error', (error) => {
// 			console.error(`❌ Socket error from ${socket.id}:`, error);
// 		});

// 		// Ping/Pong for connection health check
// 		socket.on('ping', () => {
// 			socket.emit('pong', { timestamp: new Date().toISOString() });
// 		});
// 	});

// 	console.log('🔌 WebSocket server initialized');

// 	return io;
// }

// /**
//  * Get Socket.IO instance
//  * @returns Socket.IO server instance
//  */
// export function getIO(): SocketServer {
// 	if (!io) {
// 		throw new Error(
// 			'Socket.IO has not been initialized. Call initializeSocket first.',
// 		);
// 	}
// 	return io;
// }

// /**
//  * Emit event to all connected clients
//  * @param event Event name
//  * @param data Data to send
//  */
// export function emitToAll(event: string, data: any): void {
// 	if (io) {
// 		io.emit(event, data);
// 		console.log(
// 			`📡 Emitted '${event}' to all clients (${io.engine.clientsCount} clients)`,
// 		);
// 	}
// }

// /**
//  * Emit event to specific room
//  * @param room Room name
//  * @param event Event name
//  * @param data Data to send
//  */
// export function emitToRoom(room: string, event: string, data: any): void {
// 	if (io) {
// 		io.to(room).emit(event, data);
// 		console.log(`📡 Emitted '${event}' to room '${room}'`);
// 	}
// }

// /**
//  * Emit event to specific socket
//  * @param socketId Socket ID
//  * @param event Event name
//  * @param data Data to send
//  */
// export function emitToSocket(socketId: string, event: string, data: any): void {
// 	if (io) {
// 		io.to(socketId).emit(event, data);
// 		console.log(`📡 Emitted '${event}' to socket ${socketId}`);
// 	}
// }

// /**
//  * Get number of connected clients
//  * @returns Number of connected clients
//  */
// export function getConnectedClientsCount(): number {
// 	return io ? io.engine.clientsCount : 0;
// }

// /**
//  * Get all connected socket IDs
//  * @returns Array of socket IDs
//  */
// export async function getConnectedSocketIds(): Promise<string[]> {
// 	if (!io) return [];
// 	const sockets = await io.fetchSockets();
// 	return sockets.map((socket) => socket.id);
// }
