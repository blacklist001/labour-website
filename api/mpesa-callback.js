function json(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}

async function readJson(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") return JSON.parse(req.body || "{}");

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

function callbackItem(items, name) {
  return items.find((item) => item.Name === name)?.Value || null;
}

async function updateByCheckoutRequest(checkoutRequestId, updates) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase server environment variables are missing.");
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/bookings?checkout_request_id=eq.${checkoutRequestId}`, {
    method: "PATCH",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    throw new Error("Could not update booking from M-Pesa callback.");
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    json(res, 405, { error: "Method not allowed" });
    return;
  }

  try {
    const body = await readJson(req);
    const callback = body.Body?.stkCallback;
    const metadata = callback?.CallbackMetadata?.Item || [];

    if (!callback?.CheckoutRequestID) {
      throw new Error("Invalid M-Pesa callback payload.");
    }

    const receipt = callbackItem(metadata, "MpesaReceiptNumber");
    const amount = callbackItem(metadata, "Amount");
    const phone = callbackItem(metadata, "PhoneNumber");
    const paidAt = callbackItem(metadata, "TransactionDate");
    const resultCode = Number(callback.ResultCode);

    await updateByCheckoutRequest(callback.CheckoutRequestID, {
      payment_status: resultCode === 0 ? "paid" : "failed",
      payment_reference: receipt,
      mpesa_result_code: resultCode,
      mpesa_result_description: callback.ResultDesc || null,
      mpesa_amount: amount,
      mpesa_phone: phone ? String(phone) : null,
      mpesa_paid_at: paidAt ? String(paidAt) : null,
    });

    json(res, 200, { ResultCode: 0, ResultDesc: "Accepted" });
  } catch (error) {
    console.error("M-Pesa callback error:", error);
    json(res, 200, { ResultCode: 0, ResultDesc: "Accepted" });
  }
};
