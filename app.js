const SUPABASE_URL = "https://ubuftuivhfxzbzcgrkfq.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_o7T7agY1oP92MzE59IcVXw_3j9CRAoV";

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
window.labourDb = db;

const statusEl = document.querySelector("#data-status");
const serviceSelect = document.querySelector("#service-select");
const bookingServiceSelect = document.querySelector("#booking-service-select");
const workerServiceSelect = document.querySelector("#worker-service-select");
const categoryGrid = document.querySelector("#category-grid");
const serviceCountEl = document.querySelector("#service-count");
const workerGrid = document.querySelector("#worker-grid");
const refreshWorkersButton = document.querySelector("#refresh-workers-button");
const workerSearch = document.querySelector("#worker-search");
const bookingForm = document.querySelector("#booking-form");
const selectedWorkerEl = document.querySelector("#selected-worker");
const jobsStatusEl = document.querySelector("#jobs-status");
const jobsList = document.querySelector("#jobs-list");
const adminSection = document.querySelector("#admin");
const adminWorkerFilter = document.querySelector("#admin-worker-filter");
const adminStatusEl = document.querySelector("#admin-status");
const adminList = document.querySelector("#admin-list");
const themeToggle = document.querySelector("#theme-toggle");
const chatbotToggle = document.querySelector("#chatbot-toggle");
const chatbotPanel = document.querySelector("#chatbot-panel");
const chatbotClose = document.querySelector("#chatbot-close");
const chatbotForm = document.querySelector("#chatbot-form");
const chatbotMessages = document.querySelector("#chatbot-messages");
const signupForm = document.querySelector("#signup-form");
const loginForm = document.querySelector("#login-form");
const loginOnlyElements = document.querySelectorAll(".login-only");
const profileForm = document.querySelector("#profile-form");
const resetPasswordButton = document.querySelector("#reset-password-button");
const logoutButton = document.querySelector("#logout-button");
const accountStatusEl = document.querySelector("#account-status");
const workerProfileForm = document.querySelector("#worker-profile-form");

let currentUser = null;
let currentProfile = null;
let selectedWorker = null;

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem("labour-theme", theme);
  if (themeToggle) {
    themeToggle.textContent = theme === "dark" ? "Light" : "Dark";
    themeToggle.setAttribute(
      "aria-label",
      theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
    );
  }
}

function initTheme() {
  const savedTheme = localStorage.getItem("labour-theme");
  const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
  setTheme(savedTheme || (prefersDark ? "dark" : "light"));
}

function withTimeout(promise, message, ms = 15000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(message)), ms);
    }),
  ]);
}

function setStatus(message, tone = "neutral") {
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.dataset.tone = tone;
}

function setAccountStatus(message, tone = "neutral") {
  if (!accountStatusEl) return;
  accountStatusEl.textContent = message;
  accountStatusEl.dataset.tone = tone;
}

function clearSelectedWorker() {
  selectedWorker = null;
  if (selectedWorkerEl) {
    selectedWorkerEl.textContent = "Select a worker from the cards above.";
  }
}

function setJobsStatus(message, tone = "neutral") {
  if (!jobsStatusEl) return;
  jobsStatusEl.textContent = message;
  jobsStatusEl.dataset.tone = tone;
}

function setAdminStatus(message, tone = "neutral") {
  if (!adminStatusEl) return;
  adminStatusEl.textContent = message;
  adminStatusEl.dataset.tone = tone;
}

function optionFor(service) {
  const option = document.createElement("option");
  option.value = service.slug;
  option.textContent = service.name;
  return option;
}

function renderServices(services) {
  if (!services.length) return;

  serviceSelect.replaceChildren(...services.map(optionFor));
  bookingServiceSelect.replaceChildren(...services.map(optionFor));
  workerServiceSelect?.replaceChildren(...services.map(optionFor));

  categoryGrid.replaceChildren(
    ...services.map((service) => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.service = service.slug;
      button.textContent = service.name;
      return button;
    })
  );

  if (serviceCountEl) {
    serviceCountEl.textContent = `${services.length} services available, including ${services.map((service) => service.name).join(", ")}.`;
  }
}

function formatMoney(value) {
  if (!value) return "Quote";
  return `KSh ${Number(value).toLocaleString("en-KE")}`;
}

function formatDateTime(value) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en-KE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatPaymentMethod(value) {
  const methods = {
    cash: "Cash",
    mpesa: "M-Pesa",
    card: "Card",
  };
  return methods[value] || "Cash";
}

function formatPaymentStatus(value) {
  const statuses = {
    unpaid: "Unpaid",
    pending: "Pending",
    paid: "Paid",
    failed: "Failed",
    refunded: "Refunded",
  };
  return statuses[value] || "Unpaid";
}

function statusBadge(value, type = "job") {
  const label = type === "payment" ? formatPaymentStatus(value) : String(value || "requested").replaceAll("_", " ");
  return `<span class="status-badge" data-status="${escapeHtml(value || "unknown")}">${escapeHtml(label)}</span>`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function chatbotReply(message) {
  const text = message.toLowerCase();
  if (text.includes("book") || text.includes("hire")) {
    return "To book a worker: create or log in as a client, search for a service, select a verified worker, fill the booking form, then click Request Job.";
  }
  if (text.includes("mechanic") || text.includes("car") || text.includes("vehicle")) {
    return "Mechanic is available as a service. Choose Mechanic in the service dropdown, then search for verified mechanics.";
  }
  if (text.includes("photo") || text.includes("upload") || text.includes("picture")) {
    return "Workers can upload a work photo from Account > Worker details. The photo appears on worker cards after the profile is approved.";
  }
  if (text.includes("dark") || text.includes("light") || text.includes("theme")) {
    return "Use the Dark or Light button in the header to switch theme. The site remembers your choice.";
  }
  if (text.includes("worker") || text.includes("register")) {
    return "To register as a worker: create an account with role Worker, log in, fill Worker details, then wait for admin approval.";
  }
  if (text.includes("admin") || text.includes("approve") || text.includes("verify")) {
    return "Admins can open the Admin section, review pending workers, then approve or reject them. Only approved workers appear in search.";
  }
  if (text.includes("password") || text.includes("login")) {
    return "For login help: enter your email and password in Account. If you forgot the password, enter your email and click Reset Password.";
  }
  if (text.includes("job") || text.includes("status")) {
    return "Open My Jobs to track bookings. Workers can accept, start, and complete jobs. Clients can review completed jobs.";
  }
  if (text.includes("pay") || text.includes("mpesa") || text.includes("m-pesa") || text.includes("card") || text.includes("cash")) {
    return "Clients can choose Cash, M-Pesa, or Card when requesting a job. M-Pesa can send an STK Push after the Daraja keys are added in Vercel.";
  }
  if (text.includes("review") || text.includes("rating")) {
    return "After a worker completes a job, the client can submit a rating in My Jobs. The worker rating updates automatically.";
  }
  if (text.includes("test") || text.includes("launch")) {
    return "Use the testing and launch checklists in the GitHub repo docs folder to verify the app before sharing it publicly.";
  }
  return "I can help with booking, worker signup, mechanic services, photo uploads, login, admin approval, job status, reviews, dark mode, and launch testing. What would you like to do?";
}

function addChatMessage(text, type = "bot") {
  const message = document.createElement("p");
  message.className = type === "user" ? "user-message" : "bot-message";
  message.textContent = text;
  chatbotMessages.append(message);
  chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
}

function serviceName(worker) {
  return worker.worker_services?.[0]?.services?.name || "Worker";
}

function phoneDigits(phone) {
  return String(phone || "").replace(/\D/g, "");
}

function workerContactActions(worker) {
  const digits = phoneDigits(worker.phone);
  const phoneHref = digits ? `tel:+${digits}` : "";
  const whatsAppHref = digits ? `https://wa.me/${digits}` : "";

  return `
    <div class="worker-actions">
      <button class="select-worker-button" type="button" data-worker-id="${worker.id}">Select Worker</button>
      ${digits ? `<a href="${phoneHref}">Call</a>` : ""}
      ${digits ? `<a href="${whatsAppHref}" target="_blank" rel="noreferrer">WhatsApp</a>` : ""}
    </div>
  `;
}

function workerCard(worker, index) {
  const article = document.createElement("article");
  const colorClass = ["plumber", "electrician", "carpenter"][index % 3];
  const photoUrl = worker.worker_photos?.[0]?.image_url;
  article.className = "worker-card";
  article.innerHTML = `
    <div class="worker-photo ${colorClass}" ${photoUrl ? `style="background-image: linear-gradient(rgba(37,52,45,0.08), rgba(37,52,45,0.08)), url('${escapeHtml(photoUrl)}');"` : ""}></div>
    <div class="worker-body">
      <div>
        <h3>${escapeHtml(worker.display_name || "LABOUR worker")}</h3>
        <p>${escapeHtml(serviceName(worker))} - ${Number(worker.experience_years || 0)} years experience</p>
      </div>
      <span class="badge">${worker.verification_status === "verified" ? "Verified" : "Pending"}</span>
      <p class="worker-location">${escapeHtml(worker.location_name || "Location not added")}</p>
      <p class="worker-bio">${escapeHtml(worker.bio || "No bio added yet.")}</p>
      <dl>
        <div><dt>Rating</dt><dd>${Number(worker.rating_average || 0).toFixed(1)}</dd></div>
        <div><dt>Price</dt><dd>${formatMoney(worker.base_price)}</dd></div>
        <div><dt>Available</dt><dd>${escapeHtml(worker.availability || "Ask")}</dd></div>
      </dl>
      ${workerContactActions(worker)}
    </div>
  `;

  article.querySelector(".select-worker-button").addEventListener("click", () => {
    selectedWorker = worker;
    selectedWorkerEl.textContent = `Selected ${worker.display_name || "worker"} for ${serviceName(worker)}.`;
    bookingServiceSelect.value = worker.worker_services?.[0]?.services?.slug || bookingServiceSelect.value;
    document.querySelector("#booking")?.scrollIntoView({ behavior: "smooth" });
  });

  return article;
}

function renderWorkers(workers) {
  if (!workerGrid) return;
  if (!workers.length) {
    workerGrid.innerHTML = `
      <article class="empty-state">
        <h3>No verified workers yet</h3>
        <p>Workers appear here after an admin approves their profile.</p>
        <div class="empty-actions">
          <a href="#account">Register as Worker</a>
          <a href="#admin">Admin Review</a>
        </div>
      </article>
    `;
    return;
  }

  workerGrid.replaceChildren(...workers.map(workerCard));
}

function statusActions(job) {
  const actions = [];

  if (currentProfile?.role === "worker") {
    if (job.status === "requested") {
      actions.push(["accepted", "Accept"]);
      actions.push(["declined", "Decline"]);
    }

    if (job.status === "accepted") {
      actions.push(["in_progress", "Start"]);
    }

    if (job.status === "in_progress") {
      actions.push(["completed", "Complete"]);
    }
  }

  if (currentProfile?.role === "client" && job.client_id === currentUser?.id) {
    if (job.status === "requested" || job.status === "accepted") {
      actions.push(["cancelled", "Cancel"]);
    }
  }

  return actions
    .map(([status, label]) => `<button type="button" data-booking-id="${job.id}" data-status="${status}">${label}</button>`)
    .join("");
}

function paymentActions(job) {
  const canMarkPaid =
    currentProfile?.role === "client" &&
    job.client_id === currentUser?.id &&
    job.payment_method !== "mpesa" &&
    job.payment_status !== "paid" &&
    !["declined", "cancelled"].includes(job.status);

  const canStartMpesa =
    currentProfile?.role === "client" &&
    job.client_id === currentUser?.id &&
    job.payment_method === "mpesa" &&
    job.payment_status !== "paid" &&
    !["declined", "cancelled"].includes(job.status);

  const actions = [];

  if (canMarkPaid) {
    actions.push(`<button type="button" data-payment-booking-id="${job.id}">Mark Paid</button>`);
  }

  if (canStartMpesa) {
    actions.push(`<button type="button" data-mpesa-booking-id="${job.id}" data-phone="${escapeHtml(job.contact_phone || "")}" data-amount="${Number(job.quoted_price || 1)}">Pay with M-Pesa</button>`);
  }

  return actions.join("");
}

function reviewForm(job) {
  const alreadyReviewed = job.reviews?.length > 0;
  const canReview =
    currentProfile?.role === "client" &&
    job.client_id === currentUser?.id &&
    job.status === "completed" &&
    !alreadyReviewed;

  if (alreadyReviewed) {
    return `<p class="review-note">Reviewed: ${Number(job.reviews[0].rating)} / 5</p>`;
  }

  if (!canReview) return "";

  return `
    <form class="review-form" data-booking-id="${job.id}" data-worker-id="${job.worker_id}">
      <label>
        <span>Rating</span>
        <select name="rating">
          <option value="5">5 - Excellent</option>
          <option value="4">4 - Good</option>
          <option value="3">3 - Okay</option>
          <option value="2">2 - Poor</option>
          <option value="1">1 - Bad</option>
        </select>
      </label>
      <label>
        <span>Review</span>
        <input type="text" name="comment" placeholder="How was the work?">
      </label>
      <button type="submit">Submit Review</button>
    </form>
  `;
}

function jobContactDetails(job) {
  const workerName = job.worker_profiles?.display_name || "Assigned worker";
  const workerPhone = job.worker_profiles?.phone;
  const clientName = job.profiles?.full_name || "Client";
  const clientPhone = job.contact_phone || job.profiles?.phone;

  if (currentProfile?.role === "worker") {
    return `
      <div class="job-contact">
        <strong>Client</strong>
        <span>${escapeHtml(clientName)}${clientPhone ? " - " + escapeHtml(clientPhone) : ""}</span>
      </div>
    `;
  }

  return `
    <div class="job-contact">
      <strong>Worker</strong>
      <span>${escapeHtml(workerName)}${workerPhone ? " - " + escapeHtml(workerPhone) : ""}</span>
    </div>
  `;
}

function renderBookings(bookings) {
  if (!jobsList) return;

  if (!currentUser) {
    jobsList.replaceChildren();
    setJobsStatus("Log in to view your jobs.");
    return;
  }

  if (!bookings.length) {
    jobsList.innerHTML = `
      <article class="job-card">
        <h3>No jobs yet</h3>
        <p>Your booking requests will appear here after a client selects a verified worker.</p>
        <div class="empty-actions">
          <a href="#workers">Find Workers</a>
          <a href="#booking">Request Job</a>
        </div>
      </article>
    `;
    setJobsStatus("No bookings found yet.");
    return;
  }

  jobsList.innerHTML = bookings.map((job) => `
    <article class="job-card">
      <div>
        <h3>${escapeHtml(job.job_title)}</h3>
        <p>${escapeHtml(job.job_description || "No description added.")}</p>
      </div>
      <dl>
        <div><dt>Status</dt><dd>${statusBadge(job.status)}</dd></div>
        <div><dt>Worker</dt><dd>${escapeHtml(job.worker_profiles?.display_name || "Assigned worker")}</dd></div>
        <div><dt>Price</dt><dd>${formatMoney(job.quoted_price)}</dd></div>
        <div><dt>Payment</dt><dd>${escapeHtml(formatPaymentMethod(job.payment_method))}</dd></div>
        <div><dt>Pay status</dt><dd>${statusBadge(job.payment_status, "payment")}</dd></div>
        <div><dt>Preferred</dt><dd>${escapeHtml(formatDateTime(job.scheduled_for))}</dd></div>
        <div><dt>Requested</dt><dd>${escapeHtml(formatDateTime(job.created_at))}</dd></div>
      </dl>
      ${jobContactDetails(job)}
      ${job.payment_reference ? `<p class="payment-reference">Payment ref: ${escapeHtml(job.payment_reference)}</p>` : ""}
      ${job.mpesa_result_description ? `<p class="payment-reference">M-Pesa: ${escapeHtml(job.mpesa_result_description)}</p>` : ""}
      <p class="job-meta">${escapeHtml(job.job_location || "No location")} ${job.contact_phone ? "- " + escapeHtml(job.contact_phone) : ""}</p>
      <div class="job-actions">${statusActions(job)}${paymentActions(job)}</div>
      ${reviewForm(job)}
    </article>
  `).join("");

  setJobsStatus(`Loaded ${bookings.length} job${bookings.length === 1 ? "" : "s"}.`, "success");
}

function renderAdminWorkers(workers) {
  if (!adminList) return;

  if (!workers.length) {
    adminList.innerHTML = `
      <article class="admin-card">
        <h3>No workers found</h3>
        <p>Try another verification status.</p>
      </article>
    `;
    setAdminStatus("No workers found for this filter.", "success");
    return;
  }

  adminList.innerHTML = workers.map((worker) => `
    <article class="admin-card">
      <div>
        <h3>${escapeHtml(worker.display_name || "Unnamed worker")}</h3>
        <p>${escapeHtml(worker.bio || "No bio added.")}</p>
      </div>
      <dl>
        <div><dt>Location</dt><dd>${escapeHtml(worker.location_name || "None")}</dd></div>
        <div><dt>Price</dt><dd>${formatMoney(worker.base_price)}</dd></div>
        <div><dt>Status</dt><dd>${escapeHtml(worker.verification_status)}</dd></div>
      </dl>
      <div class="admin-actions">
        ${worker.verification_status !== "verified" ? `<button type="button" data-worker-id="${worker.id}" data-verification="verified">Approve</button>` : ""}
        ${worker.verification_status !== "rejected" ? `<button type="button" data-worker-id="${worker.id}" data-verification="rejected">Reject</button>` : ""}
        ${worker.verification_status !== "pending" ? `<button type="button" data-worker-id="${worker.id}" data-verification="pending">Set Pending</button>` : ""}
      </div>
    </article>
  `).join("");

  setAdminStatus(`Loaded ${workers.length} worker${workers.length === 1 ? "" : "s"}.`, "success");
}

async function loadServices() {
  setStatus("Connecting to LABOUR database...");

  const { data, error } = await db
    .from("services")
    .select("name, slug")
    .order("name", { ascending: true });

  if (error) {
    setStatus("Database not ready yet. Run database/schema.sql in Supabase.", "error");
    console.error("Supabase services error:", error);
    return;
  }

  renderServices(data || []);
  setStatus(`Connected to Supabase. Loaded ${(data || []).length} services.`, "success");
}

async function loadWorkers(serviceSlug = null) {
  let query = db
    .from("worker_profiles")
    .select(`
      id,
      display_name,
      phone,
      bio,
      location_name,
      experience_years,
      base_price,
      availability,
      verification_status,
      rating_average,
      rating_count,
      worker_services (
        services (
          id,
          name,
          slug
        )
      ),
      worker_photos (
        image_url,
        caption
      )
    `)
    .eq("verification_status", "verified")
    .limit(9);

  const { data, error } = await query;

  if (error) {
    console.error("Worker load error:", error);
    setStatus("Services are connected, but worker cards could not load yet.", "error");
    return [];
  }

  const workers = serviceSlug
    ? (data || []).filter((worker) =>
        worker.worker_services?.some((link) => link.services?.slug === serviceSlug)
      )
    : data || [];

  renderWorkers(workers);
  return workers;
}

async function loadBookings() {
  if (!currentUser) {
    renderBookings([]);
    return;
  }

  setJobsStatus("Loading jobs...");

  const { data, error } = await db
    .from("bookings")
    .select(`
      id,
      client_id,
      worker_id,
      job_title,
      job_description,
      job_location,
      contact_phone,
      scheduled_for,
      status,
      payment_method,
      payment_status,
      payment_reference,
      checkout_request_id,
      merchant_request_id,
      mpesa_result_code,
      mpesa_result_description,
      mpesa_amount,
      mpesa_phone,
      mpesa_paid_at,
      quoted_price,
      created_at,
      worker_profiles (
        display_name,
        phone
      ),
      profiles (
        full_name,
        phone
      ),
      reviews (
        rating,
        comment
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Booking load error:", error);
    setJobsStatus(error.message, "error");
    return;
  }

  renderBookings(data || []);
}

async function loadAdminWorkers() {
  if (currentProfile?.role !== "admin") {
    adminList?.replaceChildren();
    setAdminStatus("Log in as an admin to review workers.");
    return;
  }

  const status = adminWorkerFilter?.value || "pending";
  setAdminStatus("Loading workers...");

  let query = db
    .from("worker_profiles")
    .select("id, display_name, bio, location_name, base_price, verification_status, created_at")
    .order("created_at", { ascending: false });

  if (status !== "all") {
    query = query.eq("verification_status", status);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Admin workers load error:", error);
    setAdminStatus(error.message, "error");
    return;
  }

  renderAdminWorkers(data || []);
}

async function updateWorkerVerification(workerId, verificationStatus) {
  setAdminStatus("Updating worker...");

  const { error } = await db
    .from("worker_profiles")
    .update({ verification_status: verificationStatus })
    .eq("id", workerId);

  if (error) {
    console.error("Worker verification error:", error);
    setAdminStatus(error.message, "error");
    return;
  }

  setAdminStatus(`Worker ${verificationStatus}.`, "success");
  await loadAdminWorkers();
  await loadWorkers();
}

async function uploadWorkerPhoto(workerId, file) {
  if (!file) return;

  const safeName = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-");
  const path = `${currentUser.id}/${workerId}-${Date.now()}-${safeName}`;

  const { error: uploadError } = await db.storage
    .from("worker-photos")
    .upload(path, file, { upsert: true });

  if (uploadError) throw uploadError;

  const { data } = db.storage.from("worker-photos").getPublicUrl(path);
  const imageUrl = data.publicUrl;

  const { error: photoError } = await db.from("worker_photos").insert({
    worker_id: workerId,
    image_url: imageUrl,
    caption: "Previous work",
  });

  if (photoError) throw photoError;
}

async function updateBookingStatus(bookingId, status) {
  setJobsStatus("Updating job...");
  const { error } = await db
    .from("bookings")
    .update({ status })
    .eq("id", bookingId);

  if (error) {
    console.error("Booking update error:", error);
    setJobsStatus(error.message, "error");
    return;
  }

  await loadBookings();
}

async function markBookingPaid(bookingId) {
  setJobsStatus("Updating payment...");

  const { error } = await db
    .from("bookings")
    .update({
      payment_status: "paid",
      payment_reference: `Manual-${Date.now()}`,
    })
    .eq("id", bookingId);

  if (error) {
    console.error("Payment update error:", error);
    setJobsStatus(error.message, "error");
    return;
  }

  setJobsStatus("Payment marked as paid.", "success");
  await loadBookings();
}

async function getBookingPaymentStatus(bookingId) {
  const { data, error } = await db
    .from("bookings")
    .select("payment_status, payment_reference, mpesa_result_description")
    .eq("id", bookingId)
    .single();

  if (error) throw error;
  return data;
}

async function watchMpesaPayment(bookingId, maxChecks = 12) {
  for (let check = 0; check < maxChecks; check += 1) {
    await new Promise((resolve) => {
      setTimeout(resolve, 5000);
    });

    try {
      const payment = await getBookingPaymentStatus(bookingId);

      if (payment.payment_status === "paid") {
        setJobsStatus(
          payment.payment_reference
            ? `M-Pesa payment confirmed. Reference: ${payment.payment_reference}.`
            : "M-Pesa payment confirmed.",
          "success"
        );
        await loadBookings();
        return;
      }

      if (payment.payment_status === "failed") {
        setJobsStatus(payment.mpesa_result_description || "M-Pesa payment failed.", "error");
        await loadBookings();
        return;
      }
    } catch (error) {
      console.error("M-Pesa payment watch error:", error);
    }
  }

  setJobsStatus("M-Pesa payment is still pending. Refresh My Jobs in a moment.", "neutral");
  await loadBookings();
}

async function startMpesaPayment(bookingId, phone, amount) {
  setJobsStatus("Sending M-Pesa prompt...");

  const { data: sessionData } = await db.auth.getSession();
  const accessToken = sessionData.session?.access_token;

  if (!accessToken) {
    setJobsStatus("Log in again before starting M-Pesa payment.", "error");
    return;
  }

  try {
    const response = await fetch("/api/mpesa-stk", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        booking_id: bookingId,
        phone,
        amount,
      }),
    });

    const result = await response.json();
    if (!response.ok || !result.ok) {
      throw new Error(result.error || "M-Pesa payment could not start.");
    }

    setJobsStatus(result.message || "Check your phone and enter your M-Pesa PIN.", "success");
    await loadBookings();
    watchMpesaPayment(bookingId);
  } catch (error) {
    console.error("M-Pesa payment error:", error);
    setJobsStatus(error.message || "M-Pesa payment failed.", "error");
  }
}

async function submitReview(form) {
  const formData = new FormData(form);
  const payload = {
    booking_id: form.dataset.bookingId,
    worker_id: form.dataset.workerId,
    client_id: currentUser.id,
    rating: Number(formData.get("rating")),
    comment: String(formData.get("comment") || "").trim() || null,
  };

  setJobsStatus("Submitting review...");

  const { error } = await db.from("reviews").insert(payload);

  if (error) {
    console.error("Review submit error:", error);
    setJobsStatus(error.message, "error");
    return;
  }

  setJobsStatus("Review submitted. Worker rating updated.", "success");
  await loadBookings();
  await loadWorkers();
}

async function ensureProfile(user, fallback = {}) {
  const metadata = user.user_metadata || {};
  const profile = {
    id: user.id,
    full_name: fallback.full_name || metadata.full_name || user.email,
    phone: fallback.phone || metadata.phone || null,
    role: fallback.role || metadata.role || "client",
    preferred_language: "en",
  };

  const { data, error } = await db
    .from("profiles")
    .upsert(profile, { onConflict: "id" })
    .select()
    .single();

  if (error) throw error;
  currentProfile = data;
  return data;
}

async function loadCurrentProfile(user) {
  const { data, error } = await db
    .from("profiles")
    .select("id, full_name, phone, role, preferred_language")
    .eq("id", user.id)
    .maybeSingle();

  if (error) throw error;
  if (data) {
    currentProfile = data;
    return data;
  }

  return ensureProfile(user);
}

function updateAuthUI() {
  const isLoggedIn = Boolean(currentUser);
  signupForm.hidden = isLoggedIn;
  logoutButton.hidden = !isLoggedIn;
  profileForm.hidden = !isLoggedIn;
  workerProfileForm.hidden = !(isLoggedIn && currentProfile?.role === "worker");
  adminSection.hidden = !(isLoggedIn && currentProfile?.role === "admin");
  loginOnlyElements.forEach((element) => {
    element.hidden = isLoggedIn;
  });

  if (!isLoggedIn) {
    setAccountStatus("Not logged in.");
    renderBookings([]);
    loadAdminWorkers();
    return;
  }

  const role = currentProfile?.role || "client";
  setAccountStatus(`Logged in as ${currentProfile?.full_name || currentUser.email} (${role}).`, "success");
  hydrateProfileForm();
  loadBookings();
  loadAdminWorkers();
}

function hydrateProfileForm() {
  if (!profileForm || !currentProfile) return;
  profileForm.elements.full_name.value = currentProfile.full_name || "";
  profileForm.elements.phone.value = currentProfile.phone || "";
  profileForm.elements.preferred_language.value = currentProfile.preferred_language || "en";
}

async function finishLogin(user) {
  currentUser = user;
  currentProfile = null;
  setAccountStatus("Login successful. Loading profile...");

  await loadCurrentProfile(user);
  updateAuthUI();
}

async function refreshSession() {
  const { data } = await db.auth.getSession();
  currentUser = data.session?.user || null;

  if (currentUser) {
    try {
      await loadCurrentProfile(currentUser);
    } catch (error) {
      console.error("Profile load error:", error);
      setAccountStatus("Logged in, but profile could not be loaded.", "error");
    }
  }

  updateAuthUI();
}

categoryGrid?.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-service]");
  if (!button) return;

  serviceSelect.value = button.dataset.service;
  clearSelectedWorker();
  loadWorkers(button.dataset.service);
  document.querySelector("#top")?.scrollIntoView({ behavior: "smooth" });
  setStatus(`Selected ${button.textContent}. Enter your location and search.`, "success");
});

workerSearch?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(workerSearch);
  const service = formData.get("service");
  const location = formData.get("location") || "your area";

  clearSelectedWorker();
  setStatus(`Searching ${service} workers near ${location}...`, "neutral");

  const data = await loadWorkers(service);
  const count = data.length;
  setStatus(count ? `Found ${count} verified workers.` : "Connected. No verified workers have been added yet.", "success");
});

refreshWorkersButton?.addEventListener("click", async () => {
  const service = serviceSelect.value || null;
  clearSelectedWorker();
  setStatus("Refreshing workers...", "neutral");
  const data = await loadWorkers(service);
  setStatus(data.length ? `Refreshed ${data.length} verified workers.` : "No verified workers found for this service.", "success");
});

bookingForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!currentUser) {
    setStatus("Please create an account or log in before requesting a job.", "error");
    document.querySelector("#account")?.scrollIntoView({ behavior: "smooth" });
    return;
  }

  if (!selectedWorker) {
    setStatus("Select a worker before requesting a job.", "error");
    document.querySelector("#workers")?.scrollIntoView({ behavior: "smooth" });
    return;
  }

  const formData = new FormData(bookingForm);
  const serviceSlug = String(formData.get("service") || "");
  const paymentMethod = String(formData.get("payment_method") || "cash");
  const contactPhone = String(formData.get("contact_phone") || "").trim();
  const jobLocation = String(formData.get("job_location") || "").trim();
  const jobDescription = String(formData.get("job_description") || "").trim();

  if (!contactPhone || !jobLocation || !jobDescription) {
    setStatus("Add contact phone, job location, and job details before requesting a job.", "error");
    return;
  }

  const { data: service } = await db
    .from("services")
    .select("id, name")
    .eq("slug", serviceSlug)
    .single();

  const payload = {
    client_id: currentUser.id,
    worker_id: selectedWorker.id,
    service_id: service?.id || null,
    job_title: service?.name ? `${service.name} job request` : "Job request",
    job_description: jobDescription,
    job_location: jobLocation,
    contact_phone: contactPhone,
    scheduled_for: formData.get("scheduled_for") || null,
    payment_method: paymentMethod,
    payment_status: paymentMethod === "cash" ? "unpaid" : "pending",
    quoted_price: selectedWorker.base_price || null,
  };

  setStatus("Creating booking request...");

  const { data: booking, error } = await db
    .from("bookings")
    .insert(payload)
    .select("id, contact_phone, quoted_price, payment_method")
    .single();

  if (error) {
    console.error("Booking create error:", error);
    setStatus(error.message, "error");
    return;
  }

  bookingForm.reset();
  setStatus(`Booking requested with ${selectedWorker.display_name || "worker"}.`, "success");
  clearSelectedWorker();
  await loadBookings();

  if (booking?.payment_method === "mpesa") {
    await startMpesaPayment(booking.id, booking.contact_phone, booking.quoted_price);
  }
});

signupForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(signupForm);
  const fullName = String(formData.get("full_name") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const role = String(formData.get("role") || "client");
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  setAccountStatus("Creating account...");

  const { data, error } = await db.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        phone,
        role,
      },
    },
  });

  if (error) {
    setAccountStatus(error.message, "error");
    return;
  }

  if (!data.session) {
    setAccountStatus("Account created. Check your email to confirm, then log in.", "success");
    signupForm.reset();
    return;
  }

  currentUser = data.user;
  try {
    await ensureProfile(data.user, { full_name: fullName, phone, role });
    signupForm.reset();
    updateAuthUI();
  } catch (profileError) {
    console.error("Profile create error:", profileError);
    setAccountStatus("Account created, but profile save failed. Try logging in again.", "error");
  }
});

loginForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(loginForm);
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const submitButton = loginForm.querySelector('button[type="submit"]');

  setAccountStatus("Logging in...");
  submitButton.disabled = true;

  try {
    const { data, error } = await withTimeout(
      db.auth.signInWithPassword({ email, password }),
      "Login is taking too long. Check your internet connection and try again."
    );

    if (error) {
      setAccountStatus(error.message, "error");
      return;
    }

    await finishLogin(data.user);
    loginForm.reset();
  } catch (loginError) {
    console.error("Login error:", loginError);
    setAccountStatus(loginError.message || "Login failed. Try again.", "error");
  } finally {
    submitButton.disabled = false;
  }
});

logoutButton?.addEventListener("click", async () => {
  await db.auth.signOut();
  currentUser = null;
  currentProfile = null;
  updateAuthUI();
});

resetPasswordButton?.addEventListener("click", async () => {
  const formData = new FormData(loginForm);
  const email = String(formData.get("email") || "").trim();

  if (!email) {
    setAccountStatus("Enter your email first, then click Reset Password.", "error");
    return;
  }

  setAccountStatus("Sending password reset email...");
  resetPasswordButton.disabled = true;

  try {
    const { error } = await withTimeout(
      db.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      }),
      "Password reset is taking too long. Try again."
    );

    if (error) {
      setAccountStatus(error.message, "error");
      return;
    }

    setAccountStatus("Password reset email sent. Check your inbox.", "success");
  } catch (error) {
    console.error("Password reset error:", error);
    setAccountStatus(error.message || "Password reset failed.", "error");
  } finally {
    resetPasswordButton.disabled = false;
  }
});

profileForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!currentUser) {
    setAccountStatus("Log in before editing your profile.", "error");
    return;
  }

  const formData = new FormData(profileForm);
  const updates = {
    full_name: String(formData.get("full_name") || "").trim(),
    phone: String(formData.get("phone") || "").trim() || null,
    preferred_language: String(formData.get("preferred_language") || "en"),
  };

  setAccountStatus("Saving profile...");

  const { data, error } = await db
    .from("profiles")
    .update(updates)
    .eq("id", currentUser.id)
    .select("id, full_name, phone, role, preferred_language")
    .single();

  if (error) {
    console.error("Profile update error:", error);
    setAccountStatus(error.message, "error");
    return;
  }

  currentProfile = data;
  setAccountStatus("Profile updated.", "success");
  updateAuthUI();
});

jobsList?.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-booking-id][data-status]");
  if (button) {
    updateBookingStatus(button.dataset.bookingId, button.dataset.status);
    return;
  }

  const paymentButton = event.target.closest("button[data-payment-booking-id]");
  if (paymentButton) {
    markBookingPaid(paymentButton.dataset.paymentBookingId);
    return;
  }

  const mpesaButton = event.target.closest("button[data-mpesa-booking-id]");
  if (mpesaButton) {
    startMpesaPayment(
      mpesaButton.dataset.mpesaBookingId,
      mpesaButton.dataset.phone,
      mpesaButton.dataset.amount
    );
  }
});

jobsList?.addEventListener("submit", (event) => {
  const form = event.target.closest(".review-form");
  if (!form) return;
  event.preventDefault();
  submitReview(form);
});

adminList?.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-worker-id][data-verification]");
  if (!button) return;
  updateWorkerVerification(button.dataset.workerId, button.dataset.verification);
});

adminWorkerFilter?.addEventListener("change", () => {
  loadAdminWorkers();
});

themeToggle?.addEventListener("click", () => {
  const currentTheme = document.documentElement.dataset.theme || "light";
  setTheme(currentTheme === "dark" ? "light" : "dark");
});

chatbotToggle?.addEventListener("click", () => {
  const isHidden = chatbotPanel.hidden;
  chatbotPanel.hidden = !isHidden;
  chatbotToggle.setAttribute("aria-expanded", String(isHidden));
  chatbotToggle.hidden = isHidden;
});

chatbotClose?.addEventListener("click", () => {
  chatbotPanel.hidden = true;
  chatbotToggle.hidden = false;
  chatbotToggle.setAttribute("aria-expanded", "false");
});

chatbotForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(chatbotForm);
  const message = String(formData.get("message") || "").trim();
  if (!message) return;

  addChatMessage(message, "user");
  chatbotForm.reset();
  addChatMessage(chatbotReply(message), "bot");
});

workerProfileForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!currentUser || currentProfile?.role !== "worker") {
    setAccountStatus("Log in as a worker before saving worker details.", "error");
    return;
  }

  const formData = new FormData(workerProfileForm);
  const serviceSlug = String(formData.get("service") || "");
  const bio = String(formData.get("bio") || "").trim();
  const locationName = String(formData.get("location_name") || "").trim();
  const workingHours = String(formData.get("working_hours") || "").trim();
  const experienceYears = Number(formData.get("experience_years") || 0);
  const basePrice = Number(formData.get("base_price") || 0);

  if (!bio || !locationName || !workingHours || basePrice <= 0) {
    setAccountStatus("Add bio, location, working hours, and a price above 0 before saving.", "error");
    return;
  }

  const payload = {
    user_id: currentUser.id,
    display_name: currentProfile.full_name,
    phone: currentProfile.phone,
    bio,
    location_name: locationName,
    experience_years: experienceYears,
    base_price: basePrice,
    working_hours: workingHours,
    availability: "available",
    verification_status: "pending",
  };

  setAccountStatus("Saving worker profile...");

  const { error } = await db
    .from("worker_profiles")
    .upsert(payload, { onConflict: "user_id" })
    .select("id")
    .single();

  if (error) {
    console.error("Worker profile save error:", error);
    setAccountStatus(error.message, "error");
    return;
  }

  const { data: workerProfile } = await db
    .from("worker_profiles")
    .select("id")
    .eq("user_id", currentUser.id)
    .single();

  const { data: service } = await db
    .from("services")
    .select("id")
    .eq("slug", serviceSlug)
    .single();

  if (workerProfile?.id && service?.id) {
    await db
      .from("worker_services")
      .delete()
      .eq("worker_id", workerProfile.id);

    const { error: serviceError } = await db
      .from("worker_services")
      .insert({
        worker_id: workerProfile.id,
        service_id: service.id,
      });

    if (serviceError) {
      console.error("Worker service save error:", serviceError);
      setAccountStatus("Worker profile saved, but service link failed. Run the latest schema.sql.", "error");
      return;
    }
  }

  const photo = formData.get("work_photo");
  if (photo && photo.size > 0) {
    try {
      await uploadWorkerPhoto(workerProfile.id, photo);
    } catch (photoError) {
      console.error("Worker photo upload error:", photoError);
      setAccountStatus("Profile saved, but photo upload failed. Run latest schema.sql and try again.", "error");
      return;
    }
  }

  workerProfileForm.reset();
  setAccountStatus("Worker profile saved. Verification status is pending.", "success");
});

db.auth.onAuthStateChange((_event, session) => {
  currentUser = session?.user || null;
  if (!currentUser) {
    currentProfile = null;
    updateAuthUI();
    return;
  }

  setTimeout(async () => {
    try {
      await loadCurrentProfile(currentUser);
      updateAuthUI();
    } catch (error) {
      console.error("Auth profile sync error:", error);
      setAccountStatus("Logged in, but profile could not be loaded.", "error");
    }
  }, 0);
});

initTheme();
loadServices();
loadWorkers();
refreshSession();
