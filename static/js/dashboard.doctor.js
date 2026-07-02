/* ============================================================
   DOCTOR DASHBOARD  — v2 professional
   Clinical workload view scoped to the logged-in clinician
   ============================================================ */

function renderDoctorDashboard(d) {
  const s        = d.stats;
  const maxTrend = Math.max(...(d.monthly_trend.length ? d.monthly_trend.map(t=>t.cnt) : [1]), 1);
  const maxDiag  = Math.max(...(d.top_diagnoses.length ? d.top_diagnoses.map(x=>x.cnt) : [1]), 1);
  const maxType  = Math.max(...(d.enc_types.length     ? d.enc_types.map(x=>x.cnt)     : [1]), 1);

  /* ── header banner ─────────────────────────────────────── */
  const header = `
  <div class="dash-banner dash-banner--doctor">
    <div class="dash-banner__icon"><i class="fa-solid fa-user-doctor"></i></div>
    <div class="dash-banner__body">
      <div class="dash-banner__name">${d.clinician_name}</div>
      <div class="dash-banner__meta">${d.facility} · Clinical Workstation · ${_todayLabel()}</div>
    </div>
    <div class="dash-banner__actions">
      <button class="btn btn-primary btn-sm" onclick="showEncounterModalSearch()">
        <i class="fa-solid fa-stethoscope"></i> New Encounter
      </button>
      <button class="btn btn-outline btn-sm" onclick="navigate('patients')">
        <i class="fa-solid fa-users"></i> My Patients
      </button>
    </div>
  </div>`;

  /* ── stat cards ────────────────────────────────────────── */
  const stats = `
  <div class="stats-grid">
    <div class="stat-card primary">
      <div class="label"><i class="fa-solid fa-users fa-fw"></i> My Patients</div>
      <div class="value">${s.total_my_patients}</div>
      <div class="sub">Unique patients seen</div>
    </div>
    <div class="stat-card accent">
      <div class="label"><i class="fa-solid fa-stethoscope fa-fw"></i> My Encounters</div>
      <div class="value">${s.total_my_encounters}</div>
      <div class="sub">${s.today_my_encounters} today · ${s.monthly_my_encounters} this month</div>
    </div>
    <div class="stat-card warn">
      <div class="label"><i class="fa-solid fa-calendar-check fa-fw"></i> Upcoming Follow-ups</div>
      <div class="value">${s.upcoming_followups}</div>
      <div class="sub">Next 14 days</div>
    </div>
    <div class="stat-card danger">
      <div class="label"><i class="fa-solid fa-circle-exclamation fa-fw"></i> Overdue Follow-ups</div>
      <div class="value">${s.overdue_followups}</div>
      <div class="sub">${s.overdue_followups > 0 ? '<span style="color:var(--danger)">Needs attention</span>' : 'All on schedule'}</div>
    </div>
  </div>`;

  /* ── overdue alert banner ──────────────────────────────── */
  const overduePanel = d.overdue_followups.length === 0 ? '' : `
  <div class="card mb-4 card--danger-border" style="border-left-width:4px">
    <div class="card-header" style="background:var(--danger-light)">
      <h3><i class="fa-solid fa-triangle-exclamation fa-fw" style="color:var(--danger)"></i>
        Overdue Follow-ups — Action Required
      </h3>
      <span class="badge badge-red">${d.overdue_followups.length} patient${d.overdue_followups.length!==1?'s':''}</span>
    </div>
    <div class="table-wrap"><table>
      <thead><tr><th>Patient</th><th>SmartID</th><th>Was Due</th><th>Last Diagnosis</th><th>Days Overdue</th></tr></thead>
      <tbody>
        ${d.overdue_followups.map(f=>`
        <tr style="cursor:pointer" onclick="viewPatient(${f.patient_id})">
          <td>
            <div style="display:flex;align-items:center;gap:8px">
              <div class="user-avatar" style="width:28px;height:28px;font-size:10px;background:#fecaca;color:var(--danger)">${_initials(f.patient_name)}</div>
              <span class="patient-name">${f.patient_name}</span>
            </div>
          </td>
          <td><span class="tag">${f.smart_id}</span></td>
          <td style="color:var(--danger);font-size:12px">${fmtDate(f.follow_up_date)}</td>
          <td style="font-size:12px;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${f.last_diagnosis||'—'}</td>
          <td><span class="badge badge-red"><i class="fa-solid fa-clock"></i> ${f.days_overdue}d overdue</span></td>
        </tr>`).join('')}
      </tbody>
    </table></div>
  </div>`;

  /* ── follow-ups + workload trend ───────────────────────── */
  const row1 = `
  <div class="grid-2 mb-4">
    <div class="card">
      <div class="card-header">
        <h3><i class="fa-solid fa-calendar-check fa-fw" style="color:var(--accent)"></i> Upcoming Follow-ups</h3>
        <span class="badge badge-blue">${s.upcoming_followups} in 14 days</span>
      </div>
      <div class="table-wrap"><table>
        <thead><tr><th>Patient</th><th>SmartID</th><th>Follow-up</th><th>Last Diagnosis</th></tr></thead>
        <tbody>
          ${d.upcoming_followups.length === 0
            ? `<tr><td colspan="4"><div class="empty-state">
                 <i class="fa-solid fa-calendar-check" style="font-size:24px;color:var(--accent);display:block;margin-bottom:8px"></i>
                 <p>No upcoming follow-ups in the next 14 days</p>
               </div></td></tr>`
            : d.upcoming_followups.map(f=>`
            <tr style="cursor:pointer" onclick="viewPatient(${f.patient_id})">
              <td class="patient-name">${f.patient_name}</td>
              <td><span class="tag">${f.smart_id}</span></td>
              <td>
                <span class="badge ${f.days_away===0?'badge-warn':f.days_away<=3?'badge-warn':'badge-blue'}">
                  ${f.days_away===0?'<i class="fa-solid fa-star"></i> Today':
                    f.days_away===1?'Tomorrow':
                    'In '+f.days_away+'d'}
                </span>
              </td>
              <td style="font-size:12px;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
                ${f.last_diagnosis||'—'}
              </td>
            </tr>`).join('')}
        </tbody>
      </table></div>
    </div>

    <div class="card">
      <div class="card-header">
        <h3><i class="fa-solid fa-chart-line fa-fw" style="color:var(--primary)"></i> My 6-Month Workload</h3>
      </div>
      <div class="card-body">
        ${d.monthly_trend.length === 0
          ? `<div class="empty-state"><p>No encounter data yet</p></div>`
          : `<div class="trend-chart" style="height:70px">
              ${d.monthly_trend.map(m=>`
                <div class="trend-bar" style="height:${Math.max(6,Math.round((m.cnt/maxTrend)*64))}px">
                  <div class="tip">${m.month}: ${m.cnt} encounter${m.cnt!==1?'s':''}</div>
                </div>`).join('')}
             </div>
             <div style="display:flex;justify-content:space-between;margin-top:8px">
               ${d.monthly_trend.map(m=>`
               <div style="flex:1;text-align:center">
                 <div style="font-size:10px;color:var(--text3)">${m.month.slice(5)}</div>
                 <div style="font-size:9px;color:var(--text3)">${m.cnt}</div>
               </div>`).join('')}
             </div>`}
      </div>
    </div>
  </div>`;

  /* ── diagnoses + encounter types ───────────────────────── */
  const row2 = `
  <div class="grid-2 mb-4">
    <div class="card">
      <div class="card-header">
        <h3><i class="fa-solid fa-disease fa-fw" style="color:var(--warn)"></i> My Top Diagnoses</h3>
      </div>
      <div class="card-body">
        ${d.top_diagnoses.length === 0
          ? `<div class="empty-state"><p>No diagnoses recorded yet</p></div>`
          : `<div class="bar-chart">
              ${d.top_diagnoses.map((x,i)=>`
              <div class="bar-row">
                <div class="bar-label" title="${x.diagnosis}">${x.diagnosis}</div>
                <div class="bar-track">
                  <div class="bar-fill${i===0?' accent':''}" style="width:${Math.round((x.cnt/maxDiag)*100)}%;transition:width .6s ${i*0.1}s ease"></div>
                </div>
                <div class="bar-val">${x.cnt}</div>
              </div>`).join('')}
             </div>`}
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <h3><i class="fa-solid fa-clipboard-list fa-fw" style="color:var(--primary)"></i> My Encounter Breakdown</h3>
      </div>
      <div class="card-body">
        ${d.enc_types.length === 0
          ? `<div class="empty-state"><p>No encounters yet</p></div>`
          : `<div class="bar-chart">
              ${d.enc_types.map(e=>`
              <div class="bar-row">
                <div class="bar-label">${e.encounter_type}</div>
                <div class="bar-track"><div class="bar-fill" style="width:${Math.round((e.cnt/maxType)*100)}%"></div></div>
                <div class="bar-val">${e.cnt}</div>
              </div>`).join('')}
             </div>`}
      </div>
    </div>
  </div>`;

  /* ── recent encounters ─────────────────────────────────── */
  const recentEnc = `
  <div class="grid-2 mb-4">
    <div class="card">
      <div class="card-header">
        <h3><i class="fa-solid fa-clock-rotate-left fa-fw"></i> My Recent Encounters</h3>
        <button class="btn btn-ghost btn-sm" onclick="navigate('encounters')">View all →</button>
      </div>
      <div class="table-wrap"><table>
        <thead><tr><th>Patient</th><th>Type</th><th>Diagnosis / Complaint</th><th>Date</th></tr></thead>
        <tbody>
          ${d.recent_encounters.length === 0
            ? `<tr><td colspan="4"><div class="empty-state"><p>No encounters recorded yet</p></div></td></tr>`
            : d.recent_encounters.map(e=>`
            <tr style="cursor:pointer" onclick="viewPatient(${e.patient})">
              <td>
                <div style="display:flex;align-items:center;gap:8px">
                  <div class="user-avatar" style="width:28px;height:28px;font-size:10px;background:var(--primary-ghost);color:var(--primary)">${_initials(e.patient_name)}</div>
                  <span class="patient-name">${e.patient_name}</span>
                </div>
              </td>
              <td>${encTypeBadge(e.encounter_type)}</td>
              <td style="font-size:12px;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
                ${e.diagnosis||e.chief_complaint||'<span style="color:var(--text3)">—</span>'}
              </td>
              <td style="font-size:12px;white-space:nowrap">${fmtDate(e.visit_date)}</td>
            </tr>`).join('')}
        </tbody>
      </table></div>
    </div>

    <div class="card">
      <div class="card-header">
        <h3><i class="fa-solid fa-user-plus fa-fw"></i> Recent Patients at ${d.facility}</h3>
        <button class="btn btn-ghost btn-sm" onclick="navigate('patients')">View all →</button>
      </div>
      <div class="table-wrap"><table>
        <thead><tr><th>Patient</th><th>SmartID</th><th>Age/Gender</th><th>Registered</th></tr></thead>
        <tbody>
          ${d.recent_patients.length === 0
            ? `<tr><td colspan="4"><div class="empty-state"><p>No recent registrations</p></div></td></tr>`
            : d.recent_patients.map(p=>`
            <tr style="cursor:pointer" onclick="viewPatient(${p.id})">
              <td>
                <div style="display:flex;align-items:center;gap:8px">
                  <div class="user-avatar" style="width:28px;height:28px;font-size:10px;background:var(--primary-ghost);color:var(--primary)">${_initials(p.first_name+' '+p.last_name)}</div>
                  <span class="patient-name">${p.first_name} ${p.last_name}</span>
                </div>
              </td>
              <td><span class="tag">${p.smart_id}</span></td>
              <td style="font-size:12px">${age(p.date_of_birth)}y · ${p.gender==='Male'?'M':'F'}</td>
              <td style="font-size:12px">${fmtDate(p.registered_at)}</td>
            </tr>`).join('')}
        </tbody>
      </table></div>
    </div>
  </div>`;

  document.getElementById('page-content').innerHTML =
    header + stats + overduePanel + row1 + row2 + recentEnc;
}

/* ── helpers ── */
function _initials(name) { return (name||'').split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase(); }
function _todayLabel() {
  return new Date().toLocaleDateString('en-ZM',{weekday:'long',day:'numeric',month:'long'});
}
