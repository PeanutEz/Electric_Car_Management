import axios from 'axios';
import { Payment } from '../models/payment.model';
import payos from "../config/payos";
import pool from '../config/db';
import { detectPaymentMethod } from '../utils/parser';


export async function createPayosPayment(payload: Payment) {
   try {
      const orderCode = Math.floor(Math.random() * 1000000);
 
      const response = await payos.paymentRequests.create({
         orderCode,
         amount: payload.amount,
         description: payload.description || "Thanh toán đơn hàng",
         returnUrl: "http://localhost:4000/payment-success",
         cancelUrl: "http://localhost:4000/payment-cancel",
      });

      const [rows]: any = await pool.query(
         "INSERT INTO orders (code, price, service_id, related_id, buyer_id, payment_method) VALUES (?, ?, ?, ?, ?, ?)",
         [response.orderCode, payload.amount, null, null, null, null]
      );

      if (rows.affectedRows === 0) {
         throw new Error('Failed to create order in database');
      }

      return response;
   } catch (error: any) {
      throw new Error(error.response?.data?.message || 'PayOS payment creation failed');
   }
}

// {
//     "code": "00",
//     "desc": "success",
//     "data": {
//         "id": "92a9126c91d84696a81cdf461ca801bb",
//         "orderCode": 759091,
//         "amount": 3000,
//         "amountPaid": 3000,
//         "amountRemaining": 0,
//         "status": "PAID",
//         "createdAt": "2025-10-01T21:11:00+07:00",
//         "transactions": [
//             {
//                 "accountNumber": "0837773347",
//                 "amount": 3000,
//                 "counterAccountBankId": "970454",
//                 "counterAccountBankName": null,
//                 "counterAccountName": "MOMOIBFT",
//                 "counterAccountNumber": "0697044105922",
//                 "description": "Qaenqc4546  CASSO5938 4 bKRy56nl5rruGtPvxpjxklHP suon bi cha Trace 662863",
//                 "reference": "FT25274059379379",
//                 "transactionDateTime": "2025-10-01T21:11:29+07:00",
//                 "virtualAccountName": null,
//                 "virtualAccountNumber": null
//             }
//         ],
//         "canceledAt": null,
//         "cancellationReason": null
//     },
//     "signature": "72966f1fce8b5c1b34a56c8a8db09440ee1dee928ffc3c26d894d6c8b2beb326"
// }
export async function getPaymentStatus(paymentId: string) {
   try {
      const response = await axios.get(`https://api-merchant.payos.vn/v2/payment-requests/${paymentId}`, {
         headers: {
            "x-client-id": "0b879c49-53cb-4ffa-9b0b-2b5ad6da6b81",
            "x-api-key": "4d166c91-6b6c-43b8-bacb-59b6de3d8c46",
         }   
      });
      if (response.data.code !== "00") {
         throw new Error(response.data.desc || 'Failed to retrieve payment status');
      }
      const paymentData = response.data.data;

      // Cập nhật trạng thái thanh toán trong cơ sở dữ liệu
      const paymentMethod = paymentData.transactions && paymentData.transactions.length > 0
         ? await detectPaymentMethod(paymentData.transactions[0].counterAccountName)
         : "PAYOS";
      const [rows]: any = await pool.query(
         "UPDATE orders SET status = ?, payment_method = ? WHERE code = ?",
         [paymentData.status, paymentMethod, paymentData.orderCode]
      );

      if (rows.affectedRows === 0) {
         throw new Error('Failed to update payment status in database');
      }

      return response;
   } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to retrieve payment status');
   }
}   