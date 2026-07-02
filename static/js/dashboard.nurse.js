/* ============================================================
   NURSE DASHBOARD
   Operational triage & patient-flow view — facility-scoped
   ============================================================ */

function renderNurseDashboard(d) {
  const s       = d.stats;
  const maxType = Math.max(...(d.enc_types.length ? d.enc_types.map(x=>x.cnt) : [1]), 1);

  /* ── header banner ─────────────────────────────────────── */
  const header = `
  <div class="dash-banner dash-banner--nurse">
    <div class="dash-banner__icon"><i class="fa-solid fa-user-nurse"></i></div>
    <div class="dash-banner__body">
      <div class="dash-banner__name">${d.nurse_name}</div>
      <div class="dash-banner__meta">${d.facility} · Nursing Station</div>
    </div>
    <div class="dash-banner__actions">
      <button class="btn btn-primary btn-sm" onclick="showRegisterModal()">
        <i class="fa-solid fa-user-plus"></i> Register Patient
      </button>
      <button class="btn btn-accent btn-sm" onclick="showVitalsSearchModal()">
        <i class="fa-solid fa-heart-pulse"></i> Record Vitals
      </button>
    </div>
  </div>`;

  /* ── stat cards ────────────────────────────────────────── */
  const stats = `
  <div class="stats-grid">
    <div class="stat-card primary">
      <div class="label"><i class="fa-solid fa-users fa-fw"></i> Facility Patients</div>
      <div class="value">${s.total_patients}</div>
      <div class="sub">+${s.registered_week} this week</div>
    </div>
    <div class="stat-card accent">
      <div class="label"><i class="fa-solid fa-stethoscope fa-fw"></i> Encounters Today</div>
      <div class="value">${s.encounters_today}</div>
      <div class="sub">${s.registered_today} new registration${s.registered_today!==1?'s':''}</div>
    </div>
    <div class="stat-card warn">
      <div class="label"><i class="fa-solid fa-heart-pulse fa-fw"></i> Vitals Pending</div>
      <div class="value">${s.vitals_pending}</div>
      <div class="sub">Patients not yet triaged</div>
    </div>
    <div class="stat-card danger">
      <div class="label"><i class="fa-solid fa-triangle-exclamation fa-fw"></i> Allergy Alerts</div>
      <div class="value">${s.allergy_count}</div>
      <div class="sub">Known allergies on file</div>
    </div>
  </div>`;

  /* ── triage queue ──────────────────────────────────────── */
  const triageQueue = `
  <div class="card mb-4">
    <div class="card-header">
      <h3><i class="fa-solid fa-clipboard-list fa-fw" style="color:var(--primary)"></i>
        Today's Triage Queue — ${d.facility}
      </h3>
      <div style="display:flex;align-items:center;gap:8px">
        <span class="badge badge-blue">${s.encounters_today} today</span>
        ${s.vitals_pending > 0
          ? `<span class="badge badge-warn"><i class="fa-solid fa-heart-pulse"></i> ${s.vitals_pending} pending vitals</span>`
          : `<span class="badge badge-green"><i class="fa-solid fa-circle-check"></i> All triaged</span>`}
      </div>
    </div>
    <div class="table-wrap"><table>
      <thead>
        <tr>
          <th>Patient</th><th>Age / Sex</th><th>Type</th>
          <th>Chief Complaint</th><th>Clinician</th>
          <th>Vitals</th><th>Allergy</th><th></th>
        </tr>
      </thead>
      <tbody>
        ${d.todays_queue.length === 0
          ? `<tr><td colspan="8">
               <div class="empty-state">
                 <i class="fa-solid fa-circle-check" style="font-size:28px;color:var(--accent);display:block;margin-bottom:10px"></i>
                 <p>No encounters recorded today yet</p>
               </div>
             </td></tr>`
          : d.todays_queue.map(e=>`
          <tr style="cursor:pointer" onclick="viewPatient(${e.patient_id})">
            <td>
              <div style="display:flex;align-items:center;gap:8px">
                <div class="user-avatar" style="width:30px;height:30px;font-size:11px;background:var(--primary-ghost);color:var(--primary)">
                  ${initials(e.patient_name)}
                </div>
                <div>
                  <div class="patient-name">${e.patient_name}</div>
                  <div style="font-size:11px;color:var(--text3);font-family:'DM Mono',monospace">${e.smart_id}</div>
                </div>
              </div>
            </td>
            <td style="font-size:12px">${e.age}y · ${e.gender==='Male'?'M':'F'}</td>
            <td>${encTypeBadge(e.encounter_type)}</td>
            <td style="font-size:12px;max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
              ${e.chief_complaint||'<span style="color:var(--text3)">—</span>'}
            </td>
            <td style="font-size:12px;color:var(--text2)">${e.clinician_name}</td>
            <td>
              ${e.has_vitals
                ? `<span class="badge badge-green"><i class="fa-solid fa-circle-check"></i> ${e.vitals_summary}</span>`
                : `<span class="badge badge-warn"><i class="fa-solid fa-triangle-exclamation"></i> Pending</span>`}
            </td>
            <td>
              ${e.has_allergy
                ? `<span class="badge badge-red" title="${e.allergies}">
                     <i class="fa-solid fa-triangle-exclamation"></i>
                     ${e.allergies.length>16?e.allergies.slice(0,16)+'…':e.allergies}
                   </span>`
                : '<span class="badge badge-gray">None</span>'}
            </td>
            <td onclick="event.stopPropagation()">
              <button class="btn btn-outline btn-sm"
                onclick="showQuickVitalsModal(${e.encounter_id},'${e.patient_name.replace(/'/g,"\\'")}')"
                title="Record vitals">
                <i class="fa-solid fa-heart-pulse"></i>
              </button>
            </td>
          </tr>`).join('')}
      </tbody>
    </table></div>
  </div>`;

  /* ── follow-ups row ────────────────────────────────────── */
  const followups = `
  <div class="grid-2 mb-4">
    <div class="card">
      <div class="card-header">
        <h3><i class="fa-solid fa-calendar-check fa-fw" style="color:var(--accent)"></i> Follow-ups This Week</h3>
        <span class="badge badge-blue">${s.upcoming_followups}</span>
      </div>
      <div class="table-wrap"><table>
        <thead><tr><th>Patient</th><th>Type</th><th>Date</th><th>Clinician</th></tr></thead>
        <tbody>
          ${d.upcoming_followups.length === 0
            ? `<tr><td colspan="4"><div class="empty-state"><p>No follow-ups this week</p></div></td></tr>`
            : d.upcoming_followups.map(f=>`
            <tr style="cursor:pointer" onclick="viewPatient(${f.patient_id})">
              <td>
                <div class="patient-name">${f.patient_name}</div>
                <div style="font-size:11px;color:var(--text3)">
                  ${f.last_diagnosis ? f.last_diagnosis.slice(0,28)+(f.last_diagnosis.length>28?'…':'') : '—'}
                </div>
              </td>
              <td>${encTypeBadge(f.encounter_type)}</td>
              <td>
                ${f.days_away===0
                  ? '<span class="badge badge-warn">Today</span>'
                  : f.days_away===1
                    ? '<span class="badge badge-warn">Tomorrow</span>'
                    : fmtDate(f.follow_up_date)}
              </td>
              <td style="font-size:12px;color:var(--text2)">${f.clinician_name}</td>
            </tr>`).join('')}
        </tbody>
      </table></div>
    </div>

    <div class="card ${s.overdue_followups>0?'card--danger-border':''}">
      <div class="card-header">
        <h3><i class="fa-solid fa-clock-rotate-left fa-fw" style="color:var(--danger)"></i> Overdue Follow-ups</h3>
        ${s.overdue_followups > 0
          ? `<span class="badge badge-red">${s.overdue_followups} overdue</span>`
          : `<span class="badge badge-green">All clear</span>`}
      </div>
      <div class="table-wrap"><table>
        <thead><tr><th>Patient</th><th>Type</th><th>Was Due</th><th>Days</th></tr></thead>
        <tbody>
          ${d.overdue_followups.length === 0
            ? `<tr><td colspan="4">
                 <div class="empty-state">
                   <p><i class="fa-solid fa-circle-check" style="color:var(--accent)"></i> No overdue follow-ups</p>
                 </div>
               </td></tr>`
            : d.overdue_followups.map(f=>`
            <tr style="cursor:pointer" onclick="viewPatient(${f.patient_id})">
              <td>
                <div class="patient-name">${f.patient_name}</div>
                <div style="font-size:11px;color:var(--text3);font-family:'DM Mono',monospace">${f.smart_id}</div>
              </td>
              <td>${encTypeBadge(f.encounter_type)}</td>
              <td style="font-size:12px;color:var(--danger)">${fmtDate(f.follow_up_date)}</td>
              <td><span class="badge badge-red">${f.days_overdue}d ago</span></td>
            </tr>`).join('')}
        </tbody>
      </table></div>
    </div>
  </div>`;

  /* ── allergy register + enc type chart ─────────────────── */
  const bottom = `
  <div class="grid-2 mb-4">
    <div class="card ${s.allergy_count>0?'card--warn-border':''}">
      <div class="card-header">
        <h3><i class="fa-solid fa-shield-virus fa-fw" style="color:var(--warn)"></i> Allergy Alert Register</h3>
        <span class="badge badge-warn">${s.allergy_count} patient${s.allergy_count!==1?'s':''}</span>
      </div>
      <div class="table-wrap"><table>
        <thead><tr><th>Patient</th><th>SmartID</th><th>Known Allergies</th><th>Blood Group</th></tr></thead>
        <tbody>
          ${d.allergy_patients.length === 0
            ? `<tr><td colspan="4"><div class="empty-state"><p>No allergy records on file</p></div></td></tr>`
            : d.allergy_patients.map(p=>`
            <tr style="cursor:pointer" onclick="viewPatient(${p.patient_id})">
              <td class="patient-name">${p.patient_name}</td>
              <td><span class="tag">${p.smart_id}</span></td>
              <td><span class="badge badge-warn"><i class="fa-solid fa-triangle-exclamation"></i> ${p.allergies}</span></td>
              <td style="font-size:12px">${p.blood_group||'—'}</td>
            </tr>`).join('')}
        </tbody>
      </table></div>
    </div>

    <div class="card">
      <div class="card-header">
        <h3><i class="fa-solid fa-chart-pie fa-fw" style="color:var(--primary)"></i> Encounter Types — ${d.facility}</h3>
      </div>
      <div class="card-body">
        ${d.enc_types.length === 0
          ? `<div class="empty-state"><p>No encounters recorded yet</p></div>`
          : `<div class="bar-chart">
              ${d.enc_types.map(e=>`
              <div class="bar-row">
                <div class="bar-label">${e.encounter_type}</div>
                <div class="bar-track"><div class="bar-fill accent" style="width:${Math.round((e.cnt/maxType)*100)}%"></div></div>
                <div class="bar-val">${e.cnt}</div>
              </div>`).join('')}
             </div>`}
      </div>
    </div>
  </div>`;

  /* ── recently registered ───────────────────────────────── */
  const recent = `
  <div class="card">
    <div class="card-header">
      <h3><i class="fa-solid fa-user-plus fa-fw"></i> Recently Registered Patients</h3>
      <button class="btn btn-ghost btn-sm" onclick="navigate('patients')">View all →</button>
    </div>
    <div class="table-wrap"><table>
      <thead><tr><th>Patient</th><th>SmartID</th><th>Age / Gender</th><th>Phone</th><th>Allergy</th><th>Registered</th></tr></thead>
      <tbody>
        ${d.recent_patients.length === 0
          ? `<tr><td colspan="6"><div class="empty-state"><p>No patients registered yet</p></div></td></tr>`
          : d.recent_patients.map(p=>{
              const ha = p.allergies && p.allergies!=='None' && p.allergies!=='';
              return `
              <tr style="cursor:pointer" onclick="viewPatient(${p.id})">
                <td>
                  <div style="display:flex;align-items:center;gap:8px">
                    <div class="user-avatar" style="width:28px;height:28px;font-size:11px;background:var(--primary-ghost);color:var(--primary)">
                      ${initials(p.first_name+' '+p.last_name)}
                    </div>
                    <span class="patient-name">${p.first_name} ${p.last_name}</span>
                  </div>
                </td>
                <td><span class="tag">${p.smart_id}</span></td>
                <td>${age(p.date_of_birth)} yrs · ${genderBadge(p.gender)}</td>
                <td style="font-size:12px">${p.phone||'—'}</td>
                <td>${ha
                  ? `<span class="badge badge-warn"><i class="fa-solid fa-triangle-exclamation"></i> ${p.allergies}</span>`
                  : '<span class="badge badge-gray">None</span>'}</td>
                <td style="font-size:12px">${fmtDate(p.registered_at)}</td>
              </tr>`;
            }).join('')}
      </tbody>
    </table></div>
  </div>`;

  document.getElementById('page-content').innerHTML =
    header + stats + triageQueue + followups + bottom + recent;
}

/* ── Quick Vitals Modal (from triage queue row) ────────── */
function showQuickVitalsModal(encounterId, patientName) {
  openModal(`Record Vitals — ${patientName}`, `
  <div class="vitals-modal-note">
    <i class="fa-solid fa-circle-info" style="color:var(--primary)"></i>
    Enter the vitals measured at triage. Only filled fields will be saved.
  </div>
  <div class="form-grid cols-3">
    <div class="field">
      <label><i class="fa-solid fa-thermometer-half" style="color:var(--danger)"></i> Temperature (°C)</label>
      <input id="qv-temp" type="number" step="0.1" placeholder="37.0" inputmode="decimal">
    </div>
    <div class="field">
      <label><i class="fa-solid fa-heart" style="color:var(--danger)"></i> Pulse (bpm)</label>
      <input id="qv-pulse" type="number" placeholder="80" inputmode="numeric">
    </div>
    <div class="field">
      <label><i class="fa-solid fa-gauge" style="color:var(--primary)"></i> Blood Pressure</label>
      <input id="qv-bp" placeholder="120/80">
    </div>
    <div class="field">
      <label><i class="fa-solid fa-weight-scale" style="color:var(--accent)"></i> Weight (kg)</label>
      <input id="qv-weight" type="number" step="0.1" placeholder="65" inputmode="decimal">
    </div>
    <div class="field">
      <label><i class="fa-solid fa-ruler-vertical" style="color:var(--accent)"></i> Height (cm)</label>
      <input id="qv-height" type="number" placeholder="165" inputmode="numeric">
    </div>
    <div class="field">
      <label><i class="fa-solid fa-lungs" style="color:var(--primary)"></i> SpO₂ (%)</label>
      <input id="qv-spo2" type="number" placeholder="98" inputmode="numeric">
    </div>
  </div>`,
  `<button class="btn btn-outline" onclick="closeModal()">
     <i class="fa-solid fa-xmark"></i> Cancel
   </button>
   <button class="btn btn-accent" onclick="submitQuickVitals(${encounterId})">
     <i class="fa-solid fa-floppy-disk"></i> Save Vitals
   </button>`);
}

async function submitQuickVitals(encounterId) {
  const payload = {
    temperature:    document.getElementById('qv-temp').value   || null,
    pulse:          document.getElementById('qv-pulse').value  || null,
    blood_pressure: document.getElementById('qv-bp').value     || null,
    weight:         document.getElementById('qv-weight').value || null,
    height:         document.getElementById('qv-height').value || null,
    oxygen_sat:     document.getElementById('qv-spo2').value   || null,
  };
  if (!Object.values(payload).some(v => v !== null && v !== '')) {
    toast('Enter at least one vital sign', 'error'); return;
  }
  const res = await api(`/api/encounters/${encounterId}/vitals`, {
    method: 'PATCH', body: JSON.stringify(payload)
  });
  if (res && res.success) {
    closeModal(); toast('Vitals saved', 'success'); navigate('dashboard');
  } else {
    toast('Failed to save vitals', 'error');
  }
}

/* ── Vitals Search Modal (from action bar) ─────────────── */
function showVitalsSearchModal() {
  openModal('Record Vitals — Find Patient', `
  <p style="margin-bottom:14px;color:var(--text2);font-size:13px">
    Search for the patient you want to triage:
  </p>
  <div class="search-bar" style="max-width:100%;margin-bottom:14px">
    <i class="fa-solid fa-magnifying-glass"></i>
    <input type="text" id="vit-search" placeholder="Patient name or SmartID…"
           oninput="searchForVitals(this.value)">
  </div>
  <div id="vit-search-results"></div>`,
  `<button class="btn btn-outline" onclick="closeModal()">
     <i class="fa-solid fa-xmark"></i> Cancel
   </button>`);
}

async function searchForVitals(q) {
  if (q.length < 2) { document.getElementById('vit-search-results').innerHTML = ''; return; }
  const patients = await api(`/api/patients?q=${encodeURIComponent(q)}`);
  const el = document.getElementById('vit-search-results');
  if (!el) return;
  if (!patients || patients.length === 0) {
    el.innerHTML = '<p style="font-size:13px;color:var(--text3)">No patients found</p>'; return;
  }
  el.innerHTML = patients.slice(0, 6).map(p => `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border);gap:10px">
      <div>
        <div style="font-weight:500;font-size:13px">${p.first_name} ${p.last_name}</div>
        <div style="font-size:11px;color:var(--text3)">${p.smart_id} · ${age(p.date_of_birth)} yrs</div>
        ${p.allergies && p.allergies!=='None' && p.allergies!==''
          ? `<span class="badge badge-warn" style="margin-top:4px">
               <i class="fa-solid fa-triangle-exclamation"></i> ${p.allergies}
             </span>` : ''}
      </div>
      <button class="btn btn-accent btn-sm"
        onclick="startVitalsForPatient(${p.id},'${(p.first_name+' '+p.last_name).replace(/'/g,"\\'")}')">
        <i class="fa-solid fa-heart-pulse"></i> Triage
      </button>
    </div>`).join('');
}

async function startVitalsForPatient(patientId, patientName) {
  const today = new Date().toISOString().slice(0, 10);
  const res = await api('/api/encounters', {
    method: 'POST',
    body: JSON.stringify({
      patient: patientId, encounter_type: 'OPD', visit_date: today,
      chief_complaint: 'Triage', facility: currentUser.facility
    })
  });
  if (res && res.success) {
    const d = await api('/api/dashboard');
    if (!d) return;
    const entry = d.todays_queue && d.todays_queue.find(e => e.patient_id===patientId && !e.has_vitals);
    if (entry) { closeModal(); showQuickVitalsModal(entry.encounter_id, patientName); }
    else {
      closeModal();
      toast('Triage encounter created — find patient in queue to record vitals', 'success');
      navigate('dashboard');
    }
  } else {
    toast('Could not create triage encounter', 'error');
  }
}
