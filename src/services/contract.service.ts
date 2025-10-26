import pool from '../config/db';
import axios from 'axios';
import { Contract } from '../models/contract.model';


const DOCUSEAL_API_URL = process.env.DOCUSEAL_API_URL || 'https://api.docuseal.com';
const DOCUSEAL_API_KEY = process.env.DOCUSEAL_API_KEY;


// export async function createContract(contract: Contract): Promise<Contract> {
//   const {
//     contract_code,
//     seller_id,
//     buyer_id,
//     product_id,
//     deposit_amount,
//     vehicle_price,
//     commission_percent,
//     dispute_city,
//     status,
//     url,
//   } = contract;


//   const [result]: any = await pool.query(
//     `INSERT INTO contracts
//       (contract_code, seller_id, buyer_id, product_id, deposit_amount, vehicle_price, commission_percent, dispute_city, status, url, created_at, updated_at)
//      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
//     [
//       contract_code,
//       seller_id,
//       buyer_id,
//       product_id,
//       deposit_amount,
//       vehicle_price,
//       commission_percent,
//       dispute_city,
//       status,
//       url,
//     ]
//   );


//   const [rows]: any = await pool.query('SELECT * FROM contracts WHERE id = ?', [result.insertId]);
//   return rows[0];
// }


export async function createContract(contract: Contract): Promise<Contract> {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();






        // 1️⃣ Tạo hợp đồng trong DB trước
        const [result]: any = await connection.query(
            `INSERT INTO contracts (
  seller_id, buyer_id, product_id, deposit_amount, vehicle_price,
  commission_percent, dispute_city, status, url, created_at, updated_at
)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [
                contract.seller_id,
                contract.buyer_id,
                contract.product_id,
                contract.deposit_amount,
                contract.vehicle_price,
                contract.commission_percent,
                contract.dispute_city,
                contract.status,
                '', // URL DocuSeal sẽ cập nhật sau
            ]
        );


        const contractId = result.insertId;


       


        const docusealResponse = await axios.post(
            `${DOCUSEAL_API_URL}/submissions`,
            {
                template_id: 2013506,
                send_email: true,
                submitters: [
                    {
                        role: "First Party",
                        email: "phamlac10@gmail.com"
                    }
                ]
            },
            {
                headers: {
                    "X-Auth-Token": `${DOCUSEAL_API_KEY}`
                },
            }
        );


        console.log(docusealResponse.data);


        const contractCode = docusealResponse.data[0].submission_id;
        const url = docusealResponse.data[0].embed_src;


        await connection.query(
            `UPDATE contracts SET contract_code = ?, url = ? WHERE id = ?`,
            [contractCode, url, contractId]
        );


        await connection.commit();


        const [rows]: any = await connection.query(
            `SELECT * FROM contracts WHERE id = ?`,
            [contractId]
        );
        return rows[0];
    } catch (error: any) {
        await connection.rollback();
        console.error('Error creating contract with DocuSeal:', error.response?.data || error.message);
        throw new Error('Failed to create contract with DocuSeal');
    } finally {
        connection.release();
    }
}


export async function getAllContracts(): Promise<Contract[]> {
    const [rows]: any = await pool.query('SELECT * FROM contracts ORDER BY created_at DESC');
    return rows;
}


export async function getContractByUserId(user_id: number): Promise<Contract[]> {
    const [rows]: any = await pool.query(
        `SELECT * FROM contracts WHERE buyer_id = ? OR seller_id = ? ORDER BY created_at DESC`,
        [user_id, user_id]
    );
    return rows;
}


export async function handleDocuSealWebhookService(payload: any): Promise<void> {
  try {
    const eventType = payload.event_type;
    const submissionId = payload?.data?.submission?.id;
    const status = payload?.data?.submission?.status;
    const submissionUrl = payload?.data?.submission?.url;
    const auditLogUrl = payload?.data?.audit_log_url;
    const documentUrl = payload?.data?.documents?.[0]?.url;


    if (!submissionId) {
      throw new Error('Missing submission_id');
    }


    let newStatus = 'pending';
    if (eventType === 'form.completed' || status === 'completed') {
      newStatus = 'signed';
    } else if (status === 'declined' || eventType === 'form.declined') {
      newStatus = 'declined';
    } else if (status === 'opened' || eventType === 'form.opened') {
      newStatus = 'in_progress';
    }


    // await pool.query(
    //   `UPDATE contracts
    //    SET status = ?,
    //        url = ?,
    //        audit_log_url = ?,
    //        document_url = ?
    //    WHERE contract_code = ?`,
    //   [newStatus, submissionUrl, auditLogUrl, documentUrl, submissionId]
    // );
   
    await pool.query(
      `UPDATE contracts
       SET status = ?,
           url = ?
       WHERE contract_code = ?`,
      [newStatus, documentUrl, submissionId]
    );


    console.log(`✅ Updated contract ${submissionId} → ${newStatus}`);
  } catch (error: any) {
    console.error('❌ Error processing DocuSeal webhook:', error.message);
    throw error;
  }
}
