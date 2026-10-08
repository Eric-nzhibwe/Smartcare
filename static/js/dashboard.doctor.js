/* ============================================================
   DOCTOR DASHBOARD  — v5  (refreshed UI)
   ============================================================ */

function renderDoctorDashboard(d) {
  const el = document.getElementById('page-content');
  if (!el) return;

  const s       = d.stats;
  const _max    = (arr, fn) => arr.length ? arr.reduce((m, x) => Math.max(m, fn(x)), 0) || 1 : 1;
  const maxTrend = _max(d.monthly_trend || [], t => t.cnt);
  const maxDiag  = _max(d.top_diagnoses || [], x => x.cnt);
  const maxType  = _max(d.enc_types     || [], x => x.cnt);
  const today    = new Date().toLocaleDateString('en-ZM', { weekday: 'long', day: 'numeric', month: 'long' });

  el.innerHTML = `

<!-- ═══ BANNER ═══ -->
<div style="background:linear-gradient(135deg,var(--primary) 0%,var(--primary-light) 100%);
            border-radius:var(--radius);padding:20px 24px;margin-bottom:20px;
            display:flex;align-items:center;gap:16px;flex-wrap:wrap;box-shadow:0 4px 16px rgba(15,76,129,.25)">
  <div style="width:48px;height:48px;border-radius:12px;background:rgba(255,255,255,.15);
              display:flex;align-items:center;justify-content:center;font-size:22px;color:#fff;flex-shrink:0">
    <i class="fa-solid fa-user-doctor"></i>
  </div>
  <div style="flex:1;min-width:0">
    <div style="font-size:16px;font-weight:600;color:#fff;letter-spacing:-.2px">${d.clinician_name}</div>
    <div style="font-size:12px;color:rgba(255,255,255,.65);margin-top:2px">
      <i class="fa-solid fa-hospital fa-fw" style="opacity:.7"></i>
      ${d.facility} &nbsp;·&nbsp; ${today}
    </div>
  </div>
  <div style="display:flex;gap:8px;flex-wrap:wrap">
    <button class="btn btn-sm" style="background:rgba(255,255,255,.15);color:#fff;border:1px solid rgba(255,255,255,.25)"
            onclick="showEncounterModalSearch()">
      <i class="fa-solid fa-stethoscope"></i> New Encounter
    </button>
    <button class="btn btn-sm" style="background:rgba(255,255,255,.15);color:#fff;border:1px solid rgba(255,255,255,.25)"
            onclick="navigate('patients')">
      <i class="fa-solid fa-users"></i> My Patients
    </button>
    <button class="ai-cta-btn btn-sm" onclick="navigateAI()">
      <i class="fa-solid fa-robot"></i> AI Assistant
      <span class="ai-badge">Groq</span>
    </button>
  </div>
</div>

<!-- ═══ KPI STRIP ═══ -->
<div class="kpi-strip">
  <div class="kpi-strip-item">
    <div style="display:flex;align-items:center;justify-content:center;gap:8px">
      <div style="width:30px;height:30px;border-radius:8px;background:var(--primary-ghost);color:var(--primary);display:flex;align-items:center;justify-content:center;font-size:13px">
        <i class="fa-solid fa-users"></i>
      </div>
      <div class="ksi-val">${s.total_my_patients}</div>
    </div>
    <div class="ksi-label">My Patients</div>
    <div class="ksi-sub">Unique patients seen</div>
  </div>
  <div class="kpi-strip-item">
    <div style="display:flex;align-items:center;justify-content:center;gap:8px">
      <div style="width:30px;height:30px;border-radius:8px;background:var(--accent-light);color:var(--accent);display:flex;align-items:center;justify-content:center;font-size:13px">
        <i class="fa-solid fa-stethoscope"></i>
      </div>
      <div class="ksi-val">${s.total_my_encounters}</div>
    </div>
    <div class="ksi-label">My Encounters</div>
    <div class="ksi-sub">${s.today_my_encounters} today · ${s.monthly_my_encounters} this month</div>
  </div>
  <div class="kpi-strip-item">
    <div style="display:flex;align-items:center;justify-content:center;gap:8px">
      <div style="width:30px;height:30px;border-radius:8px;background:var(--warn-light);color:var(--warn);display:flex;align-items:center;justify-content:center;font-size:13px">
        <i class="fa-solid fa-calendar-check"></i>
      </div>
      <div class="ksi-val">${s.upcoming_followups}</div>
    </div>
    <div class="ksi-label">Upcoming Follow-ups</div>
    <div class="ksi-sub">Next 14 days</div>
  </div>
  <div class="kpi-strip-item">
    <div style="display:flex;align-items:center;justify-content:center;gap:8px">
      <div style="width:30px;height:30px;border-radius:8px;background:var(--danger-light);color:var(--danger);display:flex;align-items:center;justify-content:center;font-size:13px">
        <i class="fa-solid fa-circle-exclamation"></i>
      </div>
      <div class="ksi-val" style="${s.overdue_followups > 0 ? 'color:var(--danger)' : ''}">${s.overdue_followups}</div>
    </div>
    <div class="ksi-label">Overdue Follow-ups</div>
    <div class="ksi-sub">${s.overdue_followups > 0
      ? '<span style="color:var(--danger)">Needs attention</span>'
      : '<span style="color:var(--accent)">All on schedule</span>'}</div>
  </div>
</div>

<!-- ═══ OVERDUE ALERT ═══ -->
${(d.overdue_followups || []).length === 0 ? '' : `
<div class="alert-banner mb-4">
  <i class="fa-solid fa-triangle-exclamation"></i>
  <div class="alert-banner-body">
    <div class="alert-banner-title">Overdue Follow-ups — Action Required</div>
    <div class="alert-banner-sub">${d.overdue_followups.length} patient${d.overdue_followups.length !== 1 ? 's' : ''} have missed their follow-up dates</div>
  </div>
  <button class="btn btn-sm" style="background:var(--danger);color:#fff;flex-shrink:0"
          onclick="document.getElementById('overdue-table').scrollIntoView({behavior:'smooth'})">
    View <i class="fa-solid fa-arrow-down"></i>
  </button>
</div>
<div class="card mb-4" id="overdue-table">
  <div class="card-icon-header">
    <div class="chi-icon" style="background:var(--danger-light);color:var(--danger)">
      <i class="fa-solid fa-clock-rotate-left"></i>
    </div>
    <h3 style="color:var(--danger)">Overdue Follow-ups</h3>
    <div class="chi-right">
      <span class="badge badge-red">${d.overdue_followups.length} patient${d.overdue_followups.length !== 1 ? 's' : ''}</span>
    </div>
  </div>
  <div class="table-wrap"><table>
    <thead><tr><th>Patient</th><th>SmartID</th><th>Was Due</th><th>Last Diagnosis</th><th>Days Overdue</th></tr></thead>
    <tbody>
      ${d.overdue_followups.map(f => `
      <tr style="cursor:pointer" onclick="viewPatient(${f.patient_id})">
        <td>
          <div style="display:flex;align-items:center;gap:10px">
            <div class="user-avatar" style="width:30px;height:30px;font-size:11px;background:#fecaca;color:var(--danger)">${_drInitials(f.patient_name)}</div>
            <span class="patient-name">${f.patient_name}</span>
          </div>
        </td>
        <td><span class="tag">${f.smart_id}</span></td>
        <td style="color:var(--danger);font-size:12px">${fmtDate(f.follow_up_date)}</td>
        <td style="font-size:12px;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${f.last_diagnosis || '—'}</td>
        <td><span class="badge badge-red"><i class="fa-solid fa-clock"></i> ${f.days_overdue}d overdue</span></td>
      </tr>`).join('')}
    </tbody>
  </table></div>
</div>`}

<!-- ═══ FOLLOW-UPS + WORKLOAD ═══ -->
<div class="grid-2 mb-4">
  <div class="card">
    <div class="card-icon-header">
      <div class="chi-icon" style="background:var(--accent-light);color:var(--accent)">
        <i class="fa-solid fa-calendar-check"></i>
      </div>
      <h3>Upcoming Follow-ups</h3>
      <div class="chi-right">
        <span class="badge badge-blue">${s.upcoming_followups} in 14 days</span>
      </div>
    </div>
    <div class="table-wrap"><table>
      <thead><tr><th>Patient</th><th>SmartID</th><th>Due</th><th>Last Diagnosis</th></tr></thead>
      <tbody>
        ${(d.upcoming_followups || []).length === 0
          ? `<tr><td colspan="4"><div class="empty-state">
               <i class="fa-solid fa-calendar-check" style="font-size:24px;color:var(--accent);display:block;margin-bottom:8px"></i>
               <p>No upcoming follow-ups</p></div></td></tr>`
          : d.upcoming_followups.map(f => `
          <tr style="cursor:pointer" onclick="viewPatient(${f.patient_id})">
            <td class="patient-name">${f.patient_name}</td>
            <td><span class="tag">${f.smart_id}</span></td>
            <td>
              <span class="badge ${f.days_away === 0 ? 'badge-warn' : f.days_away <= 3 ? 'badge-warn' : 'badge-blue'}">
                ${f.days_away === 0 ? '<i class="fa-solid fa-star"></i> Today'
                  : f.days_away === 1 ? 'Tomorrow' : 'In ' + f.days_away + 'd'}
              </span>
            </td>
            <td style="font-size:12px;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${f.last_diagnosis || '—'}</td>
          </tr>`).join('')}
      </tbody>
    </table></div>
  </div>

  <div class="card">
    <div class="card-icon-header">
      <div class="chi-icon" style="background:var(--primary-ghost);color:var(--primary)">
        <i class="fa-solid fa-chart-line"></i>
      </div>
      <h3>My 6-Month Workload</h3>
    </div>
    <div class="card-body">
      ${(d.monthly_trend || []).length === 0
        ? `<div class="empty-state"><p>No encounter data yet</p></div>`
        : `<div class="spark-bars">
            ${d.monthly_trend.map(m => `
            <div class="spark-bar" title="${m.month}: ${m.cnt}"
                 style="height:${Math.max(8, Math.round((m.cnt / maxTrend) * 100))}%;background:var(--primary)"></div>
            `).join('')}
          </div>
          <div class="spark-labels">
            ${d.monthly_trend.map(m => `<span class="spark-label">${m.month.slice(5)}<br><b style="color:var(--text)">${m.cnt}</b></span>`).join('')}
          </div>`}
    </div>
  </div>
</div>

<!-- ═══ DIAGNOSES + ENC TYPES ═══ -->
<div class="grid-2 mb-4">
  <div class="card">
    <div class="card-icon-header">
      <div class="chi-icon" style="background:var(--warn-light);color:var(--warn)">
        <i class="fa-solid fa-disease"></i>
      </div>
      <h3>My Top Diagnoses</h3>
    </div>
    <div class="card-body">
      ${(d.top_diagnoses || []).length === 0
        ? `<div class="empty-state"><p>No diagnoses recorded yet</p></div>`
        : `<div class="bar-chart">${d.top_diagnoses.map((x, i) => `
          <div class="bar-row">
            <div class="bar-label" title="${x.diagnosis}">${x.diagnosis}</div>
            <div class="bar-track">
              <div class="bar-fill${i === 0 ? ' accent' : ''}"
                   style="width:${Math.round((x.cnt / maxDiag) * 100)}%;transition:width .7s ${i * 0.09}s ease"></div>
            </div>
            <div class="bar-val">${x.cnt}</div>
          </div>`).join('')}</div>`}
    </div>
  </div>
  <div class="card">
    <div class="card-icon-header">
      <div class="chi-icon" style="background:var(--primary-ghost);color:var(--primary)">
        <i class="fa-solid fa-clipboard-list"></i>
      </div>
      <h3>Encounter Breakdown</h3>
    </div>
    <div class="card-body">
      ${(d.enc_types || []).length === 0
        ? `<div class="empty-state"><p>No encounters yet</p></div>`
        : `<div class="bar-chart">${d.enc_types.map(e => `
          <div class="bar-row">
            <div class="bar-label">${e.encounter_type}</div>
            <div class="bar-track">
              <div class="bar-fill" style="width:${Math.round((e.cnt / maxType) * 100)}%"></div>
            </div>
            <div class="bar-val">${e.cnt}</div>
          </div>`).join('')}</div>`}
    </div>
  </div>
</div>

<!-- ═══ RECENT ENCOUNTERS + PATIENTS ═══ -->
<div class="grid-2 mb-4">
  <div class="card">
    <div class="card-icon-header">
      <div class="chi-icon" style="background:var(--primary-ghost);color:var(--primary)">
        <i class="fa-solid fa-clock-rotate-left"></i>
      </div>
      <h3>My Recent Encounters</h3>
      <div class="chi-right">
        <button class="btn btn-ghost btn-sm" onclick="navigate('encounters')">View all →</button>
      </div>
    </div>
    <div class="table-wrap"><table>
      <thead><tr><th>Patient</th><th>Type</th><th>Diagnosis / Complaint</th><th>Date</th></tr></thead>
      <tbody>
        ${(d.recent_encounters || []).length === 0
          ? `<tr><td colspan="4"><div class="empty-state"><p>No encounters recorded yet</p></div></td></tr>`
          : d.recent_encounters.map(e => `
          <tr style="cursor:pointer" onclick="viewPatient(${e.patient})">
            <td>
              <div style="display:flex;align-items:center;gap:10px">
                <div class="user-avatar" style="width:30px;height:30px;font-size:11px;background:var(--primary-ghost);color:var(--primary)">${_drInitials(e.patient_name)}</div>
                <span class="patient-name">${e.patient_name}</span>
              </div>
            </td>
            <td>${encTypeBadge(e.encounter_type)}</td>
            <td style="font-size:12px;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
              ${e.diagnosis || e.chief_complaint || '<span style="color:var(--text3)">—</span>'}
            </td>
            <td style="font-size:12px;white-space:nowrap">${fmtDate(e.visit_date)}</td>
          </tr>`).join('')}
      </tbody>
    </table></div>
  </div>

  <div class="card">
    <div class="card-icon-header">
      <div class="chi-icon" style="background:var(--accent-light);color:var(--accent)">
        <i class="fa-solid fa-user-plus"></i>
      </div>
      <h3>Recent Patients — ${d.facility}</h3>
      <div class="chi-right">
        <button class="btn btn-ghost btn-sm" onclick="navigate('patients')">View all →</button>
      </div>
    </div>
    <div class="table-wrap"><table>
      <thead><tr><th>Patient</th><th>SmartID</th><th>Age/Gender</th><th>Registered</th></tr></thead>
      <tbody>
        ${(d.recent_patients || []).length === 0
          ? `<tr><td colspan="4"><div class="empty-state"><p>No recent registrations</p></div></td></tr>`
          : d.recent_patients.map(p => `
          <tr style="cursor:pointer" onclick="viewPatient(${p.id})">
            <td>
              <div style="display:flex;align-items:center;gap:10px">
                <div class="user-avatar" style="width:30px;height:30px;font-size:11px;background:var(--primary-ghost);color:var(--primary)">${_drInitials(p.first_name + ' ' + p.last_name)}</div>
                <span class="patient-name">${p.first_name} ${p.last_name}</span>
              </div>
            </td>
            <td><span class="tag">${p.smart_id}</span></td>
            <td style="font-size:12px">${age(p.date_of_birth)}y · ${p.gender === 'Male' ? 'M' : 'F'}</td>
            <td style="font-size:12px;white-space:nowrap">${fmtDate(p.registered_at)}</td>
          </tr>`).join('')}
      </tbody>
    </table></div>
  </div>
</div>`;
}

function _drInitials(name) {
  return (name || '').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}
