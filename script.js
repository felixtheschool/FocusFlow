// ----- State -----

let sessions = [];
let activeSessionId = null;
let timerInterval = null;
let remainingSeconds = 0;
let chartInstance = null;

// ----- DOM Elements -----

const sessionForm = document.getElementById("session-form");
const todaySessionsList = document.getElementById("today-sessions");
const historyList = document.getElementById("history-list");

const noActiveSessionEl = document.getElementById("no-active-session");
const activeSessionContentEl = document.getElementById("active-session-content");
const activeTitleEl = document.getElementById("active-title");
const activeSubjectEl = document.getElementById("active-subject");
const activeTasksEl = document.getElementById("active-tasks");
const timerDisplayEl = document.getElementById("timer-display");
const distractionListEl = document.getElementById("distraction-list");

const startBtn = document.getElementById("start-btn");
const pauseBtn = document.getElementById("pause-btn");
const endBtn = document.getElementById("end-btn");

const distractionButtonsContainer = document.querySelector(".distraction-buttons");

const reflectionModal = document.getElementById("reflection-modal");
const reflectionForm = document.getElementById("reflection-form");
const closeModalBtn = document.getElementById("close-modal");

const subjectChartCanvas = document.getElementById("subject-chart");

// ----- Local Storage Helpers -----

const STORAGE_KEY = "focusflow_sessions_v1";

function loadSessions() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveSessions() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

// ----- Utility -----

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function getTodayDateKey() {
  const d = new Date();
  return d.toISOString().split("T")[0];
}

// ----- Rendering -----

function renderTodaySessions() {
  const todayKey = getTodayDateKey();
  const todays = sessions.filter((s) => s.dateKey === todayKey);

  todaySessionsList.innerHTML = "";

  if (todays.length === 0) {
    const li = document.createElement("li");
    li.textContent = "No sessions created today.";
    li.classList.add("muted");
    todaySessionsList.appendChild(li);
    return;
  }

  todays.forEach((s) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <strong>${s.title}</strong> – ${s.subject || "No subject"}<br/>
      <span class="muted">${s.durationMinutes} min, ${
      s.completed ? "Completed" : "Not completed"
    }</span>
    `;
    todaySessionsList.appendChild(li);
  });
}

function renderHistory() {
  historyList.innerHTML = "";

  if (sessions.length === 0) {
    const li = document.createElement("li");
    li.textContent = "No sessions yet.";
    li.classList.add("muted");
    historyList.appendChild(li);
    return;
  }

  // newest first
  const sorted = [...sessions].sort((a, b) => b.createdAt - a.createdAt);

  sorted.forEach((s) => {
    const date = new Date(s.createdAt);
    const li = document.createElement("li");
    li.innerHTML = `
      <strong>${s.title}</strong> – ${s.subject || "No subject"}<br/>
      <span class="muted">
        ${date.toLocaleDateString()} • ${s.durationMinutes} min planned • ${
      s.focusedMinutes ?? 0
    } min focused • ${s.distractions.length} distractions
      </span>
    `;
    historyList.appendChild(li);
  });
}

function renderActiveSession() {
  if (!activeSessionId) {
    noActiveSessionEl.classList.remove("hidden");
    activeSessionContentEl.classList.add("hidden");
    return;
  }

  const session = sessions.find((s) => s.id === activeSessionId);
  if (!session) {
    activeSessionId = null;
    renderActiveSession();
    return;
  }

  noActiveSessionEl.classList.add("hidden");
  activeSessionContentEl.classList.remove("hidden");

  activeTitleEl.textContent = session.title;
  activeSubjectEl.textContent = session.subject || "No subject";

  activeTasksEl.innerHTML = "";
  session.tasks.forEach((task) => {
    const li = document.createElement("li");
    li.textContent = task;
    activeTasksEl.appendChild(li);
  });

  distractionListEl.innerHTML = "";
  session.distractions.forEach((d) => {
    const li = document.createElement("li");
    const time = new Date(d.timestamp).toLocaleTimeString();
    li.textContent = `${d.type} @ ${time}`;
    distractionListEl.appendChild(li);
  });

  timerDisplayEl.textContent = formatTime(remainingSeconds);
}

function updateChart() {
  const totals = {};
  sessions.forEach((s) => {
    const subj = s.subject || "Other";
    const min = s.focusedMinutes ?? 0;
    totals[subj] = (totals[subj] || 0) + min;
  });

  const labels = Object.keys(totals);
  const data = Object.values(totals);

  if (chartInstance) {
    chartInstance.destroy();
  }

  if (labels.length === 0) return;

  chartInstance = new Chart(subjectChartCanvas, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Focused minutes",
          data
        }
      ]
    },
    options: {
      plugins: {
        legend: {
          labels: {
            color: "#e5e7eb"
          }
        }
      },
      scales: {
        x: {
          ticks: { color: "#e5e7eb" },
          grid: { display: false }
        },
        y: {
          ticks: { color: "#e5e7eb" },
          grid: { color: "#1f2937" }
        }
      }
    }
  });
}

// ----- Timer Logic -----

function startTimer() {
  if (!activeSessionId || timerInterval) return;

  startBtn.disabled = true;
  pauseBtn.disabled = false;
  endBtn.disabled = false;

  timerInterval = setInterval(() => {
    remainingSeconds--;
    if (remainingSeconds <= 0) {
      remainingSeconds = 0;
      timerDisplayEl.textContent = formatTime(remainingSeconds);
      clearInterval(timerInterval);
      timerInterval = null;
      handleSessionEnd(true);
    } else {
      timerDisplayEl.textContent = formatTime(remainingSeconds);
    }
  }, 1000);
}

function pauseTimer() {
  if (!timerInterval) return;
  clearInterval(timerInterval);
  timerInterval = null;

  startBtn.disabled = false;
  pauseBtn.disabled = true;
}

function handleSessionEnd(autoCompleted = false) {
  if (!activeSessionId) return;

  const session = sessions.find((s) => s.id === activeSessionId);
  if (!session) return;

  // Mark focused minutes as planned minus remaining
  const plannedSeconds = session.durationMinutes * 60;
  const focused = Math.round((plannedSeconds - remainingSeconds) / 60);
  session.focusedMinutes = Math.max(0, focused);
  session.completed = autoCompleted || session.completed;

  saveSessions();
  renderTodaySessions();
  renderHistory();
  updateChart();

  // Reset timer UI
  startBtn.disabled = false;
  pauseBtn.disabled = true;
  endBtn.disabled = true;
  clearInterval(timerInterval);
  timerInterval = null;

  // Open reflection modal
  reflectionModal.classList.remove("hidden");
}

function endSessionManually() {
  handleSessionEnd(false);
}

// ----- Event Handlers -----

sessionForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const title = document.getElementById("session-title").value.trim();
  const subject = document.getElementById("session-subject").value.trim();
  const durationMinutes = parseInt(
    document.getElementById("session-duration").value,
    10
  );
  const breakMinutes = parseInt(
    document.getElementById("session-break").value,
    10
  );
  const tasksRaw = document
    .getElementById("session-tasks")
    .value.split("\n")
    .map((t) => t.trim())
    .filter(Boolean);

  if (!title || !durationMinutes || durationMinutes <= 0) {
    alert("Please provide a title and a valid duration.");
    return;
  }

  const newSession = {
    id: generateId(),
    title,
    subject,
    durationMinutes,
    breakMinutes,
    tasks: tasksRaw,
    distractions: [],
    reflection: null,
    dateKey: getTodayDateKey(),
    createdAt: Date.now(),
    completed: false,
    focusedMinutes: 0
  };

  sessions.push(newSession);
  saveSessions();

  // Set as active session
  activeSessionId = newSession.id;
  remainingSeconds = durationMinutes * 60;

  // Reset form
  sessionForm.reset();
  document.getElementById("session-duration").value = durationMinutes;
  document.getElementById("session-break").value = breakMinutes;

  renderTodaySessions();
  renderActiveSession();
  renderHistory();
  updateChart();
});

startBtn.addEventListener("click", startTimer);
pauseBtn.addEventListener("click", pauseTimer);
endBtn.addEventListener("click", endSessionManually);

distractionButtonsContainer.addEventListener("click", (e) => {
  if (e.target.tagName !== "BUTTON") return;
  if (!activeSessionId) return;

  const type = e.target.getAttribute("data-type");
  const session = sessions.find((s) => s.id === activeSessionId);
  if (!session) return;

  session.distractions.push({
    type,
    timestamp: Date.now()
  });

  saveSessions();
  renderActiveSession();
});

reflectionForm.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!activeSessionId) {
    reflectionModal.classList.add("hidden");
    return;
  }

  const rating = parseInt(
    document.getElementById("reflection-rating").value,
    10
  );
  const good = document.getElementById("reflection-good").value.trim();
  const improve = document.getElementById("reflection-improve").value.trim();

  const session = sessions.find((s) => s.id === activeSessionId);
  if (!session) return;

  session.reflection = {
    rating,
    good,
    improve
  };
  session.completed = true;

  saveSessions();
  renderHistory();
  updateChart();

  reflectionModal.classList.add("hidden");
  activeSessionId = null;
  renderActiveSession();
});

closeModalBtn.addEventListener("click", () => {
  reflectionModal.classList.add("hidden");
  activeSessionId = null;
  renderActiveSession();
});

// ----- Init -----

function init() {
  sessions = loadSessions();
  renderTodaySessions();
  renderHistory();
  updateChart();
  renderActiveSession();
  timerDisplayEl.textContent = formatTime(0);

  // Initial button states
  startBtn.disabled = false;
  pauseBtn.disabled = true;
  endBtn.disabled = true;
}

document.addEventListener("DOMContentLoaded", init);
