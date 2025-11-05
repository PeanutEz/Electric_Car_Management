# Cancel Payment API Documentation

## 🎯 Overview
Since PayOS doesn't support webhook for payment cancellation, we created a manual cancellation endpoint that allows updating order status to CANCELLED.

---

## 📡 API Endpoint

### Cancel Payment
**POST** `/api/payment/cancel/:orderCode`

Manually cancel a pending payment and update order status to CANCELLED.

---

## 📋 Request

### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `orderCode` | string | ✅ Yes | The order code to cancel (e.g., "123456") |

### Example Request
```bash
POST /api/payment/cancel/123456
```

### cURL Example
```bash
curl -X POST http://localhost:3000/api/payment/cancel/123456
```

### PowerShell Example
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/payment/cancel/123456" -Method POST
```

### JavaScript (Fetch) Example
```javascript
fetch('http://localhost:3000/api/payment/cancel/123456', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
})
.then(response => response.json())
.then(data => console.log(data))
.catch(error => console.error('Error:', error));
```

---

## 📤 Response

### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Payment cancelled successfully",
  "data": {
    "orderCode": "123456",
    "orderType": "topup",
    "previousStatus": "PENDING",
    "newStatus": "CANCELLED",
    "tracking": "FAILED"
  }
}
```

### Error Responses

#### 400 Bad Request - Order Already Cancelled
```json
{
  "success": false,
  "message": "Order is already cancelled"
}
```

#### 400 Bad Request - Cannot Cancel Paid Order
```json
{
  "success": false,
  "message": "Cannot cancel paid order"
}
```

#### 400 Bad Request - Missing Order Code
```json
{
  "success": false,
  "message": "Order code is required"
}
```

#### 404 Not Found - Order Not Found
```json
{
  "success": false,
  "message": "Order with code 123456 not found"
}
```

#### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Failed to cancel payment"
}
```

---

## 🔒 Business Rules

### ✅ Can Cancel
- Orders with status `PENDING`
- Orders with status other than `PAID` or `CANCELLED`

### ❌ Cannot Cancel
- Orders with status `PAID` (already completed)
- Orders with status `CANCELLED` (already cancelled)

---

## 🗄️ Database Changes

When cancellation is successful, the following updates are made:

```sql
UPDATE orders 
SET 
  status = 'CANCELLED', 
  tracking = 'FAILED', 
  updated_at = NOW() 
WHERE code = ?
```

### Updated Fields
| Field | New Value | Description |
|-------|-----------|-------------|
| `status` | `'CANCELLED'` | Order status changed to cancelled |
| `tracking` | `'FAILED'` | Tracking status marked as failed |
| `updated_at` | `NOW()` | Timestamp of cancellation |

---

## 🧪 Testing

### Test Script
Run the PowerShell test script:
```powershell
.\test-cancel-payment.ps1
```

### Manual Testing Steps

1. **Create a payment order** (topup, package, etc.)
   ```bash
   POST /api/payment/topup
   # Get orderCode from response
   ```

2. **Check order status**
   ```bash
   GET /api/order/{orderId}
   # Should show status: "PENDING"
   ```

3. **Cancel the payment**
   ```bash
   POST /api/payment/cancel/{orderCode}
   ```

4. **Verify cancellation**
   ```bash
   GET /api/order/{orderId}
   # Should show status: "CANCELLED", tracking: "FAILED"
   ```

---

## 📊 Use Cases

### Use Case 1: User Cancels Top-Up Payment
```
1. User creates top-up payment link
2. User decides not to proceed
3. Frontend calls cancel API with orderCode
4. Order status updated to CANCELLED
5. User can create new payment if needed
```

### Use Case 2: Admin Cancels Pending Order
```
1. Admin views pending orders in dashboard
2. Admin clicks "Cancel" on specific order
3. System calls cancel API
4. Order marked as CANCELLED
```

### Use Case 3: Payment Timeout Handling
```
1. Payment link expires (user didn't pay)
2. Cron job or manual process calls cancel API
3. Order cleaned up with CANCELLED status
```

---

## 🔄 Integration with Frontend

### React Example
```typescript
const cancelPayment = async (orderCode: string) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/payment/cancel/${orderCode}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();

    if (data.success) {
      console.log('Payment cancelled:', data.data);
      // Update UI to show cancellation
      toast.success('Payment cancelled successfully');
    } else {
      console.error('Cancellation failed:', data.message);
      toast.error(data.message);
    }
  } catch (error) {
    console.error('Error cancelling payment:', error);
    toast.error('Failed to cancel payment');
  }
};
```

### Vue Example
```typescript
const cancelPayment = async (orderCode: string) => {
  try {
    const { data } = await axios.post(
      `/api/payment/cancel/${orderCode}`
    );

    if (data.success) {
      ElMessage.success('Payment cancelled successfully');
      // Refresh order list
      fetchOrders();
    }
  } catch (error: any) {
    ElMessage.error(
      error.response?.data?.message || 'Failed to cancel payment'
    );
  }
};
```

---

## 🚨 Important Notes

1. **No Authentication Required**: This endpoint doesn't require authentication (can be changed if needed)

2. **Idempotent**: Calling cancel on already cancelled order returns error but doesn't break anything

3. **Cannot Undo**: Once cancelled, the order cannot be restored (user needs to create new payment)

4. **PayOS Limitation**: This is a workaround for PayOS not supporting cancel webhook

5. **Manual Process**: This requires user/admin action - not automatic like webhook

---

## 🔮 Future Improvements

### Possible Enhancements
- Add authentication middleware for security
- Add audit log for cancellations (who cancelled, when)
- Add reason field for cancellation
- Send notification to user when order cancelled
- Add batch cancellation endpoint for multiple orders
- Add automatic cancellation for expired payments (cron job)

### Example with Authentication
```typescript
router.post(
  '/cancel/:orderCode',
  authenticateToken,
  cancelPaymentController
);
```

### Example with Cancellation Reason
```typescript
// Request body
{
  "reason": "User requested cancellation"
}

// Update query
UPDATE orders 
SET 
  status = 'CANCELLED',
  tracking = 'FAILED',
  cancellation_reason = ?,
  cancelled_by = ?,
  updated_at = NOW()
WHERE code = ?
```

---

## 📞 Support

If you encounter issues:
1. Check server logs for errors
2. Verify order code exists in database
3. Check current order status
4. Test with provided PowerShell script
5. Check API response for specific error messages

---

## ✅ Checklist

Before using in production:
- [ ] Test cancellation with PENDING orders
- [ ] Test error handling for PAID orders
- [ ] Test error handling for non-existent orders
- [ ] Test error handling for already CANCELLED orders
- [ ] Add authentication if needed
- [ ] Add rate limiting if exposed publicly
- [ ] Add logging for audit trail
- [ ] Update frontend to call this API
- [ ] Document for frontend team
- [ ] Add monitoring/alerts for failures
