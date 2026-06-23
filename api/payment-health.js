function json(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}

function envStatus(name) {
  return Boolean(process.env[name]);
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    json(res, 405, { error: "Method not allowed" });
    return;
  }

  const required = [
    "SUPABASE_URL",
    "SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "MPESA_CONSUMER_KEY",
    "MPESA_CONSUMER_SECRET",
    "MPESA_SHORTCODE",
    "MPESA_PASSKEY",
  ];

  const checks = Object.fromEntries(
    required.map((name) => [name, envStatus(name)])
  );

  const optional = {
    MPESA_ENV: process.env.MPESA_ENV || "sandbox",
    MPESA_CALLBACK_URL: envStatus("MPESA_CALLBACK_URL"),
  };

  const missing = required.filter((name) => !checks[name]);

  json(res, missing.length ? 500 : 200, {
    ok: missing.length === 0,
    checks,
    optional,
    missing,
  });
};
