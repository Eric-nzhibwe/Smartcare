// ── NURSE DASHBOARD ──────────────────────────────────────────────────────────
function renderNurseDashboard(d) {
  const s = d.stats;
  const pc = document.getElementById('page-content');
  pc.innerHTML = `
  <div id="triage-mode-bar" class="triage-mode-bar">
    <div class="tm-info">
      <h4><i class="fa-solid fa-bolt"></i> Batch Triage Mode — Active</h4>
      <p>Cycling through patients with pending vitals. Submit to advance to the next.</p>
      <div class="progress-bar"><div class="progress-fill" id="triage-progress"></div></div>
    </div>
    <div class="tm-actions">
      <span style="color:rgba(255,255,255,.75);font-size:13px;align-self:center" id="triage-counter">Patient 1 of …</span>
      <button class="btn btn-sm" style="border:1px solid rgba(255,255,255,.4);color:#fff;background:rgba(255,255,255,.1)" onclick="triageNext()"><i class="fa-solid fa-forward-step"></i> Skip</button>
      <button class="btn btn-sm" style="background:#fff;color:var(--primary);font-weight:600" onclick="toggleTriageMode()"><i class="fa-solid fa-xmark"></i> Exit</button>
    </div>
  </div>
  <div style="display:flex;align-items:center;gap:16px;background:#fff;border-radius:var(--radius);padding:14px 18px;margin-bottom:20px;border:1px solid var(--border);box-shadow:var(--shadow);flex-wrap:wrap">
    <div style="width:44px;height:44px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px;background:var(--accent-light);color:var(--accent);flex-shrink:0"><i class="fa-solid fa-user-nurse"></i></div>
    <div style="flex:1;min-width:0">
      <div style="font-size:15px;font-weight:600;letter-spacing:-.2px">${d.nurse_name||currentUser.name}</div>
      <div style="font-size:12px;color:var(--text3);margin-top:2px">${d.facility||currentUser.facility} · Nursing Station</div>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn btn-primary btn-sm" onclick="showRegisterModal()"><i class="fa-solid fa-user-plus"></i> Register Patient</button>
      <button class="btn btn-accent btn-sm" onclick="toggleTriageMode()"><i class="fa-solid fa-heart-pulse"></i> Triage Mode</button>
    </div>
  </div>
  <div class="stats-grid">
    <div class="stat-card primary"><div class="label"><i class="fa-solid fa-users fa-fw"></i> Facility Patients</div><div class="value">${s.total_patients}</div><div class="sub">+${s.registered_week} this week</div></div>
    <div class="stat-card accent"><div class="label"><i class="fa-solid fa-stethoscope fa-fw"></i> Encounters Today</div><div class="value">${s.encounters_today}</div><div class="sub">${s.registered_today} new registration${s.registered_today!==1?'s':''}</div></div>
    <div class="stat-card warn"><div class="label"><i class="fa-solid fa-heart-pulse fa-fw"></i> Vitals Pending</div><div class="value">${s.vitals_pending}</div><div class="sub">Patients not yet triaged</div></div>
    <div class="stat-card danger"><div class="label"><i class="fa-solid fa-triangle-exclamation fa-fw"></i> Allergy Alerts</div><div class="value">${s.allergy_count}</div><div class="sub">Known allergies on file</div></div>
  </div>
  <div id="vitals-panel" style="display:none" class="card mb-4" style="border:2px solid var(--accent)">
    <div class="card-header" style="background:var(--accent-light)">
      <div><h3 style="color:var(--accent)"><i class="fa-solid fa-heart-pulse fa-fw"></i> Quick Vitals — <span id="vp-name"></span></h3>
        <div style="font-size:12px;color:var(--text3);margin-top:2px" id="vp-sub"></div></div>
      <button class="btn btn-ghost btn-sm" onclick="closeVitalsPanel()"><i class="fa-solid fa-xmark"></i></button>
    </div>
    <div class="vitals-strip">
      <div class="vs-field"><div class="vs-label"><i class="fa-solid fa-thermometer-half" style="color:var(--danger)"></i> Temp °C</div><input class="vs-input" id="vp-temp" type="number" step="0.1" placeholder="37.0" inputmode="decimal"></div>
      <div class="vs-field"><div class="vs-label"><i class="fa-solid fa-heart" style="color:var(--danger)"></i> Pulse bpm</div><input class="vs-input" id="vp-pulse" type="number" placeholder="80" inputmode="numeric"></div>
      <div class="vs-field"><div class="vs-label"><i class="fa-solid fa-gauge" style="color:var(--primary)"></i> Blood Press.</div><input class="vs-input" id="vp-bp" placeholder="120/80"></div>
      <div class="vs-field"><div class="vs-label"><i class="fa-solid fa-weight-scale" style="color:var(--accent)"></i> Weight kg</div><input class="vs-input" id="vp-weight" type="number" step="0.1" placeholder="65" inputmode="decimal"></div>
      <div class="vs-field"><div class="vs-label"><i class="fa-solid fa-ruler-vertical" style="color:var(--accent)"></i> Height cm</div><input class="vs-input" id="vp-height" type="number" placeholder="165" inputmode="numeric"></div>
      <div class="vs-field"><div class="vs-label"><i class="fa-solid fa-lungs" style="color:var(--primary)"></i> SpO₂ %</div><input class="vs-input" id="vp-spo2" type="number" placeholder="98" inputmode="numeric"></div>
    </div>
    <div style="padding:12px 18px;display:flex;gap:10px;align-items:center;border-top:1px solid var(--border);flex-wrap:wrap">
      <button class="btn btn-accent" onclick="saveVitalsAndNext()"><i class="fa-solid fa-floppy-disk"></i> Save &amp; Next</button>
      <button class="btn btn-outline btn-sm" onclick="closeVitalsPanel()">Cancel</button>
      <span style="font-size:12px;color:var(--text3);margin-left:auto" id="vp-queue-info"></span>
    </div>
  </div>
  <div class="grid-2 mb-4">
    ${_nurseTodayQueue(d.todays_queue)}
    ${_nurseFollowupsCard(d.upcoming_followups, d.overdue_followups)}
  </div>
  ${_nurseAllergyCard(d.allergy_patients)}`;

  // store triage queue in state
  _nurseTriageQueue = d.todays_queue.filter(e => !e.has_vitals);
  _nurseTriageIdx = 0;
}

let _nurseTriageQueue = [];
let _nurseTriageIdx = 0;
let _triageModeOn = false;

function toggleTriageMode() {
  _triageModeOn = !_triageModeOn;
  _nurseTriageIdx = 0;
  const bar = document.getElementById('triage-mode-bar');
  if (!bar) return;
  if (_triageModeOn && _nurseTriageQueue.length) {
    bar.classList.add('active');
    _openVitalsForIdx(0);
  } else {
    bar.classList.remove('active');
    closeVitalsPanel();
    _triageModeOn = false;
  }
}

function triageNext() {
  _nurseTriageIdx = Math.min(_nurseTriageIdx + 1, _nurseTriageQueue.length - 1);
  _openVitalsForIdx(_nurseTriageIdx);
}

function _openVitalsForIdx(idx) {
  const q = _nurseTriageQueue;
  if (!q.length) return;
  const p = q[idx];
  document.getElementById('vp-name').textContent = p.patient_name;
  document.getElementById('vp-sub').textContent =
    `${p.smart_id} · ${p.age} yrs · ${p.has_allergy ? '⚠ '+p.allergies : 'No known allergies'}`;
  document.getElementById('vp-queue-info').textContent =
    `${q.length - idx - 1} more pending after this`;
  ['vp-temp','vp-pulse','vp-bp','vp-weight','vp-height','vp-spo2'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  const panel = document.getElementById('vitals-panel');
  if (panel) { panel.style.display = 'block'; panel.scrollIntoView({behavior:'smooth',block:'center'}); }
  const pct = Math.round(((idx+1)/q.length)*100);
  const prog = document.getElementById('triage-progress');
  if (prog) prog.style.width = pct + '%';
  const ctr = document.getElementById('triage-counter');
  if (ctr) ctr.textContent = `Patient ${idx+1} of ${q.length}`;
}

function openVitalsPanel(name, encId) {
  const p = _nurseTriageQueue.find(x=>x.patient_name===name)||{smart_id:'',allergies:''};
  document.getElementById('vp-name').textContent = name;
  document.getElementById('vp-sub').textContent = `${p.smart_id} ${p.has_allergy?'· ⚠ '+p.allergies:''}`;
  ['vp-temp','vp-pulse','vp-bp','vp-weight','vp-height','vp-spo2'].forEach(id=>{
    const el=document.getElementById(id); if(el) el.value='';
  });
  const panel=document.getElementById('vitals-panel');
  if (panel) { panel.style.display='block'; panel.scrollIntoView({behavior:'smooth',block:'center'}); }
  document.getElementById('vp-queue-info').textContent='';
  // store encounter id for PATCH
  if (panel) panel.dataset.encId = encId||'';
}

function closeVitalsPanel() {
  const panel = document.getElementById('vitals-panel');
  if (panel) panel.style.display = 'none';
}

async function saveVitalsAndNext() {
  const panel = document.getElementById('vitals-panel');
  const encId = panel ? panel.dataset.encId : null;
  const temp  = document.getElementById('vp-temp').value;
  const pulse = document.getElementById('vp-pulse').value;
  const bp    = document.getElementById('vp-bp').value;
  const weight = document.getElementById('vp-weight').value;
  const height = document.getElementById('vp-height').value;
  const spo2  = document.getElementById('vp-spo2').value;
  if (!temp && !pulse && !bp) { toast('Enter at least one vital sign', 'error'); return; }
  if (encId) {
    await api(`/api/encounters/${encId}/vitals`, {
      method:'PATCH',
      body: JSON.stringify({temperature:temp||null,pulse:pulse||null,blood_pressure:bp||null,
                            weight:weight||null,height:height||null,oxygen_sat:spo2||null})
    });
  }
  const name = document.getElementById('vp-name').textContent;
  _nurseTriageIdx++;
  if (_triageModeOn && _nurseTriageIdx < _nurseTriageQueue.length) {
    _openVitalsForIdx(_nurseTriageIdx);
    toast(`✓ Saved for ${name}`, 'success');
  } else {
    closeVitalsPanel();
    const bar = document.getElementById('triage-mode-bar');
    if (bar) bar.classList.remove('active');
    _triageModeOn = false;
    toast('Triage complete!', 'success');
  }
}

function _nurseTodayQueue(queue) {
  const rows = queue.slice(0,8).map(e=>`
    <tr class="${e.has_allergy&&!e.has_vitals?'critical-row':''}">
      <td>
        <div style="display:flex;align-items:center;gap:8px">
          <div class="user-avatar" style="width:28px;height:28px;font-size:10px;background:${e.has_allergy?'#fecaca':'var(--primary-ghost)'};color:${e.has_allergy?'var(--danger)':'var(--primary)'}">
            ${initials(e.patient_name)}</div>
          <div><div class="patient-name">${e.patient_name}</div>
            <span class="tag" style="font-size:10px">${e.smart_id}</span></div>
        </div>
      </td>
      <td>${encTypeBadge(e.encounter_type)}</td>
      <td>${e.has_vitals
        ? `<span class="badge badge-green"><i class="fa-solid fa-check"></i> ${e.vitals_summary}</span>`
        : `<span class="badge badge-warn">Pending</span>`}</td>
      <td>${e.has_allergy?`<span class="badge badge-red"><i class="fa-solid fa-triangle-exclamation"></i> ${e.allergies}</span>`:'<span class="badge badge-gray">None</span>'}</td>
      <td>${!e.has_vitals?`<button class="btn btn-accent btn-sm" onclick="openVitalsPanel('${e.patient_name.replace(/'/g,"\\'")}',${e.encounter_id})"><i class="fa-solid fa-heart-pulse"></i></button>`:''}</td>
    </tr>`).join('');
  return `<div class="card">
    <div class="card-header">
      <h3><i class="fa-solid fa-list-check fa-fw" style="color:var(--accent)"></i> Today's Triage Queue</h3>
      <span class="badge badge-warn">${queue.filter(e=>!e.has_vitals).length} pending vitals</span>
    </div>
    <div class="table-wrap"><table>
      <thead><tr><th>Patient</th><th>Type</th><th>Vitals</th><th>Allergy</th><th></th></tr></thead>
      <tbody>${rows||'<tr><td colspan="5"><div class="empty-state"><p>No encounters today</p></div></td></tr>'}</tbody>
    </table></div>
  </div>`;
}

function _nurseFollowupsCard(upcoming, overdue) {
  const rows = [...upcoming.slice(0,4).map(f=>`
    <tr>
      <td><div class="patient-name">${f.patient_name}</div><span class="tag" style="font-size:10px">${f.smart_id}</span></td>
      <td><span class="badge ${f.days_away===0?'badge-warn':'badge-blue'}">${f.days_away===0?'Today':f.days_away+'d'}</span></td>
      <td style="font-size:12px">${f.clinician_name}</td>
    </tr>`),
  ...overdue.slice(0,3).map(f=>`
    <tr style="background:#fff5f5">
      <td><div class="patient-name">${f.patient_name}</div><span class="tag" style="font-size:10px">${f.smart_id}</span></td>
      <td><span class="badge badge-red">${f.days_overdue}d late</span></td>
      <td style="font-size:12px">${f.clinician_name}</td>
    </tr>`)].join('');
  return `<div class="card">
    <div class="card-header">
      <h3><i class="fa-solid fa-calendar-days fa-fw" style="color:var(--primary)"></i> Follow-ups (Next 7 Days)</h3>
      ${overdue.length?`<span class="badge badge-red">${overdue.length} overdue</span>`:''}
    </div>
    <div class="table-wrap"><table>
      <thead><tr><th>Patient</th><th>Due</th><th>Clinician</th></tr></thead>
      <tbody>${rows||'<tr><td colspan="3"><div class="empty-state"><p>No follow-ups</p></div></td></tr>'}</tbody>
    </table></div>
  </div>`;
}

function _nurseAllergyCard(patients) {
  if (!patients.length) return '';
  const rows = patients.map(p=>`
    <tr>
      <td><div class="patient-name">${p.patient_name}</div><span class="tag" style="font-size:10px">${p.smart_id}</span></td>
      <td><span class="badge badge-red"><i class="fa-solid fa-triangle-exclamation"></i> ${p.allergies}</span></td>
      <td><span class="badge badge-gray">${p.blood_group||'Unknown'}</span></td>
      <td><button class="btn btn-ghost btn-sm" onclick="viewPatient(${p.patient_id})">View →</button></td>
    </tr>`).join('');
  return `<div class="card mb-4">
    <div class="card-header">
      <h3><i class="fa-solid fa-triangle-exclamation fa-fw" style="color:var(--danger)"></i> Allergy Alert List</h3>
      <span class="badge badge-red">${patients.length} patients</span>
    </div>
    <div class="table-wrap"><table>
      <thead><tr><th>Patient</th><th>Allergy</th><th>Blood Group</th><th></th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>
  </div>`;
}

// ── ADMIN DASHBOARD ──────────────────────────────────────────────────────────
function renderAdminDashboard(d) {
  const s = d.stats;
  const pc = document.getElementById('page-content');
  const maxTrend = Math.max(...(d.monthly_trend||[]).map(t=>t.cnt), 1);
  const maxProv  = Math.max(...(d.province_dist||[]).map(p=>p.cnt), 1);
  const maxDiag  = Math.max(...(d.top_diagnoses||[]).map(x=>x.cnt), 1);
  const maxFacP  = Math.max(...(d.facility_patients||[]).map(x=>x.cnt), 1);
  const maxFacE  = Math.max(...(d.facility_encounters||[]).map(x=>x.cnt), 1);

  pc.innerHTML = `
  <div id="admin-filter-bar" class="filter-bar" style="display:none">
    <i class="fa-solid fa-filter" style="color:var(--primary)"></i>
    <span>Filtered by: <strong id="admin-filter-name"></strong></span>
    <span class="filter-label">— showing facility data only</span>
    <button class="btn btn-outline btn-sm" style="margin-left:auto" onclick="clearAdminFilter()"><i class="fa-solid fa-xmark"></i> Clear</button>
  </div>
  <div style="display:flex;align-items:center;gap:16px;background:#fff;border-radius:var(--radius);padding:14px 18px;margin-bottom:20px;border:1px solid var(--border);box-shadow:var(--shadow);flex-wrap:wrap">
    <div style="width:44px;height:44px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px;background:var(--warn-light);color:var(--warn);flex-shrink:0"><i class="fa-solid fa-shield-halved"></i></div>
    <div style="flex:1;min-width:0">
      <div style="font-size:15px;font-weight:600">System Administration</div>
      <div style="font-size:12px;color:var(--text3);margin-top:2px">Ministry of Health · Republic of Zambia — Full access</div>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn btn-primary btn-sm" onclick="navigate('users')"><i class="fa-solid fa-users-gear"></i> Manage Users</button>
      <button class="btn btn-outline btn-sm" onclick="navigate('reports')"><i class="fa-solid fa-chart-bar"></i> Reports</button>
    </div>
  </div>
  <div class="stats-grid">
    <div class="stat-card primary"><div class="label"><i class="fa-solid fa-users fa-fw"></i> Total Patients</div><div class="value">${s.total_patients}</div><div class="sub">+${s.new_this_week} this week</div></div>
    <div class="stat-card accent"><div class="label"><i class="fa-solid fa-stethoscope fa-fw"></i> Total Encounters</div><div class="value">${s.total_encounters}</div><div class="sub">All clinical visits</div></div>
    <div class="stat-card warn"><div class="label"><i class="fa-solid fa-calendar-days fa-fw"></i> This Month</div><div class="value">${s.monthly_encounters}</div><div class="sub">Encounters recorded</div></div>
    <div class="stat-card danger"><div class="label"><i class="fa-solid fa-clock fa-fw"></i> Today</div><div class="value">${s.today_encounters}</div><div class="sub">${s.total_users} system users</div></div>
  </div>

  <div class="grid-2 mb-4">
    <div class="card">
      <div class="card-header"><h3><i class="fa-solid fa-hospital-user fa-fw" style="color:var(--primary)"></i> Patients by Facility</h3></div>
      <div class="card-body">
        <div class="bar-chart">
          ${(d.facility_patients||[]).map(f=>`
          <div class="bar-row">
            <div class="bar-label">${f.facility||'Unknown'}</div>
            <div class="bar-track"><div class="bar-fill" style="width:${Math.round((f.cnt/maxFacP)*100)}%"></div></div>
            <div class="bar-val">${f.cnt}</div>
          </div>`).join('')||'<div class="empty-state"><p>No data</p></div>'}
        </div>
      </div>
    </div>
    <div class="card">
      <div class="card-header"><h3><i class="fa-solid fa-stethoscope fa-fw" style="color:var(--accent)"></i> Encounters by Facility</h3></div>
      <div class="card-body">
        <div class="bar-chart">
          ${(d.facility_encounters||[]).map(f=>`
          <div class="bar-row">
            <div class="bar-label">${f.facility||'Unknown'}</div>
            <div class="bar-track"><div class="bar-fill accent" style="width:${Math.round((f.cnt/maxFacE)*100)}%"></div></div>
            <div class="bar-val">${f.cnt}</div>
          </div>`).join('')||'<div class="empty-state"><p>No data</p></div>'}
        </div>
      </div>
    </div>
  </div>

  <div class="grid-3 mb-4">
    <div class="card">
      <div class="card-header"><h3><i class="fa-solid fa-venus-mars fa-fw" style="color:var(--primary)"></i> Gender Distribution</h3></div>
      <div class="card-body">
        <div class="bar-chart">
          ${(d.gender_dist||[]).map(g=>`
          <div class="bar-row">
            <div class="bar-label">${g.gender||'Unknown'}</div>
            <div class="bar-track"><div class="bar-fill" style="width:${Math.round((g.cnt/s.total_patients)*100)}%"></div></div>
            <div class="bar-val">${g.cnt}</div>
          </div>`).join('')}
        </div>
      </div>
    </div>
    <div class="card">
      <div class="card-header"><h3><i class="fa-solid fa-map-location-dot fa-fw" style="color:var(--accent)"></i> By Province</h3></div>
      <div class="card-body">
        <div class="bar-chart">
          ${(d.province_dist||[]).map(p=>`
          <div class="bar-row">
            <div class="bar-label">${p.province||'Unknown'}</div>
            <div class="bar-track"><div class="bar-fill accent" style="width:${Math.round((p.cnt/maxProv)*100)}%"></div></div>
            <div class="bar-val">${p.cnt}</div>
          </div>`).join('')}
        </div>
      </div>
    </div>
    <div class="card">
      <div class="card-header"><h3><i class="fa-solid fa-disease fa-fw" style="color:var(--warn)"></i> Top Diagnoses</h3></div>
      <div class="card-body">
        <div class="bar-chart">
          ${(d.top_diagnoses||[]).map(x=>`
          <div class="bar-row">
            <div class="bar-label">${x.diagnosis}</div>
            <div class="bar-track"><div class="bar-fill" style="width:${Math.round((x.cnt/maxDiag)*100)}%"></div></div>
            <div class="bar-val">${x.cnt}</div>
          </div>`).join('')||'<div class="empty-state"><p>No diagnoses yet</p></div>'}
        </div>
      </div>
    </div>
  </div>

  <div class="grid-2 mb-4">
    <div class="card">
      <div class="card-header"><h3><i class="fa-solid fa-chart-column fa-fw" style="color:var(--primary)"></i> Monthly Encounter Trend</h3></div>
      <div class="card-body">
        <div style="display:flex;align-items:flex-end;gap:6px;height:80px;padding-bottom:6px">
          ${(d.monthly_trend||[]).map(m=>`
          <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:3px">
            <span style="font-size:10px;color:var(--text3)">${m.cnt}</span>
            <div style="width:100%;background:var(--primary);border-radius:3px 3px 0 0;height:${Math.max(3,Math.round((m.cnt/maxTrend)*60))}px;opacity:.8"></div>
            <span style="font-size:9px;color:var(--text3)">${m.month.slice(5)}</span>
          </div>`).join('')}
        </div>
      </div>
    </div>
    <div class="card">
      <div class="card-header"><h3><i class="fa-solid fa-users fa-fw" style="color:var(--primary)"></i> Recent Patients</h3>
        <button class="btn btn-ghost btn-sm" onclick="navigate('patients')">View all →</button>
      </div>
      <div class="table-wrap"><table>
        <thead><tr><th>Patient</th><th>SmartID</th><th>Facility</th><th>Registered</th></tr></thead>
        <tbody>
          ${(d.recent_patients||[]).map(p=>`
          <tr style="cursor:pointer" onclick="viewPatient(${p.id})">
            <td><div style="display:flex;align-items:center;gap:8px">
              <div class="user-avatar" style="width:28px;height:28px;font-size:10px;background:var(--primary-ghost);color:var(--primary)">${initials(p.first_name+' '+p.last_name)}</div>
              <span class="patient-name">${p.first_name} ${p.last_name}</span>
            </div></td>
            <td><span class="tag">${p.smart_id}</span></td>
            <td style="font-size:12px">${p.facility||'—'}</td>
            <td style="font-size:12px">${fmtDate(p.registered_at)}</td>
          </tr>`).join('')}
        </tbody>
      </table></div>
    </div>
  </div>

  <div class="card mb-4">
    <div class="card-header">
      <h3><i class="fa-solid fa-circle-exclamation fa-fw" style="color:var(--warn)"></i> Data Quality Indicators</h3>
      <span class="badge badge-warn">System-wide</span>
    </div>
    <div class="card-body">
      <div class="dq-issue">
        <div class="dq-icon high"><i class="fa-solid fa-phone-slash"></i></div>
        <div class="dq-body">
          <div class="dq-title">Missing phone numbers</div>
          <div class="dq-desc">Patients registered with no contact number — affects follow-up outreach.</div>
        </div>
        <div class="dq-count" id="dq-no-phone" style="color:var(--danger)">—</div>
      </div>
      <div class="dq-issue">
        <div class="dq-icon med"><i class="fa-solid fa-heart-pulse"></i></div>
        <div class="dq-body">
          <div class="dq-title">Encounters with no vitals recorded</div>
          <div class="dq-desc">OPD/inpatient encounters where nursing vitals were never entered.</div>
        </div>
        <div class="dq-count" id="dq-no-vitals" style="color:var(--warn)">—</div>
      </div>
      <div class="dq-issue" style="border-bottom:none">
        <div class="dq-icon low"><i class="fa-solid fa-id-card"></i></div>
        <div class="dq-body">
          <div class="dq-title">Patients missing NRC / date of birth</div>
          <div class="dq-desc">Incomplete demographic records affecting reporting accuracy.</div>
        </div>
        <div class="dq-count" id="dq-no-nrc" style="color:var(--primary)">—</div>
      </div>
    </div>
  </div>`;

  // populate DQ indicators from live data (best effort)
  _loadAdminDQ();
}

async function _loadAdminDQ() {
  const patients = await api('/api/patients');
  if (!patients) return;
  const noPhone = patients.filter(p=>!p.phone).length;
  const noNRC   = patients.filter(p=>!p.nrc_number||!p.date_of_birth).length;
  const el1 = document.getElementById('dq-no-phone');
  const el2 = document.getElementById('dq-no-nrc');
  if (el1) el1.textContent = noPhone;
  if (el2) el2.textContent = noNRC;
  const allEncs = await api('/api/dashboard');
  if (allEncs) {
    const el3 = document.getElementById('dq-no-vitals');
    if (el3) el3.textContent = '—';
  }
}

function clearAdminFilter() {
  document.getElementById('admin-filter-bar').style.display = 'none';
}

// ── Doctor Quick Search ───────────────────────────────────────────────────────
function handleQuickSearch(val) {
  const box = document.getElementById('qs-results');
  if (!val || val.trim().length < 2) { box.style.display='none'; box.innerHTML=''; return; }
  api(`/api/patients?q=${encodeURIComponent(val)}`).then(patients => {
    if (!box) return;
    if (!patients || !patients.length) {
      box.innerHTML = '<div style="padding:14px 16px;font-size:13px;color:var(--text3)"><i class="fa-solid fa-magnifying-glass"></i> No patients found</div>';
      box.style.display = 'block'; return;
    }
    box.innerHTML = patients.slice(0,6).map(p=>`
      <div class="qsr-item" onclick="viewPatient(${p.id});document.getElementById('qs-results').style.display='none'">
        <div class="qsr-avatar">${initials(p.first_name+' '+p.last_name)}</div>
        <div class="qsr-body">
          <div class="qsr-name">${p.first_name} ${p.last_name}</div>
          <div class="qsr-meta">${p.smart_id} · ${age(p.date_of_birth)} yrs · ${p.gender}
            ${p.allergies&&p.allergies!=='None'?`<span class="badge badge-warn" style="margin-left:4px;font-size:10px"><i class="fa-solid fa-triangle-exclamation"></i> ${p.allergies}</span>`:''}
          </div>
        </div>
        <button class="btn btn-primary btn-sm" onclick="event.stopPropagation();showEncounterModal(${p.id},'${(p.first_name+' '+p.last_name).replace(/'/g,"\\'")}');document.getElementById('qs-results').style.display='none'">
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

document.addEventListener('click', function(e) {
  const wrap = document.getElementById('qs-wrap');
  const box  = document.getElementById('qs-results');
  if (wrap && box && !wrap.contains(e.target)) box.style.display = 'none';
});
