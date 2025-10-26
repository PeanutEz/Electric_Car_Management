import express from 'express';
import {
  addContract,
  getContracts,
  getContractsByUser,
  handleDocuSealWebhook
} from '../controllers/contract.controller';


const router = express.Router();




/**
 * @swagger
 * tags:
 *   name: Contracts
 *   description: API for managing vehicle sale contracts
 */


/**
 * @swagger
 * /api/contract:
 *   post:
 *     summary: Create a new contract and generate DocuSeal digital contract
 *     tags: [Contracts]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - seller_id
 *               - buyer_id
 *               - product_id
 *               - deposit_amount
 *               - vehicle_price
 *               - commission_percent
 *               - dispute_city
 *               - status
 *             properties:
 *               seller_id: { type: integer, example: 12 }
 *               buyer_id: { type: integer, example: 25 }
 *               product_id: { type: integer, example: 8 }
 *               deposit_amount: { type: number, example: 3000000 }
 *               vehicle_price: { type: number, example: 25000000 }
 *               commission_percent: { type: number, example: 5 }
 *               dispute_city: { type: string, example: "Ho Chi Minh" }
 *               status: { type: string, example: "pending" }
 *     responses:
 *       201:
 *         description: Contract created successfully with DocuSeal link
 */
router.post('/', addContract);


/**
 * @swagger
 * /api/contract:
 *   get:
 *     summary: Get all contracts
 *     tags: [Contracts]
 *     responses:
 *       200:
 *         description: List of contracts
 */
router.get('/', getContracts);


/**
 * @swagger
 * /api/contract/user/{user_id}:
 *   get:
 *     summary: Get contracts by user ID (either seller or buyer)
 *     tags: [Contracts]
 *     parameters:
 *       - name: user_id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the user
 *     responses:
 *       200:
 *         description: List of user contracts
 *       404:
 *         description: No contracts found
 */
router.get('/user/:user_id', getContractsByUser);


/**
 * @swagger
 * /api/contract/webhook:
 *   post:
 *     summary: DocuSeal webhook callback
 *     tags: [Contracts]
 *     description: Called by DocuSeal when a signer opens, completes, or declines a contract
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             example:
 *               event_type: "form.completed"
 *               data:
 *                 submission:
 *                   id: 3885707
 *                   status: "completed"
 *                   url: "https://docuseal.com/e/TMGn3u9E8sWHxz"
 *                 audit_log_url: "https://docuseal.com/file/audit.pdf"
 *                 documents:
 *                   - url: "https://docuseal.com/file/contract.pdf"
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 */
router.post('/webhook', express.json(), handleDocuSealWebhook);


export default router;
