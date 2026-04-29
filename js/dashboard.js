const BASE_URL = 'https://hngintern-production-7bfd.up.railway.app/api/v1';

// ── State ──────────────────────────────────────────────────────────────────
let state = {
  page: 1,
  limit: 10,
  sort: '-created_at',
  gender: '',
  age_group: '',
  country_id: '',
  search: '',
  isSearchMode: false,
  totalPages: 1,
  total: 0,
};

// ── API helper ─────────────────────────────────────────────────────────────
async function api(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    credentials: 'include', // sends httpOnly cookies automatically
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });

  if (res.status === 401) {
    // Try refreshing first
    const refreshed = await tryRefresh();
    if (!refreshed) {
      window.location.href = '/index.html';
      return null;
    }
    // Retry original request
    return api(path, options);
  }

  return res;
}

async function tryRefresh() {
  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}), // server reads from cookie
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ── Toast ──────────────────────────────────────────────────────────────────
function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast ${type} show`;
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 3500);
}

// ── Init ───────────────────────────────────────────────────────────────────
async function init() {
  await loadUser();
  await loadProfiles();
}

// ── GET /auth/me ───────────────────────────────────────────────────────────
async function loadUser() {
  try {
    const res = await api('/auth/me');
    if (!res || !res.ok) return;
    const { data } = await res.json();

    document.getElementById('username-display').textContent =
      data.username || data.email || 'user';

    const badge = document.getElementById('role-badge');
    badge.textContent = data.role;
    badge.className = `role-badge ${data.role}`;

    if (data.role === 'admin') {
      document.body.classList.add('is-admin');
    }
  } catch (e) {
    console.error('loadUser error', e);
  }
}

// ── GET /profiles ──────────────────────────────────────────────────────────
async function loadProfiles() {
  setTableLoading();

  const params = new URLSearchParams({
    page: state.page,
    limit: state.limit,
    sort: state.sort,
  });
  if (state.gender) params.set('gender', state.gender);
  if (state.age_group) params.set('age_group', state.age_group);
  if (state.country_id) params.set('country_id', state.country_id);

  try {
    const res = await api(`/profiles?${params}`);
    if (!res || !res.ok) {
      showToast('Failed to load profiles', 'error');
      return;
    }
    const json = await res.json();
    renderTable(json.data || json.profiles || []);
    updatePagination(json);
  } catch (e) {
    showToast('Network error', 'error');
    console.error(e);
  }
}

// ── GET /profiles/search ───────────────────────────────────────────────────
async function applySearch() {
  const q = document.getElementById('search-input').value.trim();
  if (!q) {
    state.isSearchMode = false;
    applyFilters();
    return;
  }

  state.isSearchMode = true;
  state.page = 1;
  setTableLoading();

  try {
    const res = await api(
      `/profiles/search?q=${encodeURIComponent(q)}&page=${state.page}&limit=${state.limit}`
    );
    if (!res || !res.ok) {
      showToast('Search failed', 'error');
      return;
    }
    const json = await res.json();

    if (json.interpreted) {
      showToast(`Interpreted: ${JSON.stringify(json.interpreted)}`, 'success');
    }
    renderTable(json.data || []);
    updatePagination(json);
  } catch (e) {
    showToast('Network error', 'error');
    console.error(e);
  }
}

// ── GET /profiles/:id ──────────────────────────────────────────────────────
async function viewProfile(id) {
  try {
    const res = await api(`/profiles/${id}`);
    if (!res || !res.ok) {
      showToast('Could not load profile', 'error');
      return;
    }
    const json = await res.json();
    const p = json.data || json;
    openDetail(p);
  } catch (e) {
    showToast('Network error', 'error');
  }
}

// ── POST /profiles ─────────────────────────────────────────────────────────
async function createProfile() {
  const body = {
    first_name: document.getElementById('new-fname').value.trim(),
    last_name: document.getElementById('new-lname').value.trim(),
    gender: document.getElementById('new-gender').value,
    age_group: document.getElementById('new-age_group').value,
    age: Number(document.getElementById('new-age').value),
    country_id: document
      .getElementById('new-country_id')
      .value.trim()
      .toUpperCase(),
    gender_probability: Number(
      document.getElementById('new-gender_probability').value
    ),
    country_probability: Number(
      document.getElementById('new-country_probability').value
    ),
  };

  try {
    const res = await api('/profiles', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    if (!res) return;
    if (!res.ok) {
      const err = await res.json();
      showToast(err.message || 'Create failed', 'error');
      return;
    }
    showToast('Profile created ✓', 'success');
    closeCreateModal();
    loadProfiles();
  } catch (e) {
    showToast('Network error', 'error');
  }
}

// ── DELETE /profiles/:id ───────────────────────────────────────────────────
async function deleteProfile(id) {
  if (!confirm(`Delete profile ${id}? This cannot be undone.`)) return;
  try {
    const res = await api(`/profiles/${id}`, { method: 'DELETE' });
    if (!res) return;
    if (!res.ok) {
      showToast('Delete failed', 'error');
      return;
    }
    showToast('Profile deleted', 'success');
    loadProfiles();
  } catch (e) {
    showToast('Network error', 'error');
  }
}

// ── GET /profiles/export ───────────────────────────────────────────────────
async function exportCSV() {
  showToast('Preparing export…', 'success');
  try {
    const res = await api('/profiles/export');
    if (!res || !res.ok) {
      showToast('Export failed — admin only', 'error');
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `insighta_export_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Export downloaded ✓', 'success');
  } catch (e) {
    showToast('Network error', 'error');
  }
}

// ── POST /auth/logout ──────────────────────────────────────────────────────
async function logout() {
  try {
    await api('/auth/logout', { method: 'POST', body: JSON.stringify({}) });
  } finally {
    window.location.href = '/index.html';
  }
}

// ── Filters & Pagination ───────────────────────────────────────────────────
function applyFilters() {
  state.gender = document.getElementById('filter-gender').value;
  state.age_group = document.getElementById('filter-age_group').value;
  state.country_id = document.getElementById('filter-country_id').value;
  state.sort = document.getElementById('filter-sort').value;
  state.limit = Number(document.getElementById('filter-limit').value);
  state.page = 1;
  state.isSearchMode = false;
  loadProfiles();
}

function clearAll() {
  document.getElementById('search-input').value = '';
  document.getElementById('filter-gender').value = '';
  document.getElementById('filter-age_group').value = '';
  document.getElementById('filter-country_id').value = '';
  document.getElementById('filter-sort').value = '-created_at';
  document.getElementById('filter-limit').value = '10';
  state = {
    ...state,
    page: 1,
    sort: '-created_at',
    gender: '',
    age_group: '',
    country_id: '',
    search: '',
    isSearchMode: false,
  };
  loadProfiles();
}

function prevPage() {
  if (state.page <= 1) return;
  state.page--;
  state.isSearchMode ? applySearch() : loadProfiles();
}

function nextPage() {
  if (state.page >= state.totalPages) return;
  state.page++;
  state.isSearchMode ? applySearch() : loadProfiles();
}

// ── Render ─────────────────────────────────────────────────────────────────
function setTableLoading() {
  document.getElementById('profiles-body').innerHTML =
    '<tr><td colspan="9" class="loading">Fetching profiles</td></tr>';
}

function renderTable(profiles) {
  const tbody = document.getElementById('profiles-body');
  if (!profiles.length) {
    tbody.innerHTML =
      '<tr><td colspan="9" class="empty">No profiles found</td></tr>';
    return;
  }

  tbody.innerHTML = profiles
    .map((p) => {
      const genderClass = p.gender === 'female' ? 'female' : 'male';
      const gProb = Math.round((p.gender_probability || 0) * 100);
      const cProb = Math.round((p.country_probability || 0) * 100);
      const shortId = String(p._id || p.id || '').slice(-6);
      const isAdmin = document.body.classList.contains('is-admin');

      return `
      <tr>
        <td style="color:var(--muted);font-size:10px">...${shortId}</td>
        <td>${p.first_name || ''} ${p.last_name || ''}</td>
        <td><span class="gender-badge ${genderClass}">${p.gender || '—'}</span></td>
        <td><span class="age-group">${p.age_group || '—'}</span></td>
        <td>${p.age || '—'}</td>
        <td>${p.country_id || '—'}</td>
        <td>
          ${gProb}%
          <span class="prob-bar"><span class="prob-fill" style="width:${gProb}%"></span></span>
        </td>
        <td>
          ${cProb}%
          <span class="prob-bar"><span class="prob-fill" style="width:${cProb}%"></span></span>
        </td>
        <td>
          <button class="action-btn" onclick="viewProfile('${p._id || p.id}')">View</button>
          ${isAdmin ? `<button class="action-btn del" onclick="deleteProfile('${p._id || p.id}')">Delete</button>` : ''}
        </td>
      </tr>`;
    })
    .join('');
}

function updatePagination(json) {
  const total = json.total || 0;
  const totalPages = json.totalPages || 1;
  const page = json.page || state.page;
  const shown = json.data?.length || json.profiles?.length || 0;

  state.totalPages = totalPages;

  document.getElementById('stat-total').textContent = total;
  document.getElementById('stat-page').textContent = page;
  document.getElementById('stat-pages').textContent = totalPages;
  document.getElementById('stat-shown').textContent = shown;
  document.getElementById('page-info').textContent =
    `Page ${page} of ${totalPages}`;

  document.getElementById('btn-prev').disabled = page <= 1;
  document.getElementById('btn-next').disabled = page >= totalPages;
}

// ── Detail Panel ───────────────────────────────────────────────────────────
function openDetail(p) {
  const panel = document.getElementById('detail-panel');
  const isAdmin = document.body.classList.contains('is-admin');
  document.getElementById('detail-content').innerHTML = `
    <div style="margin-bottom:24px">
      <div class="detail-label">Full Name</div>
      <div class="detail-value" style="font-family:'Syne',sans-serif;font-size:20px;font-weight:700">
        ${p.first_name || ''} ${p.last_name || ''}
      </div>
    </div>
    <div class="detail-label">Profile ID</div>
    <div class="detail-value" style="color:var(--muted);font-size:11px">${p._id || p.id}</div>
    <div class="detail-divider"></div>
    <div class="detail-label">Gender</div>
    <div class="detail-value">${p.gender || '—'} <span style="color:var(--muted);font-size:11px">(${Math.round((p.gender_probability || 0) * 100)}% confidence)</span></div>
    <div class="detail-label">Age</div>
    <div class="detail-value">${p.age || '—'} <span style="color:var(--muted);font-size:11px">(${p.age_group || ''})</span></div>
    <div class="detail-label">Country</div>
    <div class="detail-value">${p.country_id || '—'} <span style="color:var(--muted);font-size:11px">(${Math.round((p.country_probability || 0) * 100)}% confidence)</span></div>
    <div class="detail-divider"></div>
    <div class="detail-label">Created At</div>
    <div class="detail-value" style="color:var(--muted);font-size:11px">${p.created_at ? new Date(p.created_at).toLocaleString() : '—'}</div>
    ${
      isAdmin
        ? `
    <div class="detail-divider"></div>
    <button class="btn-danger" style="width:100%" onclick="deleteProfile('${p._id || p.id}');closeDetail()">Delete Profile</button>
    `
        : ''
    }
  `;
  panel.classList.add('open');
}

function closeDetail() {
  document.getElementById('detail-panel').classList.remove('open');
}

// ── Create Modal ───────────────────────────────────────────────────────────
function openCreateModal() {
  document.getElementById('create-modal').classList.add('open');
}
function closeCreateModal() {
  document.getElementById('create-modal').classList.remove('open');
}

// ── Boot ───────────────────────────────────────────────────────────────────
init();
