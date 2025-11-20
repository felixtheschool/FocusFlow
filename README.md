# FocusFlow – Study Session Planner

FocusFlow is a simple web app that helps students **plan**, **focus**, and **reflect** on structured study sessions.

Instead of just being a timer or a to-do list, FocusFlow guides you through a full study cycle:

1. Plan a session (title, subject, duration, tasks)  
2. Focus using a countdown timer  
3. Log distractions as they happen  
4. Reflect on how it went  
5. Review your history and focus statistics  

---

## ✨ Features

### 📝 Session Planner
- Create a study session with:
  - Title
  - Subject (e.g., Math, History)
  - Duration (minutes)
  - Break length (minutes)
  - A list of tasks (one per line)
- New sessions appear in the **“Today’s Sessions”** list.
- The most recently created session becomes the **active session**.

### ⏱ Focus Timer + Progress Ring
- Countdown timer linked to the active session.
- **Start / Pause / End** controls.
- Animated **circular progress ring** around the timer that fills as time passes.

### 📵 Distraction Logger
- Quick buttons: **Phone**, **Social Media**, **Chatting**, **Other**.
- Each distraction event is stored with a timestamp.
- Distractions are shown in a list for the active session and summarized in the history.

### 💭 Session Reflection
- Reflection modal appears when a session ends.
- Includes:
  - Focus rating (1–5)
  - “What went well?”
  - “What will you change next time?”
- Reflection data is stored with each session.

### 📊 History & Focus Statistics
- History section lists all previous sessions with:
  - Date
  - Planned duration
  - Focused minutes
  - Number of distractions
- A **Chart.js bar chart** shows total focused minutes per subject.

### 🌓 Theme Toggle (Light / Dark)
- Light and dark theme toggle in the header.
- Theme preference is saved with `localStorage`, so it persists between visits.

---

## 🛠 Technologies Used

- **HTML5** – Structure and layout
- **CSS3** – Custom styles, responsive design, light/dark themes
- **JavaScript (ES6)** – App logic, timer, localStorage, UI updates
- **Chart.js** – Bar chart displaying focus time per subject
- **localStorage** – Stores sessions, reflections, and theme preference in the browser

No backend is required. All data is stored locally on the user’s device.

---

## 📁 Project Structure

```text
focusflow-study-planner/
├── index.html      # Main HTML file
├── styles.css      # Styling, layout, themes
└── script.js       # App logic, timer, storage, charts
