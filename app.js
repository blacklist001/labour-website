const SUPABASE_URL = "https://ubuftuivhfxzbzcgrkfq.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_o7T7agY1oP92MzE59IcVXw_3j9CRAoV";

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
window.labourDb = db;

const statusEl = document.querySelector("#data-status");
const serviceSelect = document.querySelector("#service-select");
const bookingServiceSelect = document.querySelector("#booking-service-select");
const workerServiceSelect = document.querySelector("#worker-service-select");
const categoryGrid = document.querySelector("#category-grid");
const workerGrid = document.querySelector("#worker-grid");
const workerSearch = document.querySelector("#worker-search");
const bookingForm = document.querySelector("#booking-form");
const selectedWorkerEl = document.querySelector("#selected-worker");
const signupForm = document.querySelector("#signup-form");
const loginForm = document.querySelector("#login-form");
const logoutButton = document.querySelector("#logout-button");
const accountStatusEl = document.querySelector("#account-status");
const workerProfileForm = document.querySelector("#worker-profile-form");

let currentUser = null;
let currentProfile = null;
let selectedWorker = null;

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
}

function formatMoney(value) {
  if (!value) return "Quote";
  return `KSh ${Number(value).toLocaleString("en-KE")}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function serviceName(worker) {
  return worker.worker_services?.[0]?.services?.name || "Worker";
}

function workerCard(worker, index) {
  const article = document.createElement("article");
  const colorClass = ["plumber", "electrician", "carpenter"][index % 3];
  article.className = "worker-card";
  article.innerHTML = `
    <div class="worker-photo ${colorClass}"></div>
    <div class="worker-body">
      <div>
        <h3>${escapeHtml(worker.display_name || "LABOUR worker")}</h3>
        <p>${escapeHtml(serviceName(worker))} - ${Number(worker.experience_years || 0)} years experience</p>
      </div>
      <span class="badge">${worker.verification_status === "verified" ? "Verified" : "Pending"}</span>
      <dl>
        <div><dt>Rating</dt><dd>${Number(worker.rating_average || 0).toFixed(1)}</dd></div>
        <div><dt>Price</dt><dd>${formatMoney(worker.base_price)}</dd></div>
        <div><dt>Available</dt><dd>${escapeHtml(worker.availability || "Ask")}</dd></div>
      </dl>
      <button type="button" data-worker-id="${worker.id}">Select Worker</button>
    </div>
  `;

  article.querySelector("button").addEventListener("click", () => {
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
        <p>Worker profiles are saved as pending first. Verify them in Supabase to show them here.</p>
      </article>
    `;
    return;
  }

  workerGrid.replaceChildren(...workers.map(workerCard));
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
  logoutButton.hidden = !isLoggedIn;
  workerProfileForm.hidden = !(isLoggedIn && currentProfile?.role === "worker");

  if (!isLoggedIn) {
    setAccountStatus("Not logged in.");
    return;
  }

  const role = currentProfile?.role || "client";
  setAccountStatus(`Logged in as ${currentProfile?.full_name || currentUser.email} (${role}).`, "success");
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
  loadWorkers(button.dataset.service);
  document.querySelector("#top")?.scrollIntoView({ behavior: "smooth" });
  setStatus(`Selected ${button.textContent}. Enter your location and search.`, "success");
});

workerSearch?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(workerSearch);
  const service = formData.get("service");
  const location = formData.get("location") || "your area";

  setStatus(`Searching ${service} workers near ${location}...`, "neutral");

  const data = await loadWorkers(service);
  const count = data.length;
  setStatus(count ? `Found ${count} verified workers.` : "Connected. No verified workers have been added yet.", "success");
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
    job_description: String(formData.get("job_description") || "").trim() || null,
    job_location: String(formData.get("job_location") || "").trim() || null,
    contact_phone: String(formData.get("contact_phone") || "").trim() || null,
    scheduled_for: formData.get("scheduled_for") || null,
    payment_method: "cash",
    quoted_price: selectedWorker.base_price || null,
  };

  setStatus("Creating booking request...");

  const { error } = await db.from("bookings").insert(payload);

  if (error) {
    console.error("Booking create error:", error);
    setStatus(error.message, "error");
    return;
  }

  bookingForm.reset();
  setStatus(`Booking requested with ${selectedWorker.display_name || "worker"}.`, "success");
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

  setAccountStatus("Logging in...");

  const { data, error } = await db.auth.signInWithPassword({ email, password });

  if (error) {
    setAccountStatus(error.message, "error");
    return;
  }

  currentUser = data.user;
  try {
    await loadCurrentProfile(data.user);
    loginForm.reset();
    updateAuthUI();
  } catch (profileError) {
    console.error("Profile load error:", profileError);
    setAccountStatus("Logged in, but profile could not be loaded.", "error");
  }
});

logoutButton?.addEventListener("click", async () => {
  await db.auth.signOut();
  currentUser = null;
  currentProfile = null;
  updateAuthUI();
});

workerProfileForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!currentUser || currentProfile?.role !== "worker") {
    setAccountStatus("Log in as a worker before saving worker details.", "error");
    return;
  }

  const formData = new FormData(workerProfileForm);
  const serviceSlug = String(formData.get("service") || "");
  const payload = {
    user_id: currentUser.id,
    display_name: currentProfile.full_name,
    phone: currentProfile.phone,
    bio: String(formData.get("bio") || "").trim() || null,
    location_name: String(formData.get("location_name") || "").trim() || null,
    experience_years: Number(formData.get("experience_years") || 0),
    base_price: Number(formData.get("base_price") || 0),
    working_hours: String(formData.get("working_hours") || "").trim() || null,
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

  setAccountStatus("Worker profile saved. Verification status is pending.", "success");
});

db.auth.onAuthStateChange(async (_event, session) => {
  currentUser = session?.user || null;
  if (currentUser) {
    try {
      await loadCurrentProfile(currentUser);
    } catch (error) {
      console.error("Auth profile sync error:", error);
    }
  } else {
    currentProfile = null;
  }
  updateAuthUI();
});

loadServices();
loadWorkers();
refreshSession();
