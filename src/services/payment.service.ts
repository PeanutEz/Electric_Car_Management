import axios from 'axios';
import { Payment } from '../models/payment.model';
import payos from "../config/payos";
import pool from '../config/db';


export async function createPayosPayment(payload: Payment) {
   try {
      const orderCode = Math.floor(Math.random() * 1000000);

      // const [rows]: any = await pool.query("insert into orders(code, price, service_id, related_id, buyer_id)");

      // if (rows.affectedRows === 0) {
      //    throw new Error('Failed to create order in database');
      // }

      const response = await payos.paymentRequests.create({
         orderCode,
         amount: payload.amount,
         description: payload.description || "Thanh toán đơn hàng",
         returnUrl: "http://localhost:4000/payment-success",
         cancelUrl: "http://localhost:4000/payment-cancel",
      });
      return response;
   } catch (error: any) {
      throw new Error(error.response?.data?.message || 'PayOS payment creation failed');
   }
}


export async function getPaymentStatus(paymentId: string) {
   try {
      const response = await axios.get(`https://api-merchant.payos.vn/v2/payment-requests/${paymentId}`, {
         headers: {
            "x-client-id": "0b879c49-53cb-4ffa-9b0b-2b5ad6da6b81",
            "x-api-key": "4d166c91-6b6c-43b8-bacb-59b6de3d8c46",
         }   
      });

      return response;
   } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to retrieve payment status');
   }
}   