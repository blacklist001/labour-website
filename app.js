const SUPABASE_URL = "https://ubuftuivhfxzbzcgrkfq.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_o7T7agY1oP92MzE59IcVXw_3j9CRAoV";

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
window.labourDb = db;

const statusEl = document.querySelector("#data-status");
const serviceSelect = document.querySelector("#service-select");
const bookingServiceSelect = document.querySelector("#booking-service-select");
const categoryGrid = document.querySelector("#category-grid");
const workerSearch = document.querySelector("#worker-search");
const bookingForm = document.querySelector(".booking-card");

function setStatus(message, tone = "neutral") {
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.dataset.tone = tone;
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

categoryGrid?.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-service]");
  if (!button) return;

  serviceSelect.value = button.dataset.service;
  document.querySelector("#top")?.scrollIntoView({ behavior: "smooth" });
  setStatus(`Selected ${button.textContent}. Enter your location and search.`, "success");
});

workerSearch?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(workerSearch);
  const service = formData.get("service");
  const location = formData.get("location") || "your area";

  setStatus(`Searching ${service} workers near ${location}...`, "neutral");

  const { data, error } = await db
    .from("worker_profiles")
    .select("id, bio, location_name, experience_years, base_price, availability, rating_average, rating_count")
    .eq("verification_status", "verified")
    .limit(6);

  if (error) {
    setStatus("Search connected, but worker profiles are not available yet.", "error");
    console.error("Supabase worker search error:", error);
    return;
  }

  const count = data?.length || 0;
  setStatus(count ? `Found ${count} verified workers.` : "Connected. No verified workers have been added yet.", "success");
});

bookingForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  setStatus("Booking needs client login next. Supabase is connected; auth is the next build step.", "neutral");
});

loadServices();
