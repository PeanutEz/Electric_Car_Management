#!/usr/bin/env node

/**
 * Test script for Auction Socket.IO
 * 
 * Usage:
 * 1. Make sure server is running: npm run dev
 * 2. Get a JWT token from login API
 * 3. Run this script: node test-auction-socket.js
 */

const io = require('socket.io-client');

// Configuration
const SERVER_URL = 'http://localhost:3006';
const JWT_TOKEN = 'YOUR_JWT_TOKEN_HERE'; // Replace with actual token
const AUCTION_ID = 1; // Replace with actual auction ID
const BID_AMOUNT = 250000000; // 250 million VND

console.log('🧪 Starting Auction Socket Test...\n');

// Connect to auction namespace
const socket = io(`${SERVER_URL}/auction`, {
   auth: {
      token: JWT_TOKEN
   },
   transports: ['websocket', 'polling']
});

// Connection events
socket.on('connect', () => {
   console.log('✅ Connected to auction socket');
   console.log('📡 Socket ID:', socket.id);
   console.log('');

   // Join auction room
   console.log(`📥 Joining auction ${AUCTION_ID}...`);
   socket.emit('auction:join', { auctionId: AUCTION_ID });
});

socket.on('connect_error', (error) => {
   console.error('❌ Connection error:', error.message);
   process.exit(1);
});

socket.on('disconnect', (reason) => {
   console.log('❌ Disconnected:', reason);
});

// Auction events
socket.on('auction:joined', (data) => {
   console.log('✅ Successfully joined auction!\n');
   console.log('📊 Auction Details:');
   console.log('   - Auction ID:', data.auctionId);
   console.log('   - Product ID:', data.auction.product_id);
   console.log('   - Starting Price:', data.auction.starting_price.toLocaleString(), 'VND');
   console.log('   - Target Price:', data.auction.target_price.toLocaleString(), 'VND');
   console.log('   - Current Winner:', data.auction.winner_id || 'None');
   console.log('   - Current Price:', (data.auction.winning_price || data.auction.starting_price).toLocaleString(), 'VND');
   console.log('   - Remaining Time:', data.remainingTime, 'seconds');
   console.log('   - Message:', data.message);
   console.log('');

   // Place a test bid after 2 seconds
   setTimeout(() => {
      console.log(`💰 Placing bid of ${BID_AMOUNT.toLocaleString()} VND...`);
      socket.emit('auction:bid', {
         auctionId: AUCTION_ID,
         bidAmount: BID_AMOUNT
      });
   }, 2000);
});

socket.on('auction:user_joined', (data) => {
   console.log('👤 New participant joined:');
   console.log('   - User ID:', data.userId);
   console.log('   - Message:', data.message);
   console.log('');
});

socket.on('auction:bid_update', (data) => {
   console.log('💰 BID UPDATE!');
   console.log('   - Auction ID:', data.auctionId);
   console.log('   - Winner ID:', data.winnerId);
   console.log('   - Winning Price:', data.winningPrice.toLocaleString(), 'VND');
   console.log('   - Message:', data.message);
   console.log('   - Timestamp:', new Date(data.timestamp).toLocaleString());
   console.log('');
});

socket.on('auction:time_update', (data) => {
   console.log('⏰ Time Update:');
   console.log('   - Remaining:', data.remainingTime, 'seconds');
   console.log('');
});

socket.on('auction:closed', (data) => {
   console.log('🎉 AUCTION CLOSED!');
   console.log('   - Auction ID:', data.auctionId);
   console.log('   - Reason:', data.reason);
   console.log('   - Winner ID:', data.winnerId);
   console.log('   - Final Price:', data.winningPrice ? data.winningPrice.toLocaleString() + ' VND' : 'N/A');
   console.log('   - Message:', data.message);
   console.log('');

   // Disconnect after 2 seconds
   setTimeout(() => {
      console.log('👋 Leaving auction and disconnecting...');
      socket.emit('auction:leave', { auctionId: AUCTION_ID });
      socket.disconnect();
      process.exit(0);
   }, 2000);
});

socket.on('auction:error', (data) => {
   console.error('❌ ERROR:', data.message);
   console.log('');
});

// Graceful shutdown
process.on('SIGINT', () => {
   console.log('\n👋 Shutting down...');
   socket.emit('auction:leave', { auctionId: AUCTION_ID });
   socket.disconnect();
   process.exit(0);
});

console.log('⏳ Waiting for connection...\n');
