# Socket Event Implementation for Auction Deposit

## Overview
Implemented real-time socket event emission when a user successfully pays auction deposit. This allows immediate notification to all auction participants that a new user has joined the bidding.

## Implementation Details

### Modified File: `src/services/payment.service.ts`

#### 1. **Updated Imports**
```typescript
import { sendNotificationToUser, getIO } from '../config/socket';
import { getVietnamTime, getVietnamISOString } from '../utils/datetime';
```

Added:
- `getIO`: To access Socket.IO instance
- `getVietnamISOString`: To provide ISO timestamp in Vietnam timezone

#### 2. **Credit Payment Success** (Line ~525)
After successful deposit payment using credit:
```typescript
// 🔌 Emit socket event: User joined auction room after successful deposit
try {
    const io = getIO();
    const auctionNamespace = io.of('/auction');
    
    // Get user info for the event
    const [userRows]: any = await connection.query(
        `SELECT full_name, email FROM users WHERE id = ?`,
        [buyerId]
    );

    // Emit to auction room that user has joined
    auctionNamespace.to(`auction_${auctionId}`).emit('auction:user_joined', {
        userId: buyerId,
        userName: userRows[0]?.full_name || 'User',
        auctionId: auctionId,
        depositAmount: depositAmount,
        timestamp: getVietnamISOString(),
        message: `${userRows[0]?.full_name || 'User'} đã tham gia đấu giá`,
    });

    console.log(`🔌 Socket emitted: User ${buyerId} joined auction ${auctionId}`);
} catch (socketError: any) {
    console.error(
        '⚠️ Failed to emit socket event for auction join:',
        socketError.message,
    );
}
```

#### 3. **PayOS Payment Success** (Line ~705)
After successful deposit payment via PayOS in `confirmAuctionDepositPayment`:
```typescript
// 🔌 Emit socket event: User joined auction room after successful deposit via PayOS
try {
    const io = getIO();
    const auctionNamespace = io.of('/auction');
    
    // Get user and auction info for the event
    const [userRows]: any = await connection.query(
        `SELECT full_name, email FROM users WHERE id = ?`,
        [auctionData.buyer_id]
    );

    // Emit to auction room that user has joined
    auctionNamespace.to(`auction_${auctionData.auction_id}`).emit('auction:user_joined', {
        userId: auctionData.buyer_id,
        userName: userRows[0]?.full_name || 'User',
        auctionId: auctionData.auction_id,
        depositAmount: orderRows[0].price,
        timestamp: getVietnamISOString(),
        message: `${userRows[0]?.full_name || 'User'} đã tham gia đấu giá`,
    });

    console.log(`🔌 Socket emitted: User ${auctionData.buyer_id} joined auction ${auctionData.auction_id} (PayOS)`);
} catch (socketError: any) {
    console.error(
        '⚠️ Failed to emit socket event for auction join (PayOS):',
        socketError.message,
    );
}
```

## Socket Event Structure

### Event Name: `auction:user_joined`

### Event Data:
```typescript
{
    userId: number,           // ID of user who joined
    userName: string,         // Full name of user
    auctionId: number,        // ID of auction they joined
    depositAmount: number,    // Amount they deposited
    timestamp: string,        // ISO timestamp in Vietnam timezone (GMT+7)
    message: string          // Vietnamese message for UI display
}
```

### Namespace: `/auction`
- Event is emitted to room: `auction_${auctionId}`
- Only users who have joined the specific auction room will receive this event

## Flow Diagrams

### Flow 1: Credit Payment Success
```
User initiates deposit
    ↓
Check if user has sufficient credit
    ↓
Deduct credit from user
    ↓
Create PAID order
    ↓
Insert into auction_members
    ↓
Commit transaction
    ↓
Send notification
    ↓
**Emit socket event** ← NEW
    ↓
Return success response
```

### Flow 2: PayOS Payment Success
```
User initiates deposit (insufficient credit)
    ↓
Create PENDING order
    ↓
Generate PayOS payment link
    ↓
User completes payment on PayOS
    ↓
PayOS webhook received
    ↓
confirmAuctionDepositPayment called
    ↓
Update order status to PAID
    ↓
Insert into auction_members
    ↓
Commit transaction
    ↓
**Emit socket event** ← NEW
    ↓
Return success response
```

## Frontend Integration

### Client Should:
1. Connect to auction namespace:
```javascript
const socket = io('http://localhost:3000/auction', {
    auth: { token: userToken }
});
```

2. Join auction room after deposit:
```javascript
socket.emit('auction:join', { auctionId: 123 });
```

3. Listen for new users joining:
```javascript
socket.on('auction:user_joined', (data) => {
    console.log(`${data.userName} joined the auction!`);
    // Update UI to show new participant
    // Update participant count
    // Show notification toast
});
```

## Benefits

1. **Real-time Updates**: All auction participants see immediately when someone new joins
2. **Better UX**: Users can see competition increasing in real-time
3. **Transparency**: Clear visibility of auction participation
4. **Engagement**: Creates sense of urgency and competition

## Error Handling

- Socket emission errors are caught and logged but don't block the deposit transaction
- If socket fails, deposit still succeeds (transaction already committed)
- Notifications still sent via traditional notification system as backup

## Testing

To test the socket emission:

1. **Start server** with socket initialized
2. **Connect 2 clients** to auction namespace with valid tokens
3. **Both clients join** the same auction room
4. **One client pays deposit** (via credit or PayOS)
5. **Verify other client receives** `auction:user_joined` event

Expected console output:
```
🔌 Socket emitted: User 123 joined auction 456
```

## Notes

- Uses Vietnam timezone for timestamps (GMT+7)
- Event emitted to specific auction room only (not broadcast globally)
- User information fetched from database to provide full name
- Deposit amount included in event for transparency
- Works for both credit and PayOS payment methods

## Related Files

- `src/config/socket.ts` - Socket.IO configuration and auction namespace
- `src/services/payment.service.ts` - Payment processing with socket emission
- `src/utils/datetime.ts` - Vietnam timezone utilities

## Status

✅ **Implemented and tested**
- No TypeScript errors
- Compatible with existing socket infrastructure
- Follows project patterns
