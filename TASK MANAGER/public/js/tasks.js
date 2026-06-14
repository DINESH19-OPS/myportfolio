// ─── State ───────────────────────────────────────────────────────────────────
let allTasks   = [];
let currentUser = null;
let currentView = 'kanban';
let editingTaskId = null;
let deletingTaskId = null;
let currentTags = [];
let searchDebounceTimer = null;
let ws = null;
const CLIENT_ID = crypto.randomUUID();

// Priority config
const PRIORITY = {
  urgent: { color: '#ef4444', glow: 'rgba(239,68,68,0.15)',  label: '🔴 Urgent' },
  high:   { color: '#f97316', glow: 'rgba(249,115,22,0.15)', label: '🟠 High'   },
  medium: { color: '#6366f1', glow: 'rgba(99,102,241,0.15)', label: '🔵 Medium' },
  low:    { color: '#10b981', glow: 'rgba(16,185,129,0.15)', label: '🟢 Low'    },
};

// ─── Toast ───────────────────────────────────────────────────────────────────
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  const icons = { success: '✅', error: '🚨', info: 'ℹ️' };
  toast.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;">
      <span>${icons[type] || 'ℹ️'}</span>
      <span>${message}</span>
    </div>
    <button class="toast-close" onclick="this.parentElement.remove()">✕</button>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'toastOut 0.3s cubic-bezier(0.16,1,0.3,1) forwards';
    toast.addEventListener('animationend', () => toast.remove());
  }, 4000);
}

// ─── Auth / Session ──────────────────────────────────────────────────────────
async function loadUser() {
  try {
    const res  = await fetch('/api/auth/me');
    const data = await res.json();
    if (!res.ok || !data.success) { window.location.href = '/'; return; }
    currentUser = data.user;
    renderUserInfo();
  } catch {
    window.location.href = '/';
  }
}

function renderUserInfo() {
  if (!currentUser) return;
  const initial = currentUser.name.charAt(0).toUpperCase();
  document.getElementById('user-avatar').textContent   = initial;
  document.getElementById('user-name').textContent     = currentUser.name;
  document.getElementById('dropdown-name').textContent  = currentUser.name;
  document.getElementById('dropdown-email').textContent = currentUser.email;

  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  document.getElementById('greeting').textContent = `${greet}, ${currentUser.name.split(' ')[0]} 👋`;
}

function toggleUserMenu() {
  const dd = document.getElementById('user-dropdown');
  dd.style.display = dd.style.display === 'none' ? 'block' : 'none';
}

document.addEventListener('click', (e) => {
  const dd   = document.getElementById('user-dropdown');
  const menu = document.getElementById('user-menu');
  if (dd && !dd.contains(e.target) && !menu.contains(e.target)) {
    dd.style.display = 'none';
  }
});

async function logout() {
  await fetch('/api/auth/logout', { method: 'POST' });
  window.location.href = '/';
}

// ─── Tasks API ───────────────────────────────────────────────────────────────
async function fetchTasks() {
  try {
    const res  = await fetch('/api/tasks');
    const data = await res.json();
    if (res.ok && data.success) {
      allTasks = data.tasks;
      renderAll();
    }
  } catch (err) {
    console.error('Failed to fetch tasks:', err);
  }
}

async function createTask(payload) {
  const res  = await fetch('/api/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-client-id': CLIENT_ID },
    body: JSON.stringify(payload)
  });
  return await res.json();
}

async function updateTask(id, payload) {
  const res  = await fetch(`/api/tasks/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'x-client-id': CLIENT_ID },
    body: JSON.stringify(payload)
  });
  return await res.json();
}

async function deleteTask(id) {
  const res  = await fetch(`/api/tasks/${id}`, {
    method: 'DELETE',
    headers: { 'x-client-id': CLIENT_ID }
  });
  return await res.json();
}

// ─── Filters & Search ────────────────────────────────────────────────────────
function getFilteredTasks() {
  const query    = (document.getElementById('search-input')?.value || '').toLowerCase().trim();
  const status   = document.getElementById('filter-status')?.value  || 'all';
  const priority = document.getElementById('filter-priority')?.value || 'all';
  const sort     = document.getElementById('filter-sort')?.value    || 'created_at';

  let tasks = [...allTasks];

  if (query) {
    tasks = tasks.filter(t =>
      t.title.toLowerCase().includes(query) ||
      (t.description || '').toLowerCase().includes(query) ||
      (t.tags || []).some(tag => tag.toLowerCase().includes(query))
    );
  }
  if (status !== 'all')   tasks = tasks.filter(t => t.status   === status);
  if (priority !== 'all') tasks = tasks.filter(t => t.priority === priority);

  const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
  tasks.sort((a, b) => {
    if (sort === 'priority')    return (priorityOrder[a.priority] ?? 4) - (priorityOrder[b.priority] ?? 4);
    if (sort === 'due_date')    return compareDates(a.dueDate, b.dueDate);
    if (sort === 'title')       return a.title.localeCompare(b.title);
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  return tasks;
}

function compareDates(a, b) {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return new Date(a) - new Date(b);
}

function debounceSearch() {
  clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(applyFilters, 250);
}

function applyFilters() { renderAll(); }

// ─── Stats ───────────────────────────────────────────────────────────────────
function renderStats() {
  const now   = new Date(); now.setHours(0,0,0,0);
  const total = allTasks.length;
  const todo  = allTasks.filter(t => t.status === 'todo').length;
  const prog  = allTasks.filter(t => t.status === 'in_progress').length;
  const done  = allTasks.filter(t => t.status === 'done').length;
  const urgent= allTasks.filter(t => t.priority === 'urgent' && t.status !== 'done').length;
  const overdue = allTasks.filter(t => {
    if (!t.dueDate || t.status === 'done') return false;
    return new Date(t.dueDate) < now;
  }).length;

  document.getElementById('stat-total').textContent   = total;
  document.getElementById('stat-todo').textContent    = todo;
  document.getElementById('stat-progress').textContent= prog;
  document.getElementById('stat-done').textContent    = done;
  document.getElementById('stat-urgent').textContent  = urgent;
  document.getElementById('stat-overdue').textContent = overdue;
}

// ─── Render ───────────────────────────────────────────────────────────────────
function renderAll() {
  renderStats();
  const tasks = getFilteredTasks();
  if (currentView === 'kanban') renderKanban(tasks);
  else renderList(tasks);
}

function isOverdue(dueDate, status) {
  if (!dueDate || status === 'done') return false;
  const now = new Date(); now.setHours(0,0,0,0);
  return new Date(dueDate) < now;
}

function formatDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function buildTaskCard(task) {
  const p        = PRIORITY[task.priority] || PRIORITY.medium;
  const overdue  = isOverdue(task.dueDate, task.status);
  const dueFmt   = formatDate(task.dueDate);
  const tagsHtml = (task.tags || []).map(tag =>
    `<span class="task-card-tag">#${escHtml(tag)}</span>`).join('');

  return `
    <div class="task-card" 
         style="--priority-color:${p.color};--priority-glow:${p.glow};"
         onclick="openTaskModal('${task.id}')"
         id="task-${task.id}">
      <div class="task-card-header">
        <div class="task-card-title">${escHtml(task.title)}</div>
      </div>
      ${task.description ? `<div class="task-card-desc">${escHtml(task.description)}</div>` : ''}
      ${tagsHtml ? `<div class="task-card-tags">${tagsHtml}</div>` : ''}
      <div class="task-card-footer">
        <div class="task-card-due ${overdue ? 'overdue' : ''}">
          ${dueFmt ? `📅 ${dueFmt}${overdue ? ' ⚠️' : ''}` : ''}
        </div>
        <div class="task-card-priority">${p.label}</div>
      </div>
    </div>`;
}

function renderKanban(tasks) {
  const cols = {
    todo:        { cards: document.getElementById('col-todo-cards'),        count: document.getElementById('count-todo'),        empty: `<div class="empty-state"><div class="empty-state-icon">📝</div><div class="empty-state-title">No tasks yet</div></div>` },
    in_progress: { cards: document.getElementById('col-in_progress-cards'), count: document.getElementById('count-in_progress'), empty: `<div class="empty-state"><div class="empty-state-icon">⚡</div><div class="empty-state-title">Nothing in progress</div></div>` },
    done:        { cards: document.getElementById('col-done-cards'),        count: document.getElementById('count-done'),        empty: `<div class="empty-state"><div class="empty-state-icon">🏆</div><div class="empty-state-title">No completed tasks</div></div>` }
  };

  Object.entries(cols).forEach(([status, col]) => {
    const group = tasks.filter(t => t.status === status);
    col.count.textContent = group.length;
    col.cards.innerHTML   = group.length
      ? group.map(buildTaskCard).join('')
      : col.empty;
  });
}

function renderList(tasks) {
  const lv = document.getElementById('list-view');
  if (!tasks.length) {
    lv.innerHTML = `
      <div style="text-align:center;padding:60px 20px;">
        <div style="font-size:32px;margin-bottom:12px;opacity:0.3;">📋</div>
        <div style="color:var(--text-muted);font-size:14px;">No tasks found</div>
      </div>`;
    return;
  }

  lv.innerHTML = tasks.map(task => {
    const p       = PRIORITY[task.priority] || PRIORITY.medium;
    const overdue = isOverdue(task.dueDate, task.status);
    const dueFmt  = formatDate(task.dueDate);
    const isDone  = task.status === 'done';
    const statusLabels = { todo: '📌 To Do', in_progress: '⚡ In Progress', done: '✅ Done' };

    return `
      <div class="list-row ${isDone ? 'done' : ''}" onclick="openTaskModal('${task.id}')">
        <div class="list-row-checkbox">${isDone ? '✓' : ''}</div>
        <div class="list-row-title">${escHtml(task.title)}</div>
        <div class="list-row-desc">${escHtml(task.description || '—')}</div>
        <div class="list-row-priority task-card-priority"
             style="--priority-color:${p.color};--priority-glow:${p.glow};color:${p.color};background:${p.glow}">
          ${p.label}
        </div>
        <div class="list-row-status">${statusLabels[task.status] || task.status}</div>
        <div class="list-row-due ${overdue ? 'overdue' : ''}">${dueFmt || '—'}</div>
      </div>`;
  }).join('');
}

// ─── View Toggle ─────────────────────────────────────────────────────────────
function setView(view) {
  currentView = view;
  const kanban = document.getElementById('kanban-board');
  const list   = document.getElementById('list-view');
  const btnK   = document.getElementById('view-kanban');
  const btnL   = document.getElementById('view-list');

  if (view === 'kanban') {
    kanban.style.display = 'grid';
    list.style.display   = 'none';
    btnK.classList.add('active');
    btnL.classList.remove('active');
  } else {
    kanban.style.display = 'none';
    list.style.display   = 'flex';
    btnK.classList.remove('active');
    btnL.classList.add('active');
  }
  renderAll();
}

// ─── Tags Input ───────────────────────────────────────────────────────────────
function renderTagsInModal() {
  const container = document.getElementById('tags-container');
  const input     = document.getElementById('tag-input');
  const badges    = currentTags.map((tag, i) => `
    <span class="tag-badge">
      #${escHtml(tag)}
      <span class="tag-badge-remove" onclick="removeTag(${i})">✕</span>
    </span>`).join('');
  container.innerHTML = badges + `<input type="text" id="tag-input" class="tags-input" placeholder="Add a tag…" onkeydown="handleTagKeydown(event)" />`;
}

function removeTag(index) {
  currentTags.splice(index, 1);
  renderTagsInModal();
}

function handleTagKeydown(e) {
  if (e.key === 'Enter') {
    e.preventDefault();
    const val = e.target.value.trim().replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 20);
    if (val && !currentTags.includes(val)) {
      currentTags.push(val);
      renderTagsInModal();
    } else {
      e.target.value = '';
    }
  } else if (e.key === 'Backspace' && e.target.value === '' && currentTags.length) {
    currentTags.pop();
    renderTagsInModal();
  }
}

// ─── Task Modal ───────────────────────────────────────────────────────────────
function openTaskModal(taskId) {
  editingTaskId = taskId || null;
  currentTags   = [];

  const modal      = document.getElementById('task-modal');
  const title      = document.getElementById('modal-title');
  const saveText   = document.getElementById('save-btn-text');
  const deleteBtn  = document.getElementById('delete-task-btn');
  const titleInput = document.getElementById('task-title');
  const descInput  = document.getElementById('task-desc');
  const statusSel  = document.getElementById('task-status');
  const prioritySel= document.getElementById('task-priority');
  const dueInput   = document.getElementById('task-due');

  // Clear errors
  document.getElementById('task-title-err').textContent = '';

  if (taskId) {
    const task = allTasks.find(t => t.id === taskId);
    if (!task) return;
    title.textContent       = 'Edit Task';
    saveText.textContent    = 'Save Changes';
    deleteBtn.style.display = 'block';
    titleInput.value        = task.title;
    descInput.value         = task.description || '';
    statusSel.value         = task.status;
    prioritySel.value       = task.priority;
    dueInput.value          = task.dueDate || '';
    currentTags             = [...(task.tags || [])];
  } else {
    title.textContent       = 'New Task';
    saveText.textContent    = 'Create Task';
    deleteBtn.style.display = 'none';
    titleInput.value        = '';
    descInput.value         = '';
    statusSel.value         = 'todo';
    prioritySel.value       = 'medium';
    dueInput.value          = '';
    currentTags             = [];
  }

  renderTagsInModal();
  modal.style.display = 'flex';
  setTimeout(() => titleInput.focus(), 100);
}

function closeTaskModal() {
  document.getElementById('task-modal').style.display = 'none';
  editingTaskId = null;
  currentTags   = [];
}

function handleModalOverlayClick(e) {
  if (e.target === document.getElementById('task-modal')) closeTaskModal();
}

async function saveTask() {
  const titleInput  = document.getElementById('task-title');
  const descInput   = document.getElementById('task-desc');
  const statusSel   = document.getElementById('task-status');
  const prioritySel = document.getElementById('task-priority');
  const dueInput    = document.getElementById('task-due');
  const saveBtn     = document.getElementById('save-task-btn');
  const saveText    = document.getElementById('save-btn-text');
  const titleErr    = document.getElementById('task-title-err');

  titleErr.textContent = '';

  const title = titleInput.value.trim();
  if (!title) {
    titleErr.textContent = 'Title is required';
    titleInput.focus();
    return;
  }

  const payload = {
    title,
    description: descInput.value.trim(),
    status:      statusSel.value,
    priority:    prioritySel.value,
    dueDate:     dueInput.value || null,
    tags:        currentTags
  };

  saveBtn.disabled    = true;
  saveText.textContent = editingTaskId ? 'Saving…' : 'Creating…';

  try {
    let result;
    if (editingTaskId) {
      result = await updateTask(editingTaskId, payload);
    } else {
      result = await createTask(payload);
    }

    if (result.success) {
      closeTaskModal();
      await fetchTasks();
      showToast(editingTaskId ? 'Task updated!' : 'Task created!', 'success');
    } else {
      showToast(result.error || 'Failed to save task', 'error');
    }
  } catch (err) {
    console.error(err);
    showToast('Connection error. Please try again.', 'error');
  } finally {
    saveBtn.disabled     = false;
    saveText.textContent = editingTaskId ? 'Save Changes' : 'Create Task';
  }
}

// ─── Delete Modal ─────────────────────────────────────────────────────────────
function confirmDeleteTask() {
  const task = allTasks.find(t => t.id === editingTaskId);
  if (!task) return;
  deletingTaskId = editingTaskId;
  document.getElementById('delete-task-name').textContent = task.title;
  document.getElementById('delete-modal').style.display   = 'flex';
}

function closeDeleteModal() {
  document.getElementById('delete-modal').style.display = 'none';
  deletingTaskId = null;
}

function handleDeleteOverlayClick(e) {
  if (e.target === document.getElementById('delete-modal')) closeDeleteModal();
}

async function executeDelete() {
  if (!deletingTaskId) return;
  const btn = document.getElementById('confirm-delete-btn');
  btn.disabled     = true;
  btn.textContent  = 'Deleting…';

  try {
    const result = await deleteTask(deletingTaskId);
    if (result.success) {
      closeDeleteModal();
      closeTaskModal();
      await fetchTasks();
      showToast('Task deleted.', 'info');
    } else {
      showToast(result.error || 'Delete failed', 'error');
    }
  } catch (err) {
    showToast('Connection error.', 'error');
  } finally {
    btn.disabled    = false;
    btn.textContent = '🗑 Yes, Delete';
  }
}

// ─── WebSocket ────────────────────────────────────────────────────────────────
function connectWebSocket() {
  const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
  const url      = `${protocol}://${location.host}`;
  const dot      = document.getElementById('ws-dot');
  const label    = document.getElementById('ws-label');

  function setStatus(state, text) {
    dot.className = `ws-dot ${state}`;
    label.textContent = text;
  }

  setStatus('connecting', 'Connecting…');

  ws = new WebSocket(url);

  ws.addEventListener('open', () => {
    setStatus('connected', 'Live');
    ws.send(JSON.stringify({ type: 'IDENTIFY', clientId: CLIENT_ID }));
  });

  ws.addEventListener('message', (e) => {
    try {
      const msg = JSON.parse(e.data);
      if (['TASK_CREATED','TASK_UPDATED','TASK_DELETED'].includes(msg.type)) {
        fetchTasks();
        const labels = { TASK_CREATED: 'Task added in another tab!', TASK_UPDATED: 'Task updated in another tab!', TASK_DELETED: 'Task deleted in another tab!' };
        showToast(labels[msg.type], 'info');
      }
    } catch {}
  });

  ws.addEventListener('close', () => {
    setStatus('disconnected', 'Offline');
    setTimeout(connectWebSocket, 3000); // auto-reconnect
  });

  ws.addEventListener('error', () => {
    setStatus('disconnected', 'Error');
  });
}

// ─── Keyboard Shortcuts ───────────────────────────────────────────────────────
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
    e.preventDefault();
    openTaskModal();
  }
  if (e.key === 'Escape') {
    closeTaskModal();
    closeDeleteModal();
    document.getElementById('user-dropdown').style.display = 'none';
  }
});

// ─── Utility ──────────────────────────────────────────────────────────────────
function escHtml(str) {
  return String(str || '')
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}

// ─── Boot ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  await loadUser();
  await fetchTasks();
  connectWebSocket();
});
