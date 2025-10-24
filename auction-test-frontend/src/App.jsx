import { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import './App.css';

const SERVER_URL = 'http://localhost:3000';

function App() {
	// Authentication
	const [jwtToken, setJwtToken] = useState('');
	const [auctionId, setAuctionId] = useState('');
	const [isLoggedIn, setIsLoggedIn] = useState(false);

	// Socket
	const [socket, setSocket] = useState(null);
	const [isConnected, setIsConnected] = useState(false);

	// Auction data
	const [auction, setAuction] = useState(null);
	const [remainingTime, setRemainingTime] = useState(0);
	const [isClosed, setIsClosed] = useState(false);
	const [closedReason, setClosedReason] = useState('');

	// Bidding
	const [bidAmount, setBidAmount] = useState('');
	const [isSubmitting, setIsSubmitting] = useState(false);

	// Activity log
	const [logs, setLogs] = useState([]);
	const logsEndRef = useRef(null);

	// Auto scroll logs
	useEffect(() => {
		logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
	}, [logs]);

	// Add log entry
	const addLog = (message, type = 'info') => {
		const timestamp = new Date().toLocaleTimeString();
		setLogs((prev) => [...prev, { timestamp, message, type }]);
	};

	// Connect to auction
	const handleConnect = () => {
		if (!jwtToken || !auctionId) {
			alert('Vui lòng nhập JWT Token và Auction ID');
			return;
		}

		addLog('🔌 Đang kết nối đến server...', 'info');

		const newSocket = io(`${SERVER_URL}/auction`, {
			auth: { token: jwtToken },
			transports: ['websocket', 'polling'],
		});

		// Connection events
		newSocket.on('connect', () => {
			setIsConnected(true);
			addLog('✅ Đã kết nối Socket.IO', 'info');

			// Join auction
			addLog(`📥 Đang tham gia auction ${auctionId}...`, 'info');
			newSocket.emit('auction:join', { auctionId: parseInt(auctionId) });
		});

		newSocket.on('connect_error', (error) => {
			addLog(`❌ Lỗi kết nối: ${error.message}`, 'error');
			setIsConnected(false);
		});

		newSocket.on('disconnect', (reason) => {
			addLog(`❌ Ngắt kết nối: ${reason}`, 'error');
			setIsConnected(false);
		});

		// Auction events
		newSocket.on('auction:joined', (data) => {
			addLog('✅ Đã tham gia auction thành công!', 'info');
			setAuction(data.auction);
			setRemainingTime(data.remainingTime);
			setIsLoggedIn(true);
		});

		newSocket.on('auction:user_joined', (data) => {
			addLog(`👤 User ${data.userId} vừa tham gia auction`, 'info');
		});

		newSocket.on('auction:bid_update', (data) => {
			addLog(
				`💰 BID MỚI! User ${data.winnerId} đặt giá ${formatPrice(
					data.winningPrice,
				)} VND`,
				'bid',
			);

			// Update auction data
			setAuction((prev) => ({
				...prev,
				winner_id: data.winnerId,
				winning_price: data.winningPrice,
			}));
		});

		newSocket.on('auction:time_update', (data) => {
			setRemainingTime(data.remainingTime);
		});

		newSocket.on('auction:closed', (data) => {
			addLog(`🎉 AUCTION ĐÓNG! Lý do: ${data.reason}`, 'closed');
			if (data.winnerId) {
				addLog(
					`🏆 Người thắng: User ${
						data.winnerId
					} với giá ${formatPrice(data.winningPrice)} VND`,
					'closed',
				);
			} else {
				addLog('❌ Không có người thắng', 'closed');
			}
			setIsClosed(true);
			setClosedReason(data.reason);
		});

		newSocket.on('auction:error', (data) => {
			addLog(`❌ Lỗi: ${data.message}`, 'error');
		});

		setSocket(newSocket);
	};

	// Disconnect
	const handleDisconnect = () => {
		if (socket) {
			socket.emit('auction:leave', { auctionId: parseInt(auctionId) });
			socket.disconnect();
			setSocket(null);
			setIsConnected(false);
			setIsLoggedIn(false);
			addLog('👋 Đã ngắt kết nối', 'info');
		}
	};

	// Place bid
	const handlePlaceBid = () => {
		if (!socket || !bidAmount) return;

		const amount = parseFloat(bidAmount);
		const currentPrice = auction?.winning_price || auction?.starting_price;

		if (amount <= currentPrice) {
			alert(`Giá đấu phải lớn hơn ${formatPrice(currentPrice)} VND`);
			return;
		}

		setIsSubmitting(true);
		addLog(`📤 Đang đặt giá ${formatPrice(amount)} VND...`, 'info');

		socket.emit('auction:bid', {
			auctionId: parseInt(auctionId),
			bidAmount: amount,
		});

		setTimeout(() => {
			setIsSubmitting(false);
			setBidAmount('');
		}, 1000);
	};

	// Quick bid buttons
	const handleQuickBid = (increment) => {
		const currentPrice = auction?.winning_price || auction?.starting_price;
		const newAmount = currentPrice + increment;
		setBidAmount(newAmount.toString());
	};

	// Format price
	const formatPrice = (price) => {
		return new Intl.NumberFormat('vi-VN').format(price);
	};

	// Format time
	const formatTime = (seconds) => {
		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);
		const secs = seconds % 60;

		if (hours > 0) {
			return `${hours}:${minutes.toString().padStart(2, '0')}:${secs
				.toString()
				.padStart(2, '0')}`;
		}
		return `${minutes}:${secs.toString().padStart(2, '0')}`;
	};

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			if (socket) {
				socket.disconnect();
			}
		};
	}, [socket]);

	return (
		<div className='app'>
			<div className='header'>
				<h1>🚗⚡ Auction Test - Real-time Bidding</h1>
				<p>Test hệ thống đấu giá real-time với Socket.IO</p>
			</div>

			<div className='container'>
				{!isLoggedIn ? (
					// Login section
					<div className='login-section'>
						<h2>Kết nối đến Auction</h2>
						<p style={{ color: '#666', marginBottom: '30px' }}>
							Nhập JWT token và Auction ID để bắt đầu test
						</p>

						<div className='form-group'>
							<label>JWT Token:</label>
							<input
								type='text'
								placeholder='Nhập JWT token...'
								value={jwtToken}
								onChange={(e) => setJwtToken(e.target.value)}
							/>
						</div>

						<div className='form-group'>
							<label>Auction ID:</label>
							<input
								type='number'
								placeholder='Nhập auction ID...'
								value={auctionId}
								onChange={(e) => setAuctionId(e.target.value)}
							/>
						</div>

						<button
							className='btn btn-primary'
							onClick={handleConnect}
							disabled={isConnected}>
							{isConnected ? 'Đang kết nối...' : 'Kết nối'}
						</button>

						<div style={{ marginTop: '30px', textAlign: 'left' }}>
							<h3>📝 Hướng dẫn:</h3>
							<ol style={{ lineHeight: '1.8', color: '#666' }}>
								<li>Đăng nhập vào hệ thống để lấy JWT token</li>
								<li>Thanh toán deposit để join auction</li>
								<li>Nhập token và auction ID vào form trên</li>
								<li>Click "Kết nối" để join auction</li>
								<li>Đặt giá và xem real-time updates!</li>
							</ol>
						</div>
					</div>
				) : (
					// Auction room
					<>
						<div
							style={{
								textAlign: 'center',
								marginBottom: '20px',
							}}>
							<span
								className={`status-badge ${
									isConnected ? 'connected' : 'disconnected'
								}`}>
								{isConnected
									? '🟢 Đã kết nối'
									: '🔴 Ngắt kết nối'}
							</span>
							<button
								className='btn btn-secondary'
								onClick={handleDisconnect}
								style={{ marginLeft: '10px' }}>
								Ngắt kết nối
							</button>
						</div>

						{isClosed && (
							<div className='auction-closed'>
								<h2>🎉 AUCTION ĐÃ ĐÓNG</h2>
								<p>
									Lý do:{' '}
									{closedReason === 'duration_expired'
										? 'Hết thời gian'
										: 'Đạt target price'}
								</p>
								{auction?.winner_id && (
									<div className='winner-info'>
										🏆 Người thắng: User {auction.winner_id}
										<br />
										💰 Giá cuối:{' '}
										{formatPrice(auction.winning_price)} VND
									</div>
								)}
							</div>
						)}

						{auction && (
							<>
								{/* Auction Info */}
								<div className='auction-info'>
									<h2>Thông tin Auction #{auctionId}</h2>
									<div className='info-grid'>
										<div className='info-item'>
											<label>Giá khởi điểm:</label>
											<div className='value'>
												{formatPrice(
													auction.starting_price,
												)}{' '}
												VND
											</div>
										</div>
										<div className='info-item'>
											<label>Giá hiện tại:</label>
											<div className='value winner'>
												{formatPrice(
													auction.winning_price ||
														auction.starting_price,
												)}{' '}
												VND
											</div>
										</div>
										<div className='info-item'>
											<label>Giá mục tiêu:</label>
											<div className='value'>
												{formatPrice(
													auction.target_price,
												)}{' '}
												VND
											</div>
										</div>
										<div className='info-item'>
											<label>Người dẫn đầu:</label>
											<div className='value'>
												{auction.winner_id
													? `User ${auction.winner_id}`
													: 'Chưa có'}
											</div>
										</div>
									</div>
								</div>

								{/* Timer */}
								<div className='timer'>
									<h3>⏰ Thời gian còn lại</h3>
									<div
										className={`timer-display ${
											remainingTime < 60 ? 'warning' : ''
										}`}>
										{formatTime(remainingTime)}
									</div>
								</div>

								{/* Bidding section */}
								{!isClosed && (
									<div className='bid-section'>
										<h3>💰 Đặt giá</h3>
										<div className='bid-input-group'>
											<input
												type='number'
												placeholder='Nhập số tiền...'
												value={bidAmount}
												onChange={(e) =>
													setBidAmount(e.target.value)
												}
												onKeyPress={(e) =>
													e.key === 'Enter' &&
													handlePlaceBid()
												}
											/>
											<button
												className='btn btn-primary'
												onClick={handlePlaceBid}
												disabled={
													isSubmitting || !bidAmount
												}>
												{isSubmitting
													? 'Đang gửi...'
													: 'Đặt giá'}
											</button>
										</div>

										<div className='quick-bids'>
											<p
												style={{
													width: '100%',
													marginBottom: '10px',
													fontWeight: '600',
												}}>
												Quick bids:
											</p>
											<button
												className='quick-bid-btn'
												onClick={() =>
													handleQuickBid(1000000)
												}>
												+1 triệu
											</button>
											<button
												className='quick-bid-btn'
												onClick={() =>
													handleQuickBid(5000000)
												}>
												+5 triệu
											</button>
											<button
												className='quick-bid-btn'
												onClick={() =>
													handleQuickBid(10000000)
												}>
												+10 triệu
											</button>
											<button
												className='quick-bid-btn'
												onClick={() =>
													handleQuickBid(50000000)
												}>
												+50 triệu
											</button>
										</div>
									</div>
								)}
							</>
						)}

						{/* Activity Log */}
						<div className='activity-log'>
							<h3>📋 Activity Log</h3>
							{logs.length === 0 ? (
								<p style={{ color: '#999' }}>
									Chưa có hoạt động...
								</p>
							) : (
								logs.map((log, index) => (
									<div
										key={index}
										className={`log-item ${log.type}`}>
										<div className='timestamp'>
											{log.timestamp}
										</div>
										<div className='message'>
											{log.message}
										</div>
									</div>
								))
							)}
							<div ref={logsEndRef} />
						</div>
					</>
				)}
			</div>
		</div>
	);
}

export default App;
