const MPESA_HOSTS = {
  sandbox: "https://sandbox.safaricom.co.ke",
  production: "https://api.safaricom.co.ke",
};

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

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set in Vercel environment variables.`);
  return value;
}

function normalizePhone(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.startsWith("254") && digits.length === 12) return digits;
  if (digits.startsWith("0") && digits.length === 10) return `254${digits.slice(1)}`;
  if (digits.length === 9 && digits.startsWith("7")) return `254${digits}`;
  throw new Error("Use a valid Safaricom phone number, for example 0712345678.");
}

function darajaTimestamp() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  return [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds()),
  ].join("");
}

function callbackUrl(req) {
  if (process.env.MPESA_CALLBACK_URL) return process.env.MPESA_CALLBACK_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}/api/mpesa-callback`;
  if (req.headers.origin) return `${req.headers.origin}/api/mpesa-callback`;
  throw new Error("MPESA_CALLBACK_URL is required for M-Pesa callbacks.");
}

async function getCurrentUser(accessToken, supabaseUrl, anonKey) {
  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) throw new Error("Log in again before starting payment.");
  return response.json();
}

async function getBooking(bookingId, supabaseUrl, serviceRoleKey) {
  const response = await fetch(`${supabaseUrl}/rest/v1/bookings?id=eq.${bookingId}&select=id,client_id,contact_phone,quoted_price,payment_method,payment_status`, {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    },
  });

  if (!response.ok) throw new Error("Could not load booking for payment.");
  const rows = await response.json();
  return rows[0];
}

async function updateBooking(bookingId, supabaseUrl, serviceRoleKey, updates) {
  const response = await fetch(`${supabaseUrl}/rest/v1/bookings?id=eq.${bookingId}`, {
    method: "PATCH",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(updates),
  });

  if (!response.ok) throw new Error("Could not update booking payment status.");
}

async function darajaToken(baseUrl, consumerKey, consumerSecret) {
  const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");
  const response = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: {
      Authorization: `Basic ${auth}`,
    },
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.errorMessage || "Could not get M-Pesa access token.");
  return data.access_token;
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    json(res, 405, { error: "Method not allowed" });
    return;
  }

  try {
    const supabaseUrl = requiredEnv("SUPABASE_URL");
    const supabaseAnonKey = requiredEnv("SUPABASE_ANON_KEY");
    const serviceRoleKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
    const consumerKey = requiredEnv("MPESA_CONSUMER_KEY");
    const consumerSecret = requiredEnv("MPESA_CONSUMER_SECRET");
    const shortcode = requiredEnv("MPESA_SHORTCODE");
    const passkey = requiredEnv("MPESA_PASSKEY");
    const env = process.env.MPESA_ENV || "sandbox";
    const baseUrl = MPESA_HOSTS[env] || MPESA_HOSTS.sandbox;

    const accessToken = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    const body = await readJson(req);
    const bookingId = body.booking_id;

    if (!accessToken) throw new Error("Log in before starting payment.");
    if (!bookingId) throw new Error("Booking ID is required.");

    const [user, booking] = await Promise.all([
      getCurrentUser(accessToken, supabaseUrl, supabaseAnonKey),
      getBooking(bookingId, supabaseUrl, serviceRoleKey),
    ]);

    if (!booking) throw new Error("Booking was not found.");
    if (booking.client_id !== user.id) throw new Error("You can only pay for your own booking.");
    if (booking.payment_method !== "mpesa") throw new Error("This booking is not set to M-Pesa.");
    if (booking.payment_status === "paid") throw new Error("This booking is already paid.");

    const phone = normalizePhone(body.phone || booking.contact_phone);
    const amount = Math.max(1, Math.round(Number(body.amount || booking.quoted_price || 1)));
    const timestamp = darajaTimestamp();
    const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString("base64");
    const token = await darajaToken(baseUrl, consumerKey, consumerSecret);
    const callback = callbackUrl(req);

    const stkResponse = await fetch(`${baseUrl}/mpesa/stkpush/v1/processrequest`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        BusinessShortCode: shortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: process.env.MPESA_TRANSACTION_TYPE || "CustomerPayBillOnline",
        Amount: amount,
        PartyA: phone,
        PartyB: shortcode,
        PhoneNumber: phone,
        CallBackURL: callback,
        AccountReference: process.env.MPESA_ACCOUNT_REFERENCE || "LABOUR",
        TransactionDesc: `LABOUR booking ${bookingId}`,
      }),
    });

    const data = await stkResponse.json();
    if (!stkResponse.ok || data.ResponseCode !== "0") {
      await updateBooking(bookingId, supabaseUrl, serviceRoleKey, {
        payment_status: "failed",
        mpesa_result_description: data.errorMessage || data.ResponseDescription || "M-Pesa request failed",
      });
      throw new Error(data.errorMessage || data.ResponseDescription || "M-Pesa request failed.");
    }

    await updateBooking(bookingId, supabaseUrl, serviceRoleKey, {
      payment_status: "pending",
      merchant_request_id: data.MerchantRequestID,
      checkout_request_id: data.CheckoutRequestID,
      mpesa_result_code: null,
      mpesa_result_description: data.CustomerMessage || data.ResponseDescription,
    });

    json(res, 200, {
      ok: true,
      message: data.CustomerMessage || "Check your phone and enter your M-Pesa PIN.",
      checkout_request_id: data.CheckoutRequestID,
    });
  } catch (error) {
    json(res, 400, { error: error.message || "M-Pesa payment failed." });
  }
};
