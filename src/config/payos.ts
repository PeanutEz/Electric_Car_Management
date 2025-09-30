import { PayOS } from "@payos/node";


const payos = new PayOS({
  apiKey: process.env.PAYOS_API_KEY!,
  checksumKey: process.env.PAYOS_CHECKSUM_KEY!,
  clientId: process.env.PAYOS_CLIENT_ID!,
});

export default payos;