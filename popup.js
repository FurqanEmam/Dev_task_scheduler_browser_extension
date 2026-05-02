// ── DevTask — popup.js ──

const STORAGE_KEY = 'tasks';

let tasks = [];
let editingId = null;
let filters = { cat: 'all', pri: 'all', status: 'all' };

// ── Storage helpers ──────────────────────────────────────
function loadTasks(cb) {
  chrome.storage.local.get([STORAGE_KEY], (r) => cb(r[STORAGE_KEY] || []));
}
function saveTasks(cb) {
  chrome.storage.local.set({ [STORAGE_KEY]: tasks }, cb);
}

// ── ID generator ─────────────────────────────────────────
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ── Category / Priority meta ──────────────────────────────
const CAT_META = {
  work:  { label: '💼 Work',  cls: 'tag-cat-work',  border: 'cat-work'  },
  study: { label: '📖 Study', cls: 'tag-cat-study', border: 'cat-study' },
  uni:   { label: '🎓 Uni',   cls: 'tag-cat-uni',   border: 'cat-uni'   },
  side:  { label: '🚀 Side',  cls: 'tag-cat-side',  border: 'cat-side'  },
};
const PRI_META = {
  p1: { label: 'P1', cls: 'tag-p1' },
  p2: { label: 'P2', cls: 'tag-p2' },
  p3: { label: 'P3', cls: 'tag-p3' },
};
const STATUS_META = {
  todo:       { label: '⬜ Todo',        cls: 'tag-todo'       },
  inprogress: { label: '🔄 In Progress', cls: 'tag-inprogress' },
  done:       { label: '✅ Done',        cls: 'tag-done'       },
};

// ── Render ───────────────────────────────────────────────
function applyFilters(list) {
  return list.filter(t => {
    if (filters.cat    !== 'all' && t.category !== filters.cat)    return false;
    if (filters.pri    !== 'all' && t.priority !== filters.pri)    return false;
    if (filters.status !== 'all' && t.status   !== filters.status) return false;
    return true;
  });
}

function sortTasks(list) {
  const priOrder = { p1: 0, p2: 1, p3: 2 };
  const statOrder = { inprogress: 0, todo: 1, done: 2 };
  return [...list].sort((a, b) => {
    if (a.status === 'done' && b.status !== 'done') return 1;
    if (b.status === 'done' && a.status !== 'done') return -1;
    if (statOrder[a.status] !== statOrder[b.status])
      return statOrder[a.status] - statOrder[b.status];
    return priOrder[a.priority] - priOrder[b.priority];
  });
}

function formatDue(due) {
  if (!due) return '';
  const d = new Date(due + 'T00:00:00');
  const today = new Date(); today.setHours(0,0,0,0);
  const diff = Math.round((d - today) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  if (diff < 0) return `${Math.abs(diff)}d ago`;
  return `in ${diff}d`;
}

function isOverdue(due) {
  if (!due) return false;
  const d = new Date(due + 'T00:00:00');
  const today = new Date(); today.setHours(0,0,0,0);
  return d < today;
}

function renderTasks() {
  const list = document.getElementById('task-list');
  const empty = document.getElementById('empty-state');
  const visible = sortTasks(applyFilters(tasks));

  // stats
  const done = tasks.filter(t => t.status === 'done').length;
  document.getElementById('stats-done').textContent = done;
  document.getElementById('stats-total').textContent = tasks.length;

  // clear old cards (keep empty state node)
  list.querySelectorAll('.task-card').forEach(el => el.remove());

  if (visible.length === 0) {
    empty.style.display = 'flex';
    return;
  }
  empty.style.display = 'none';

  visible.forEach(task => {
    const card = document.createElement('div');
    card.className = `task-card ${CAT_META[task.category].border} ${task.status === 'done' ? 'is-done' : ''}`;
    card.dataset.id = task.id;

    const dueStr = formatDue(task.due);
    const overdue = task.status !== 'done' && isOverdue(task.due);

    card.innerHTML = `
      <div class="task-card-top">
        <button class="task-check ${task.status === 'done' ? 'checked' : ''}" data-id="${task.id}" title="Mark done">
          ${task.status === 'done' ? '✓' : ''}
        </button>
        <div class="task-info">
          <div class="task-title">${escHtml(task.title)}</div>
          <div class="task-meta">
            <span class="tag ${CAT_META[task.category].cls}">${CAT_META[task.category].label.split(' ')[1]}</span>
            <span class="tag ${PRI_META[task.priority].cls}">${PRI_META[task.priority].label}</span>
            <span class="tag ${STATUS_META[task.status].cls}">${STATUS_META[task.status].label.replace(/^[^ ]+ /,'')}</span>
            ${dueStr ? `<span class="task-due ${overdue ? 'overdue' : ''}">${dueStr}</span>` : ''}
          </div>
        </div>
      </div>`;

    // checkbox toggle
    card.querySelector('.task-check').addEventListener('click', (e) => {
      e.stopPropagation();
      const t = tasks.find(x => x.id === task.id);
      if (!t) return;
      t.status = t.status === 'done' ? 'todo' : 'done';
      saveTasks(() => renderTasks());
    });

    // open drawer
    card.addEventListener('click', () => openDrawer(task.id));
    list.appendChild(card);
  });
}

// ── HTML escape ───────────────────────────────────────────
function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Modal ─────────────────────────────────────────────────
function openModal(taskId = null) {
  editingId = taskId;
  const overlay = document.getElementById('modal-overlay');
  document.getElementById('modal-title').textContent = taskId ? 'Edit Task' : 'New Task';

  if (taskId) {
    const t = tasks.find(x => x.id === taskId);
    document.getElementById('f-title').value    = t.title;
    document.getElementById('f-category').value = t.category;
    document.getElementById('f-priority').value = t.priority;
    document.getElementById('f-status').value   = t.status;
    document.getElementById('f-due').value       = t.due || '';
    document.getElementById('f-notes').value     = t.notes || '';
  } else {
    document.getElementById('f-title').value    = '';
    document.getElementById('f-category').value = 'work';
    document.getElementById('f-priority').value = 'p2';
    document.getElementById('f-status').value   = 'todo';
    document.getElementById('f-due').value       = '';
    document.getElementById('f-notes').value     = '';
  }

  overlay.style.display = 'flex';
  setTimeout(() => document.getElementById('f-title').focus(), 80);
}

function closeModal() {
  document.getElementById('modal-overlay').style.display = 'none';
  editingId = null;
}

function saveTask() {
  const title = document.getElementById('f-title').value.trim();
  if (!title) {
    document.getElementById('f-title').focus();
    document.getElementById('f-title').style.borderColor = 'var(--p1)';
    setTimeout(() => document.getElementById('f-title').style.borderColor = '', 1000);
    return;
  }

  const data = {
    title,
    category: document.getElementById('f-category').value,
    priority: document.getElementById('f-priority').value,
    status:   document.getElementById('f-status').value,
    due:      document.getElementById('f-due').value || null,
    notes:    document.getElementById('f-notes').value.trim() || null,
  };

  if (editingId) {
    const idx = tasks.findIndex(t => t.id === editingId);
    tasks[idx] = { ...tasks[idx], ...data };
  } else {
    tasks.unshift({ id: uid(), createdAt: Date.now(), ...data });
  }

  if (data.due) scheduleReminder(editingId || tasks[0].id, data.due, data.title);

  saveTasks(() => { closeModal(); renderTasks(); });
}

// ── Drawer ────────────────────────────────────────────────
let currentDrawerId = null;
function openDrawer(taskId) {
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;
  currentDrawerId = taskId;

  const cat = CAT_META[task.category];
  const badge = document.getElementById('d-cat-badge');
  badge.textContent = cat.label;
  badge.className = `drawer-cat-badge tag ${cat.cls}`;

  document.getElementById('d-title').textContent = task.title;

  const meta = document.getElementById('d-meta');
  const dueStr = formatDue(task.due);
  const overdue = task.status !== 'done' && isOverdue(task.due);
  meta.innerHTML = `
    <span class="tag ${PRI_META[task.priority].cls}">${PRI_META[task.priority].label}</span>
    <span class="tag ${STATUS_META[task.status].cls}">${STATUS_META[task.status].label}</span>
    ${dueStr ? `<span class="tag task-due ${overdue ? 'overdue' : ''}">${dueStr}</span>` : ''}
  `;

  const notesEl = document.getElementById('d-notes');
  notesEl.textContent = task.notes || 'No notes.';

  document.getElementById('drawer-overlay').style.display = 'flex';
}

function closeDrawer() {
  document.getElementById('drawer-overlay').style.display = 'none';
  currentDrawerId = null;
}

// ── Alarm / Reminder ──────────────────────────────────────
function scheduleReminder(taskId, due, title) {
  if (!due) return;
  const alarmTime = new Date(due + 'T09:00:00').getTime();
  if (alarmTime > Date.now()) {
    chrome.alarms.create(`task-reminder-${taskId}`, { when: alarmTime });
  }
}

// ── Filter chips ──────────────────────────────────────────
function bindFilterGroup(groupId, filterKey) {
  document.getElementById(groupId).querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.getElementById(groupId).querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      filters[filterKey] = chip.dataset.val;
      renderTasks();
    });
  });
}

// ── Keyboard shortcut inside popup ───────────────────────
document.addEventListener('keydown', (e) => {
  if (e.altKey && e.key.toLowerCase() === 'n') { e.preventDefault(); openModal(); }
  if (e.key === 'Escape') { closeModal(); closeDrawer(); }
  if (e.key === 'Enter' && document.getElementById('modal-overlay').style.display !== 'none') {
    if (document.activeElement.tagName !== 'TEXTAREA') { e.preventDefault(); saveTask(); }
  }
});

// ── Init ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // load & render
  loadTasks((t) => { tasks = t; renderTasks(); });

  // header buttons
  document.getElementById('add-btn').addEventListener('click', () => openModal());
  document.getElementById('filter-btn').addEventListener('click', () => {
    const bar = document.getElementById('filter-bar');
    bar.style.display = bar.style.display === 'none' ? 'flex' : 'none';
  });

  // modal
  document.getElementById('modal-save').addEventListener('click', saveTask);
  document.getElementById('modal-cancel').addEventListener('click', closeModal);
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeModal();
  });

  // drawer
  document.getElementById('drawer-close').addEventListener('click', closeDrawer);
  document.getElementById('drawer-overlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeDrawer();
  });
  document.getElementById('d-edit-btn').addEventListener('click', () => {
    const id = currentDrawerId;
    closeDrawer();
    openModal(id);
  });
  document.getElementById('d-delete-btn').addEventListener('click', () => {
    if (!currentDrawerId) return;
    tasks = tasks.filter(t => t.id !== currentDrawerId);
    saveTasks(() => { closeDrawer(); renderTasks(); });
  });

  // filters
  bindFilterGroup('cat-filter',    'cat');
  bindFilterGroup('pri-filter',    'pri');
  bindFilterGroup('status-filter', 'status');
});
