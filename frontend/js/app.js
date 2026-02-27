/* ================= BACKEND CONFIG ================= */

const BASE_URL = "https://expp-zefs.onrender.com/api";

/* ================= SUPABASE CONFIG ================= */

const SUPABASE_URL = "https://zxaibceibivexxkiffnt.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4YWliY2VpYml2ZXh4a2lmZm50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxODc5MTIsImV4cCI6MjA4Nzc2MzkxMn0.7DcyuYTmx1TCFffd63V0_DloxB1z5j_2NbnH6GBJhig";

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
    runReminders();

  } catch (err) {
    console.error("Load error:", err);
  }
}

/* ================= REMINDER ================= */

function runReminders() {
  allEvents.forEach(e => {

    if (!e.reminder_enabled) return;
    if (e.status === "Attended") return;

    const daysLeft = Math.ceil(
      (new Date(e.registration_deadline) - new Date()) /
      (1000 * 60 * 60 * 24)
    );

    if (daysLeft <= 1 && daysLeft >= 0) {
      const reminderKey = `reminded_${e.id}`;

      if (!sessionStorage.getItem(reminderKey)) {
        alert(`🔔 Reminder: "${e.name}" deadline is near!`);
        sessionStorage.setItem(reminderKey, "true");
      }
    }
  });
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
        new Date(a.registration_deadline) -
        new Date(b.registration_deadline)
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
    const days = Math.ceil(
      (new Date(e.registration_deadline) - new Date()) /
      (1000 * 60 * 60 * 24)
    );

    grid.innerHTML += `
      <div class="event-card" onclick="openDetail('${e.id}')">
        <div class="event-name">${e.name}</div>
        <div class="countdown">${days >= 0 ? days : 0} days left</div>
      </div>
    `;
  });
}

/* ================= UPDATE STATS ================= */

function updateStats() {
  document.getElementById("totalCount").textContent = allEvents.length;

  const urgent = allEvents.filter(e =>
    new Date(e.registration_deadline) - new Date() <= 7 * 86400000 &&
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
      new Date(a.registration_deadline) -
      new Date(b.registration_deadline)
    );

  activeEvents.slice(0, 5).forEach((e, index) => {
    container.innerHTML += `
      <div class="priority-item">
        <div>#${index + 1}</div>
        <div>${e.name}</div>
      </div>
    `;
  });
}

/* ================= DETAIL ================= */

function openDetail(id) {
  const eventObj = allEvents.find(e => e.id === id);
  if (!eventObj) return;

  const modal = document.getElementById("detailModal");
  const content = document.getElementById("detailContent");

  content.innerHTML = `
    <h3>${eventObj.name}</h3>
    <p><strong>Category:</strong> ${eventObj.category}</p>
    <p><strong>Source:</strong> ${eventObj.source || "-"}</p>
    <p><strong>Event Date:</strong> ${eventObj.event_date || "-"}</p>
    <p><strong>Registration Deadline:</strong> ${eventObj.registration_deadline}</p>
    <p><strong>Status:</strong> ${eventObj.status}</p>
    <p><strong>Notes:</strong> ${eventObj.notes || "-"}</p>

    <div style="margin-top:20px; display:flex; gap:10px;">
      <button onclick="window.open('${eventObj.link}', '_blank')">Open Registration</button>
      <button onclick="editEvent('${eventObj.id}')">Edit</button>
      <button onclick="deleteEventConfirmed('${eventObj.id}')">Delete</button>
    </div>

    <hr>

    <h4>🎓 Certificate</h4>

    ${
      eventObj.certificate_url
        ? `
          <button onclick="window.open('${eventObj.certificate_url}', '_blank')">
            Open Certificate
          </button>
          <button onclick="removeCertificate('${eventObj.id}')">
            Remove Certificate
          </button>
        `
        : `
          <input type="file"
                 accept=".pdf,.jpg,.jpeg,.png"
                 onchange="uploadCertificate(event, '${eventObj.id}')">
        `
    }
  `;

  modal.classList.add("open");
}

function closeDetail() {
  document.getElementById("detailModal").classList.remove("open");
}

/* ================= EDIT ================= */

function editEvent(id) {
  const eventObj = allEvents.find(e => e.id === id);
  if (!eventObj) return;

  document.getElementById("name").value = eventObj.name || "";
  document.getElementById("category").value = eventObj.category || "";
  document.getElementById("source").value = eventObj.source || "";
  document.getElementById("event_date").value = eventObj.event_date || "";
  document.getElementById("registration_deadline").value = eventObj.registration_deadline || "";
  document.getElementById("link").value = eventObj.link || "";
  document.getElementById("notes").value = eventObj.notes || "";
  document.getElementById("status").value = eventObj.status || "";

  editingEventId = id;

  closeDetail();
  openModal();
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
      } else {
        await fetch(`${BASE_URL}/events`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(eventData)
        });
      }

      editingEventId = null;
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

/* ================= CERTIFICATE ================= */

async function uploadFile(file, folder) {
  const fileName = `${folder}-${Date.now()}-${file.name}`;

  const { error } = await supabaseClient.storage
    .from("documents")
    .upload(fileName, file);

  if (error) {
    console.error(error);
    return null;
  }

  const { data } = supabaseClient.storage
    .from("documents")
    .getPublicUrl(fileName);

  return { url: data.publicUrl };
}

async function uploadCertificate(event, eventId) {
  const file = event.target.files[0];
  if (!file) return;

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
}

async function removeCertificate(eventId) {
  if (!confirm("Remove certificate?")) return;

  await fetch(`${BASE_URL}/events/${eventId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      certificate_url: null
    })
  });

  await loadEvents();
  openDetail(eventId);
}

/* ================= GLOBAL EXPORTS ================= */

window.openDetail = openDetail;
window.closeDetail = closeDetail;
window.deleteEventConfirmed = deleteEventConfirmed;
window.uploadCertificate = uploadCertificate;
window.editEvent = editEvent;
window.removeCertificate = removeCertificate;