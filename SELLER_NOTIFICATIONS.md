# 🔔 Seller Notification System - Implementation Summary

## ✅ Đã hoàn thành

### **📝 Files Modified:**
1. **notification.model.ts** - Thêm 5 notification types mới
2. **auction.service.ts** - Thêm 3 notifications (PROCESSING, SUCCESS, FAIL)
3. **contract.service.ts** - Thêm 2 notifications (DEALING_SUCCESS, DEALING_FAIL)

---

## 📊 Notification Triggers

| Tracking State | Trigger | Sender Function | Message |
|----------------|---------|-----------------|---------|
| **AUCTION_PROCESSING** | Admin duyệt auction | `approveAuction()` | "Phiên đấu giá đã được mở" |
| **AUCTION_SUCCESS** | Timer hết, có winner | `closeAuction()` | "Đấu giá thành công!" |
| **AUCTION_FAIL** | Timer hết, không có bid | `closeAuction()` | "Đấu giá chưa thành công" |
| **DEALING_SUCCESS** | Ký xong hợp đồng | `handleDocuSealWebhookService()` | "Giao dịch thành công!" |
| **DEALING_FAIL** | Từ chối ký hợp đồng | `handleDocuSealWebhookService()` | "Giao dịch không thành công" |

---

## 🔧 Implementation Details

### **1. AUCTION_PROCESSING (auction.service.ts)**
```typescript
// Location: approveAuction() - Line ~1075
const notification = await notificationService.createNotification({
  user_id: seller_id,
  post_id: product_id,
  type: 'auction_live',
  title: 'Phiên đấu giá đã được mở',
  message: `Phiên đấu giá cho "${title}" của bạn đã được admin duyệt...`
});
sendNotificationToUser(seller_id, notification);
```

### **2. AUCTION_SUCCESS (auction.service.ts)**
```typescript
// Location: closeAuction() - Line ~480
if (hasBidder) {
  const notification = await notificationService.createNotification({
    user_id: seller_id,
    type: 'auction_success',
    message: `Sản phẩm "${productTitle}" đã đấu giá thành công với giá X VNĐ`
  });
  sendNotificationToUser(seller_id, notification);
}
```

### **3. AUCTION_FAIL (auction.service.ts)**
```typescript
// Location: closeAuction() - Line ~520
else {
  await conn.query(`UPDATE orders SET tracking = 'AUCTION_FAIL'...`);
  const notification = await notificationService.createNotification({
    user_id: seller_id,
    type: 'auction_fail',
    message: `Sản phẩm "${productTitle}" chưa có ai đặt giá...`
  });
  sendNotificationToUser(seller_id, notification);
}
```

### **4. DEALING_SUCCESS (contract.service.ts)**
```typescript
// Location: handleDocuSealWebhookService() - Line ~195
if (newStatus === 'signed') {
  await connection.query(`UPDATE orders SET tracking = 'DEALING_SUCCESS'...`);
  await connection.query(`UPDATE products SET status = 'sold'...`);
  
  const notification = await notificationService.createNotification({
    user_id: sellerId,
    type: 'dealing_success',
    message: `Giao dịch cho sản phẩm "${productTitle}" đã hoàn tất`
  });
  sendNotificationToUser(sellerId, notification);
}
```

### **5. DEALING_FAIL (contract.service.ts)**
```typescript
// Location: handleDocuSealWebhookService() - Line ~230
if (newStatus === 'declined') {
  await connection.query(`UPDATE orders SET tracking = 'DEALING_FAIL'...`);
  
  const notification = await notificationService.createNotification({
    user_id: sellerId,
    type: 'dealing_fail',
    message: `Giao dịch đã thất bại. Lý do: Một bên đã từ chối ký hợp đồng`
  });
  sendNotificationToUser(sellerId, notification);
}
```

---

## 🧪 Testing Checklist

### **Test 1: AUCTION_PROCESSING**
1. Admin approve auction
2. Check seller receives notification: "Phiên đấu giá đã được mở"
3. Verify `orders.tracking = 'AUCTION_PROCESSING'`

### **Test 2: AUCTION_SUCCESS**
1. Wait for auction timer to end (or fast-forward)
2. Ensure at least 1 bidder exists
3. Check seller receives notification: "Đấu giá thành công!"
4. Verify `orders.tracking = 'AUCTION_SUCCESS'`

### **Test 3: AUCTION_FAIL**
1. Auction ends with NO bidders
2. Check seller receives notification: "Đấu giá chưa thành công"
3. Verify `orders.tracking = 'AUCTION_FAIL'`
4. Verify `products.status = 'approved'`

### **Test 4: DEALING_SUCCESS**
1. Admin creates contract → tracking = 'DEALING'
2. Both parties sign contract via DocuSeal
3. Webhook triggers `form.completed`
4. Check seller receives notification: "Giao dịch thành công!"
5. Verify `orders.tracking = 'DEALING_SUCCESS'`
6. Verify `products.status = 'sold'`

### **Test 5: DEALING_FAIL**
1. Admin creates contract → tracking = 'DEALING'
2. One party declines contract
3. Webhook triggers `form.declined`
4. Check seller receives notification: "Giao dịch không thành công"
5. Verify `orders.tracking = 'DEALING_FAIL'`

---

## 📝 Console Logs

All notifications include console logs for debugging:

```
📧 Notification sent to seller 12: Auction 5 is now LIVE
📧 AUCTION_SUCCESS notification sent to seller 12
📧 AUCTION_FAIL notification sent to seller 12
📧 DEALING_SUCCESS notification sent to seller 12
📧 DEALING_FAIL notification sent to seller 12
```

Error logs:
```
⚠️ Failed to send auction live notification: <error message>
⚠️ Failed to send auction success notification to seller: <error message>
```

---

## 🔗 Related Files

- **Models:** `src/models/notification.model.ts`
- **Services:** 
  - `src/services/auction.service.ts` (Lines 475-540, 1075-1105)
  - `src/services/contract.service.ts` (Lines 140-280)
  - `src/services/notification.service.ts`
- **Documentation:** `AUCTION_TRACKING_FLOW.md`

---

## 🚀 Next Steps (Optional)

1. **Report Table Integration:**
   - Log detailed reason when DEALING_FAIL occurs
   - Store who declined (buyer or seller)
   
2. **Email Notifications:**
   - Send email along with in-app notification
   - Use template with product details
   
3. **SMS Alerts:**
   - Critical notifications (AUCTION_SUCCESS, DEALING_FAIL)
   
4. **Auto Retry Logic:**
   - If DEALING_FAIL, offer to recreate contract
   - Timeout logic: Auto DEALING_FAIL if no signature after 7 days

---

**Implementation Date:** November 4, 2025  
**Status:** ✅ Complete - Ready for Testing
