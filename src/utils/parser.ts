export async function detectPaymentMethod(description: string): Promise<string> {
  const desc = description.toUpperCase();

  if (desc.includes("MOMO")) return "MOMO";
  if (desc.includes("ZALOPAY") || desc.includes("ZALO PAY")) return "ZALOPAY";
  if (desc.includes("VNPAY")) return "VNPAY";
  if (desc.includes("SHOPEEPAY") || desc.includes("AIRPAY")) return "SHOPEEPAY";
  if (desc.includes("VIETTELPAY")) return "VIETTELPAY";

  // Thẻ ngân hàng / quốc tế
  if (desc.includes("VISA")) return "VISA";
  if (desc.includes("MASTERCARD") || desc.includes("MASTER")) return "MASTERCARD";
  if (desc.includes("JCB")) return "JCB";

  // Chuyển khoản ngân hàng (Bank transfer)
  if (desc.includes("BANK") || desc.includes("CHUYEN TIEN") || desc.includes("FT")) {
    return "BANK_TRANSFER";
  }

  return "PAYOS"; // Mặc định nếu không xác định được
}