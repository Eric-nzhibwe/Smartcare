/**
 * app.js — SmartCare EMR
 *
 * Bootstraps the app shell (app.html):
 *  - Validates the session (redirects to login if invalid)
 *  - Renders the correct sidebar nav for the user's role
 *  - Wires up navigation, sidebar toggle, toast, and modal
 *  - Exposes shared helpers used by all dashboard/page scripts
 */

/* ── Guard: redirect to login if not authenticated ── */
if (!Auth.requireAuth()) {
  /* requireAuth() already redirected — stop execution */
  throw new Error('Unauthenticated');
}

/* ── Shared state (read by dashboard/page scripts) ── */
const currentUser = Auth.getUser();
let currentPage   = 'dashboard';

/* ── Role navigation definitions ── */
const ROLE_NAV = {
  doctor: `
    <div class="nav-section">Clinical</div>
    <div class="nav-item" data-page="dashboard"  onclick="navigate('dashboard')">
      <i class="fa-solid fa-gauge-high fa-fw"></i> Dashboard
    </div>
    <div class="nav-item" data-page="patients"   onclick="navigate('patients')">
      <i class="fa-solid fa-users fa-fw"></i> Patients
    </div>
    <div class="nav-item" data-page="encounters" onclick="navigate('encounters')">
      <i class="fa-solid fa-stethoscope fa-fw"></i> Encounters
    </div>
    <div class="nav-section">Tools</div>
    <div class="nav-item" data-page="reports"    onclick="navigate('reports')">
      <i class="fa-solid fa-chart-bar fa-fw"></i> Reports
    </div>`,

  nurse: `
    <div class="nav-section">Nursing</div>
    <div class="nav-item" data-page="dashboard"  onclick="navigate('dashboard')">
      <i class="fa-solid fa-gauge-high fa-fw"></i> Dashboard
    </div>
    <div class="nav-item" data-page="patients"   onclick="navigate('patients')">
      <i class="fa-solid fa-users fa-fw"></i> Patients
    </div>
    <div class="nav-item" data-page="encounters" onclick="navigate('encounters')">
      <i class="fa-solid fa-stethoscope fa-fw"></i> Encounters
    </div>
    <div class="nav-section">Tools</div>
    <div class="nav-item" data-page="reports"    onclick="navigate('reports')">
      <i class="fa-solid fa-chart-bar fa-fw"></i> Reports
    </div>`,

  admin: `
    <div class="nav-section">Main</div>
    <div class="nav-item" data-page="dashboard"  onclick="navigate('dashboard')">
      <i class="fa-solid fa-gauge-high fa-fw"></i> Dashboard
    </div>
    <div class="nav-item" data-page="patients"   onclick="navigate('patients')">
      <i class="fa-solid fa-users fa-fw"></i> Patients
    </div>
    <div class="nav-item" data-page="encounters" onclick="navigate('encounters')">
      <i class="fa-solid fa-stethoscope fa-fw"></i> Encounters
    </div>
    <div class="nav-section">Administration</div>
    <div class="nav-item" data-page="users"      onclick="navigate('users')">
      <i class="fa-solid fa-users-gear fa-fw"></i> Users
    </div>
    <div class="nav-item" data-page="reports"    onclick="navigate('reports')">
      <i class="fa-solid fa-chart-bar fa-fw"></i> Reports
    </div>`,
};

/* ── Page title map ── */
const PAGE_TITLES = {
  dashboard:  'Dashboard',
  patients:   'Patients',
  encounters: 'Clinical Encounters',
  reports:    'Reports & Analytics',
  users:      'User Management',
};

/* ── Shared API wrapper (delegates to Auth.apiFetch) ── */
function api(path, opts = {}) {
  return Auth.apiFetch(path, opts);
}

/* ── Bootstrap shell ── */
function _initShell() {
  const role = currentUser.role;
  const nav  = ROLE_NAV[role];
  if (!nav) {
    Auth.logout();
    return;
  }

  /* Sidebar user block */
  const sidebarAvatar = document.getElementById('sidebar-avatar');
  const sidebarName = document.getElementById('sidebar-name');
  const sidebarRole = document.getElementById('sidebar-role');
  if (sidebarAvatar) sidebarAvatar.textContent = initials(currentUser.name);
  if (sidebarName) sidebarName.textContent = currentUser.name;
  if (sidebarRole) sidebarRole.textContent = role.toUpperCase();

  /* Sidebar nav */
  const sidebarNav = document.getElementById('sidebar-nav');
  if (sidebarNav) sidebarNav.innerHTML = nav;

  /* Topbar meta */
  const topbarFacility = document.getElementById('topbar-facility');
  const topbarDate = document.getElementById('topbar-date');
  if (topbarFacility) topbarFacility.textContent = currentUser.facility || '';
  if (topbarDate) topbarDate.textContent =
    new Date().toLocaleDateString('en-ZM', {
      weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
    });

  /* Role-specific topbar controls */
  const qsWrap = document.getElementById('qs-wrap');
  const triageBtnWrap = document.getElementById('triage-btn-wrap');
  if (qsWrap) qsWrap.style.display = role === 'doctor' ? 'flex' : 'none';
  if (triageBtnWrap) triageBtnWrap.style.display = role === 'nurse' ? 'inline-flex' : 'none';

  /* Land on the dashboard */
  navigate('dashboard');
}

/* ── Navigation ── */
function navigate(page) {
  currentPage = page;

  /* Highlight active nav item */
  document.querySelectorAll('#sidebar-nav .nav-item').forEach((el) => {
    el.classList.toggle('active', el.dataset.page === page);
  });

  const pageTitle = document.getElementById('page-title');
  if (pageTitle) pageTitle.textContent = PAGE_TITLES[page] || page;

  /* Skeleton while loading — role-aware */
  const role = currentUser?.role || 'doctor';
  const pageContent = document.getElementById('page-content');
  if (pageContent) pageContent.innerHTML = _skeletonFor(page, role);

  closeSidebar();

  /* Route to the correct render function */
  const handler = PAGES[page];
  if (handler) handler();
}

/* ── Skeleton screens ── */
function _skeletonFor(page, role) {
  const pulse = `<div class="skel-pulse"></div>`;

  if (page === 'dashboard') {
    // Banner skeleton
    const banner = `<div class="skel-banner">${pulse}</div>`;

    // 4 stat cards
    const stats = `<div class="stats-grid">
      ${[0,1,2,3].map(()=>`<div class="stat-card skel-card">${pulse}<div class="skel-line skel-line--lg"></div><div class="skel-line skel-line--sm"></div></div>`).join('')}
    </div>`;

    // 2-col content rows
    const row = `<div class="grid-2 mb-4">
      <div class="card skel-card">${pulse}<div class="skel-line"></div><div class="skel-line skel-line--sm"></div><div class="skel-line"></div><div class="skel-line skel-line--sm"></div></div>
      <div class="card skel-card">${pulse}<div class="skel-line"></div><div class="skel-line skel-line--sm"></div><div class="skel-line"></div><div class="skel-line skel-line--sm"></div></div>
    </div>`;

    return banner + stats + row + row;
  }

  if (page === 'patients' || page === 'encounters') {
    const toolbar = `<div class="page-toolbar"><div class="skel-search">${pulse}</div><div class="skel-btn">${pulse}</div></div>`;
    const table   = `<div class="card skel-card">
      ${[0,1,2,3,4,5].map(()=>`<div class="skel-row">${pulse}</div>`).join('')}
    </div>`;
    return toolbar + table;
  }

  if (page === 'reports') {
    return `<div class="skel-banner">${pulse}</div>
      <div class="grid-2 mb-4">
        <div class="card skel-card">${pulse}<div class="skel-line"></div><div class="skel-line skel-line--sm"></div><div class="skel-line"></div></div>
        <div class="card skel-card">${pulse}<div class="skel-line"></div><div class="skel-line skel-line--sm"></div><div class="skel-line"></div></div>
      </div>
      <div class="card skel-card">${pulse}<div class="skel-line"></div><div class="skel-line skel-line--sm"></div></div>`;
  }

  // Generic fallback
  return `<div class="loading">
    <i class="fa-solid fa-spinner fa-spin" style="font-size:22px;color:var(--primary);display:block;margin-bottom:10px"></i>
    Loading…
  </div>`;
}

/* Page handler map — populated by each page script */
const PAGES = {
  dashboard:  () => renderDashboard(),
  patients:   () => renderPatients(),
  encounters: () => renderEncounters(),
  reports:    () => renderReports(),
  users:      () => renderUsers(),
};

/* ── Sidebar (mobile) ── */
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebar-overlay').classList.toggle('open');
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('open');
}

/* ── Toast ── */
function toast(msg, type = '') {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent  = msg;
  el.className    = `toast show${type ? ' ' + type : ''}`;
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove('show'), 3500);
}

/* ── Modal ── */
function openModal(title, body, footer = '') {
  const modalTitle = document.getElementById('modal-title');
  const modalBody = document.getElementById('modal-body');
  const modalFooter = document.getElementById('modal-footer');
  const modalOverlay = document.getElementById('modal-overlay');
  if (modalTitle) modalTitle.textContent = title;
  if (modalBody) modalBody.innerHTML = body;
  if (modalFooter) modalFooter.innerHTML = footer;
  if (modalOverlay) modalOverlay.classList.add('open');
}
function closeModal() {
  const modalOverlay = document.getElementById('modal-overlay');
  if (modalOverlay) modalOverlay.classList.remove('open');
}

/* ── Shared helpers ── */
function age(dob) {
  return Math.floor((Date.now() - new Date(dob)) / (1000 * 60 * 60 * 24 * 365.25));
}
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-ZM', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}
function initials(name) {
  return (name || '')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}
function genderBadge(g) {
  return g === 'Male'
    ? '<span class="badge badge-blue">Male</span>'
    : '<span class="badge badge-green">Female</span>';
}
function encTypeBadge(t) {
  const map = {
    OPD:         'badge-blue',
    'ART Clinic':'badge-green',
    Inpatient:   'badge-warn',
    MCH:         'badge-green',
    'TB Clinic': 'badge-warn',
    Emergency:   'badge-red',
  };
  return `<span class="badge ${map[t] || 'badge-gray'}">${t}</span>`;
}
function roleBadge(r) {
  const map = { doctor: 'badge-blue', nurse: 'badge-green', admin: 'badge-warn' };
  return `<span class="badge ${map[r] || 'badge-gray'}">${r}</span>`;
}
function toggleEnc(header) {
  const body    = header.nextElementSibling;
  const chevron = header.querySelector('.chevron');
  body.classList.toggle('open');
  if (chevron) {
    chevron.style.transform = body.classList.contains('open') ? 'rotate(180deg)' : '';
  }
}
function todayLabel() {
  return new Date().toLocaleDateString('en-ZM', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
}

/* ── Quick search (doctor topbar) ── */
function handleQuickSearch(val) {
  const box = document.getElementById('qs-results');
  if (!val || val.trim().length < 2) {
    box.style.display = 'none';
    box.innerHTML = '';
    return;
  }
  api(`/api/patients?q=${encodeURIComponent(val)}`).then((patients) => {
    if (!box) return;
    if (!patients || !patients.length) {
      box.innerHTML = `<div style="padding:14px 16px;font-size:13px;color:var(--text3)">
        <i class="fa-solid fa-magnifying-glass"></i> No patients found</div>`;
      box.style.display = 'block';
      return;
    }
    box.innerHTML = patients.slice(0, 6).map((p) => `
      <div class="qsr-item"
           onclick="viewPatient(${p.id});document.getElementById('qs-results').style.display='none'">
        <div class="qsr-avatar">${initials(p.first_name + ' ' + p.last_name)}</div>
        <div class="qsr-body">
          <div class="qsr-name">${p.first_name} ${p.last_name}</div>
          <div class="qsr-meta">${p.smart_id} · ${age(p.date_of_birth)} yrs · ${p.gender}
            ${p.allergies && p.allergies !== 'None'
              ? `<span class="badge badge-warn" style="margin-left:4px;font-size:10px">
                   <i class="fa-solid fa-triangle-exclamation"></i> ${p.allergies}
                 </span>` : ''}
          </div>
        </div>
        <button class="btn btn-primary btn-sm"
          onclick="event.stopPropagation();
                   showEncounterModal(${p.id},'${(p.first_name+' '+p.last_name).replace(/'/g,"\\'")}');
                   document.getElementById('qs-results').style.display='none'">
          <i class="fa-solid fa-stethoscope"></i>
        </button>
      </div>`).join('');
    box.style.display = 'block';
  });
}

function openQS() {
  const val = document.getElementById('qs-input').value;
  if (val && val.trim().length >= 2) handleQuickSearch(val);
}

/* Close quick-search on outside click */
document.addEventListener('click', (e) => {
  const wrap = document.getElementById('qs-wrap');
  const box  = document.getElementById('qs-results');
  if (wrap && box && !wrap.contains(e.target)) {
    box.style.display = 'none';
  }
});

/* ── Dashboard router ── */
async function renderDashboard() {
  const d = await api('/api/dashboard');
  if (!d) return;
  if (d.role === 'doctor') return renderDoctorDashboard(d);
  if (d.role === 'nurse')  return renderNurseDashboard(d);
  return renderAdminDashboard(d);
}

/* ── Logout (exposed for the sidebar button) ── */
function logout() {
  Auth.logout();
}

/* ── Init on load ── */
document.addEventListener('DOMContentLoaded', _initShell);
