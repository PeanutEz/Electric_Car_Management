import axios from 'axios';
import { Payment } from '../models/payment.model';

const PAYOS_API_URL = 'https://api.payos.vn/v1/payment';
const PAYOS_API_KEY = process.env.PAYOS_API_KEY || ''; // Set your API key in environment variables

export async function createPayosPayment(params: Payment) {
   try {
      const response = await axios.post(
         PAYOS_API_URL,
         {
            id: params.id,
            amount: params.amount,
            orderId: params.orderId,
            description: params.description,
            returnUrl: params.returnUrl,
            cancelUrl: params.cancelUrl,
            customerEmail: params.customerEmail,
            customerPhone: params.customerPhone,
         },
         {
            headers: {
               'Authorization': `Bearer ${PAYOS_API_KEY}`,
               'Content-Type': 'application/json',
            },
         }
      );
      return response.data;
   } catch (error: any) {
      throw new Error(error.response?.data?.message || 'PayOS payment creation failed');
   }
}