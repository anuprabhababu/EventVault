/* ================= BACKEND CONFIG ================= */

// 🔥 REPLACE WITH YOUR REAL RENDER URL
const BASE_URL = "https://expp-zefs.onrender.com/api";


/* ================= SUPABASE CONFIG ================= */

const SUPABASE_URL = "https://zxaibceibivexxkiffnt.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4YWliY2VpYml2ZXh4a2lmZm50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxODc5MTIsImV4cCI6MjA4Nzc2MzkxMn0.7DcyuYTmx1TCFffd63V0_DloxB1z5j_2NbnH6GBJhig";

// Supabase v2 CDN usage
const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);


/* ================= GLOBAL STATE ================= */

let allEvents = [];
let editingEventId = null;
let currentCategory = "all";
let currentStatus = null;

document.addEventListener("DOMContentLoaded", init);

async function init() {
  await loadEvents();
  setupForm();
}


/* ================= LOAD EVENTS ================= */

async function loadEvents() {
  try {
    const res = await fetch(`${BASE_URL}/events`);
    allEvents = await res.json();

    applyFilters();
    updateStats();
    renderPriority();

    // Reminder Logic
    allEvents.forEach(e => {

      if (!e.reminder_enabled) return;
      if (e.status === "Attended") return;

      const days = daysLeft(e.registration_deadline);

      if (days <= 1 && days >= 0) {

        const reminderKey = `reminded_${e.id}`;

        if (!sessionStorage.getItem(reminderKey)) {
          alert(`🔔 Reminder: "${e.name}" deadline is near!`);
          sessionStorage.setItem(reminderKey, "true");
        }
      }
    });

  } catch (err) {
    console.error("Load error:", err);
  }
}


/* ================= FILTERING ================= */

function setFilter(category) {
  currentCategory = category;
  currentStatus = null;
  applyFilters();
}

function setStatusFilter(status) {
  currentStatus = status;
  applyFilters();
}

function applyFilters() {
  let filtered = [...allEvents];

  if (currentCategory !== "all" && currentCategory !== "priority") {
    filtered = filtered.filter(e =>
      e.category?.toLowerCase() === currentCategory
    );
  }

  if (currentStatus) {
    filtered = filtered.filter(e =>
      e.status === currentStatus
    );
  }

  if (currentCategory === "priority") {
    filtered = filtered
      .filter(e => e.status !== "Attended")
      .sort((a, b) =>
        daysLeft(a.registration_deadline) -
        daysLeft(b.registration_deadline)
      );
  }

  renderEvents(filtered);
}


/* ================= RENDER EVENTS ================= */

function renderEvents(events) {
  const grid = document.querySelector(".events-grid");
  grid.innerHTML = "";

  if (!events.length) {
    grid.innerHTML = "<p>No events found.</p>";
    return;
  }

  events.forEach(e => {
    const days = daysLeft(e.registration_deadline);
    const urgency = urgencyClass(days);

    grid.innerHTML += `
      <div class="event-card ${urgency}" 
           onclick="openDetail('${e.id}')">

        <div class="event-name">${e.name}</div>

        <div class="countdown">
          ${days} days left
        </div>

      </div>
    `;
  });
}


/* ================= UPDATE STATS ================= */

function updateStats() {
  document.getElementById("totalCount").textContent = allEvents.length;

  const urgent = allEvents.filter(e =>
    daysLeft(e.registration_deadline) <= 7 &&
    e.status !== "Attended"
  );
  document.getElementById("urgentCount").textContent = urgent.length;

  const registered = allEvents.filter(e =>
    e.status === "Registered"
  );
  document.getElementById("registeredCount").textContent = registered.length;

  const pendingCert = allEvents.filter(e =>
    e.status === "Attended" && !e.certificate_url
  );
  document.getElementById("certificatePending").textContent = pendingCert.length;
}


/* ================= PRIORITY ================= */

function renderPriority() {
  const container = document.getElementById("priorityList");
  container.innerHTML = "";

  const activeEvents = allEvents
    .filter(e => e.status !== "Attended")
    .sort((a, b) =>
      daysLeft(a.registration_deadline) -
      daysLeft(b.registration_deadline)
    );

  activeEvents.slice(0, 5).forEach((e, index) => {
    const days = daysLeft(e.registration_deadline);

    container.innerHTML += `
      <div class="priority-item">
        <div>#${index + 1}</div>
        <div>${e.name}</div>
        <div>${days} days</div>
      </div>
    `;
  });
}


/* ================= FORM ================= */

function setupForm() {
  const form = document.getElementById("eventForm");

  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    const eventData = {
      name: document.getElementById("name").value,
      category: document.getElementById("category").value,
      source: document.getElementById("source").value,
      event_date: document.getElementById("event_date").value,
      registration_deadline: document.getElementById("registration_deadline").value,
      link: document.getElementById("link").value,
      notes: document.getElementById("notes").value,
      status: document.getElementById("status").value
    };

    try {

      if (editingEventId) {

        await fetch(`${BASE_URL}/events/${editingEventId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(eventData)
        });

        editingEventId = null;

      } else {

        await fetch(`${BASE_URL}/events`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(eventData)
        });
      }

      closeModal();
      form.reset();
      await loadEvents();

    } catch (err) {
      console.error("Save error:", err);
    }
  });
}


/* ================= DELETE ================= */

async function deleteEventConfirmed(id) {
  if (!confirm("Delete this event?")) return;

  await fetch(`${BASE_URL}/events/${id}`, {
    method: "DELETE"
  });

  closeDetail();
  await loadEvents();
}


/* ================= FILE UPLOAD ================= */

async function uploadFile(file, folder) {
  const fileName = `${folder}-${Date.now()}-${file.name}`;

  const { error } = await supabaseClient.storage
    .from("documents")
    .upload(fileName, file);

  if (error) {
    console.error("Upload error:", error);
    return null;
  }

  const { data } = supabaseClient.storage
    .from("documents")
    .getPublicUrl(fileName);

  return { url: data.publicUrl };
}


/* ================= CERTIFICATE ================= */

async function uploadCertificate(event, eventId) {
  const file = event.target.files[0];
  if (!file) return;

  try {

    const uploadRes = await uploadFile(file, "certificate");

    if (!uploadRes) {
      alert("Upload failed.");
      return;
    }

    await fetch(`${BASE_URL}/events/${eventId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        certificate_url: uploadRes.url
      })
    });

    await loadEvents();
    openDetail(eventId);

  } catch (err) {
    console.error("Certificate upload error:", err);
    alert("Something went wrong.");
  }
  // Make functions global for HTML onclick
window.openDetail = openDetail;
window.deleteEventConfirmed = deleteEventConfirmed;
window.uploadCertificate = uploadCertificate;
window.removeCertificate = removeCertificate;
window.editEvent = editEvent;
}