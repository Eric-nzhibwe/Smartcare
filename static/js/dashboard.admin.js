/* ============================================================
   ADMIN DASHBOARD  — v4  (health-themed UI)
   ============================================================ */

function renderAdminDashboard(d) {
  const el = document.getElementById('page-content');
  if (!el) return;

  const s      = d.stats;
  const _max   = (arr, fn) => arr.length ? arr.reduce((m, x) => Math.max(m, fn(x)), 0) || 1 : 1;
  const maxTrend = _max(d.monthly_trend       || [], t => t.cnt);
  const maxProv  = _max(d.province_dist        || [], p => p.cnt);
  const maxDiag  = _max(d.top_diagnoses        || [], x => x.cnt);
  const maxFacP  = _max(d.facility_patients    || [], x => x.cnt);
  const maxFacE  = _max(d.facility_encounters  || [], x => x.cnt);
  const maxEnc   = _max(d.enc_types            || [], x => x.cnt);
  const dq       = d.data_quality || {};
  const today    = new Date().toLocaleDateString('en-ZM', { weekday: 'long', day: 'numeric', month: 'long' });

  el.innerHTML = `

<!-- ═══ BANNER ═══ -->
<div class="dash-banner dash-banner--admin">
  <div class="dash-banner__icon"><i class="fa-solid fa-shield-halved"></i></div>
  <div class="dash-banner__body">
    <div class="dash-banner__name">System Administration</div>
    <div class="dash-banner__meta">
      <i class="fa-solid fa-location-dot fa-fw" style="opacity:.7"></i>
      Ministry of Health · Republic of Zambia &nbsp;·&nbsp; ${today}
    </div>
  </div>
  <div class="dash-banner__actions">
    <button class="btn btn-primary btn-sm" onclick="navigate('users')">
      <i class="fa-solid fa-users-gear"></i> Manage Users
    </button>
    <button class="btn btn-outline btn-sm" onclick="navigate('reports')">
      <i class="fa-solid fa-chart-bar"></i> Reports
    </button>
    <button class="ai-cta-btn" onclick="navigateAI()">
      <i class="fa-solid fa-robot"></i> AI Analytics
      <span class="ai-badge">Groq</span>
    </button>
  </div>
</div>

<!-- ═══ KPI STATS ═══ -->
<div class="stats-grid">
  <div class="stat-card primary">
    <div class="stat-top">
      <div>
        <div class="label">Total Patients</div>
        <div class="value">${s.total_patients.toLocaleString()}</div>
      </div>
      <div class="stat-icon"><i class="fa-solid fa-users"></i></div>
    </div>
    <div class="sub"><i class="fa-solid fa-arrow-trend-up fa-fw" style="color:var(--accent)"></i> +${s.new_this_week} this week</div>
  </div>
  <div class="stat-card accent">
    <div class="stat-top">
      <div>
        <div class="label">Total Encounters</div>
        <div class="value">${s.total_encounters.toLocaleString()}</div>
      </div>
      <div class="stat-icon"><i class="fa-solid fa-stethoscope"></i></div>
    </div>
    <div class="sub">All clinical visits on record</div>
  </div>
  <div class="stat-card warn">
    <div class="stat-top">
      <div>
        <div class="label">This Month</div>
        <div class="value">${s.monthly_encounters.toLocaleString()}</div>
      </div>
      <div class="stat-icon"><i class="fa-solid fa-calendar-days"></i></div>
    </div>
    <div class="sub">Encounters recorded</div>
  </div>
  <div class="stat-card danger">
    <div class="stat-top">
      <div>
        <div class="label">Today's Encounters</div>
        <div class="value">${s.today_encounters}</div>
      </div>
      <div class="stat-icon"><i class="fa-solid fa-clock-rotate-left"></i></div>
    </div>
    <div class="sub">${s.total_users} active system users</div>
  </div>
</div>

<!-- ═══ FACILITY ROW ═══ -->
<div class="grid-2 mb-4">
  <div class="card">
    <div class="card-header">
      <h3><i class="fa-solid fa-hospital" style="color:var(--primary)"></i> Patients by Facility</h3>
      <span class="badge badge-blue">${(d.facility_patients || []).length} facilities</span>
    </div>
    <div class="card-body">
      ${(d.facility_patients || []).length === 0
        ? `<div class="empty-state"><i class="fa-solid fa-hospital" style="font-size:24px;color:var(--border2);display:block;margin-bottom:8px"></i><p>No facility data yet</p></div>`
        : `<div class="bar-chart">${(d.facility_patients || []).map((f, i) => `
          <div class="bar-row">
            <div class="bar-label" title="${f.facility || 'Unknown'}">${f.facility || 'Unknown'}</div>
            <div class="bar-track"><div class="bar-fill" style="width:${Math.round((f.cnt / maxFacP) * 100)}%;transition:width .7s ${i * 0.07}s ease"></div></div>
            <div class="bar-val">${f.cnt}</div>
          </div>`).join('')}</div>`}
    </div>
  </div>
  <div class="card">
    <div class="card-header">
      <h3><i class="fa-solid fa-chart-bar" style="color:var(--accent)"></i> Encounters by Facility</h3>
    </div>
    <div class="card-body">
      ${(d.facility_encounters || []).length === 0
        ? `<div class="empty-state"><p>No encounter data yet</p></div>`
        : `<div class="bar-chart">${(d.facility_encounters || []).map((f, i) => `
          <div class="bar-row">
            <div class="bar-label" title="${f.facility || 'Unknown'}">${f.facility || 'Unknown'}</div>
            <div class="bar-track"><div class="bar-fill accent" style="width:${Math.round((f.cnt / maxFacE) * 100)}%;transition:width .7s ${i * 0.07}s ease"></div></div>
            <div class="bar-val">${f.cnt}</div>
          </div>`).join('')}</div>`}
    </div>
  </div>
</div>

<!-- ═══ TREND + ENCOUNTER TYPES ═══ -->
<div class="grid-2 mb-4">
  <div class="card">
    <div class="card-header">
      <h3><i class="fa-solid fa-chart-line" style="color:var(--primary)"></i> Monthly Encounter Trend</h3>
      <span class="badge badge-gray">6 months</span>
    </div>
    <div class="card-body">
      ${(d.monthly_trend || []).length === 0
        ? `<div class="empty-state"><p>No trend data yet</p></div>`
        : `<div class="trend-chart">
            ${(d.monthly_trend || []).map(m => `
            <div class="trend-bar" style="height:${Math.max(6, Math.round((m.cnt / maxTrend) * 64))}px">
              <div class="tip">${m.month}: ${m.cnt} encounter${m.cnt !== 1 ? 's' : ''}</div>
            </div>`).join('')}
          </div>
          <div style="display:flex;margin-top:8px">
            ${(d.monthly_trend || []).map(m => `
            <div style="flex:1;text-align:center">
              <div style="font-size:10px;color:var(--text3)">${m.month.slice(5)}</div>
              <div style="font-size:9px;color:var(--text3);font-weight:600">${m.cnt}</div>
            </div>`).join('')}
          </div>`}
    </div>
  </div>
  <div class="card">
    <div class="card-header">
      <h3><i class="fa-solid fa-clipboard-list" style="color:var(--primary)"></i> Encounter Types</h3>
      <span class="badge badge-gray">System-wide</span>
    </div>
    <div class="card-body">
      ${(d.enc_types || []).length === 0
        ? `<div class="empty-state"><p>No encounters yet</p></div>`
        : `<div class="bar-chart">${(d.enc_types || []).map(e => `
          <div class="bar-row">
            <div class="bar-label">${e.encounter_type}</div>
            <div class="bar-track"><div class="bar-fill" style="width:${Math.round((e.cnt / maxEnc) * 100)}%"></div></div>
            <div class="bar-val">${e.cnt}</div>
          </div>`).join('')}</div>`}
    </div>
  </div>
</div>

<!-- ═══ DEMOGRAPHICS ═══ -->
<div class="grid-3 mb-4">
  <div class="card">
    <div class="card-header"><h3><i class="fa-solid fa-venus-mars" style="color:var(--accent)"></i> Gender Distribution</h3></div>
    <div class="card-body">
      <div class="bar-chart">
        ${(d.gender_dist || []).map(g => `
        <div class="bar-row">
          <div class="bar-label">${g.gender || 'Unknown'}</div>
          <div class="bar-track"><div class="bar-fill accent" style="width:${s.total_patients ? Math.round((g.cnt / s.total_patients) * 100) : 0}%"></div></div>
          <div class="bar-val">${g.cnt}</div>
        </div>`).join('')}
      </div>
    </div>
  </div>
  <div class="card">
    <div class="card-header"><h3><i class="fa-solid fa-map-location-dot" style="color:var(--primary)"></i> Patients by Province</h3></div>
    <div class="card-body">
      <div class="bar-chart">
        ${(d.province_dist || []).map((p, i) => `
        <div class="bar-row">
          <div class="bar-label">${p.province || 'Unknown'}</div>
          <div class="bar-track"><div class="bar-fill" style="width:${Math.round((p.cnt / maxProv) * 100)}%;transition:width .7s ${i * 0.07}s ease"></div></div>
          <div class="bar-val">${p.cnt}</div>
        </div>`).join('')}
      </div>
    </div>
  </div>
  <div class="card">
    <div class="card-header"><h3><i class="fa-solid fa-disease" style="color:var(--warn)"></i> Top Diagnoses</h3></div>
    <div class="card-body">
      ${(d.top_diagnoses || []).length === 0
        ? `<div class="empty-state"><p>No diagnoses yet</p></div>`
        : `<div class="bar-chart">${(d.top_diagnoses || []).map((x, i) => `
          <div class="bar-row">
            <div class="bar-label" title="${x.diagnosis}">${x.diagnosis}</div>
            <div class="bar-track"><div class="bar-fill${i === 0 ? ' accent' : ''}" style="width:${Math.round((x.cnt / maxDiag) * 100)}%;transition:width .7s ${i * 0.09}s ease"></div></div>
            <div class="bar-val">${x.cnt}</div>
          </div>`).join('')}</div>`}
    </div>
  </div>
</div>

<!-- ═══ RECENT ACTIVITY ═══ -->
<div class="grid-2 mb-4">
  <div class="card">
    <div class="card-header">
      <h3><i class="fa-solid fa-user-plus" style="color:var(--primary)"></i> Recent Registrations</h3>
      <button class="btn btn-ghost btn-sm" onclick="navigate('patients')">View all →</button>
    </div>
    <div class="table-wrap"><table>
      <thead><tr><th>Patient</th><th>SmartID</th><th>Facility</th><th>Registered</th></tr></thead>
      <tbody>
        ${(d.recent_patients || []).map(p => `
        <tr style="cursor:pointer" onclick="viewPatient(${p.id})">
          <td>
            <div style="display:flex;align-items:center;gap:10px">
              <div class="user-avatar" style="width:30px;height:30px;font-size:11px;background:var(--primary-ghost);color:var(--primary)">${_aInitials(p.first_name + ' ' + p.last_name)}</div>
              <span class="patient-name">${p.first_name} ${p.last_name}</span>
            </div>
          </td>
          <td><span class="tag">${p.smart_id}</span></td>
          <td style="font-size:12px">${p.facility || '—'}</td>
          <td style="font-size:12px;white-space:nowrap">${fmtDate(p.registered_at)}</td>
        </tr>`).join('')}
      </tbody>
    </table></div>
  </div>
  <div class="card">
    <div class="card-header">
      <h3><i class="fa-solid fa-clock-rotate-left" style="color:var(--accent)"></i> Recent Encounters</h3>
      <button class="btn btn-ghost btn-sm" onclick="navigate('encounters')">View all →</button>
    </div>
    <div class="table-wrap"><table>
      <thead><tr><th>Patient</th><th>Type</th><th>Facility</th><th>Date</th></tr></thead>
      <tbody>
        ${(d.recent_encounters || []).map(e => `
        <tr>
          <td class="patient-name">${e.patient_name}</td>
          <td>${encTypeBadge(e.encounter_type)}</td>
          <td style="font-size:12px">${e.facility || '—'}</td>
          <td style="font-size:12px;white-space:nowrap">${fmtDate(e.visit_date)}</td>
        </tr>`).join('')}
      </tbody>
    </table></div>
  </div>
</div>

<!-- ═══ DATA QUALITY ═══ -->
<div class="card">
  <div class="card-header">
    <h3><i class="fa-solid fa-circle-exclamation" style="color:var(--warn)"></i> Data Quality Indicators</h3>
    <span class="badge badge-gray">System-wide</span>
  </div>
  <div class="card-body" style="padding:0">
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr">
      ${[
        { icon: 'fa-phone-slash',  bg: 'var(--danger-light)', col: 'var(--danger)', title: 'Missing Phone Numbers',   desc: 'Patients with no contact on file',              val: dq.no_phone  || 0 },
        { icon: 'fa-heart-pulse',  bg: 'var(--warn-light)',   col: 'var(--warn)',   title: 'Encounters Without Vitals', desc: 'OPD visits missing nursing triage data',        val: dq.no_vitals || 0 },
        { icon: 'fa-id-card',      bg: 'var(--primary-ghost)',col: 'var(--primary)',title: 'Missing NRC Numbers',      desc: 'Incomplete demographic records',                val: dq.no_nrc    || 0 },
      ].map((item, i) => `
      <div style="padding:20px 24px;${i < 2 ? 'border-right:1px solid var(--border)' : ''}">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px">
          <div style="width:36px;height:36px;border-radius:9px;background:${item.bg};color:${item.col};display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0">
            <i class="fa-solid ${item.icon}"></i>
          </div>
          <div>
            <div style="font-size:12px;font-weight:600;color:var(--text)">${item.title}</div>
            <div style="font-size:11px;color:var(--text3)">${item.desc}</div>
          </div>
        </div>
        <div style="font-size:32px;font-weight:700;color:${item.val > 0 ? item.col : 'var(--accent)'};letter-spacing:-1px">${item.val}</div>
        <div style="font-size:11px;color:var(--text3);margin-top:4px">${item.val === 0 ? '✓ All records complete' : 'records need attention'}</div>
      </div>`).join('')}
    </div>
  </div>
</div>`;
}

function _aInitials(name) {
  return (name || '').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}
