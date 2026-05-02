# Dev_task_scheduler_browser_extension

feat: add DevTask browser extension (Chrome + Firefox)

A developer-focused task manager extension built with vanilla JS and
the WebExtensions API (Manifest V3 + Firefox MV2 compat).

Features:

- Tasks with category (Work/Study/Uni/Side), priority (P1-P3),
  status (Todo/In Progress/Done), due date, and notes
- Filter bar: combine category + priority + status filters
- Smart sort: In Progress → Todo (by priority) → Done
- Detail drawer per task with edit and delete actions
- Quick-toggle done via checkbox on each card
- Relative due date labels (Today, Tomorrow, overdue in red)
- Chrome alarm API for 9am due-date notifications
- Keyboard shortcut Alt+N to add, Escape to close
- Auto dark/light mode following system preference

Cross-browser:

- Chrome: Manifest V3 service_worker
- Firefox: background.scripts fallback in same manifest

Tech: HTML/CSS/JS · chrome.storage.local · chrome.alarms · chrome.notifications

How to install
For Chrome:

Unzip the file
Go to chrome://extensions
Enable Developer mode (top right toggle)
Click Load unpacked → select the devtask-extension folder

For Firefox:

Go to about:debugging → This Firefox
Click Load Temporary Add-on
Select the manifest.json file inside the folder

What's planned for next (future features)

Export tasks to JSON / markdown
Recurring tasks
Pomodoro timer linked to a task
Stats dashboard (tasks done per week per category)
