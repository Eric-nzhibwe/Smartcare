/* ============================================================
   ADMIN DASHBOARD  — v2 professional
   System-wide operational intelligence view
   ============================================================ */

function renderAdminDashboard(d) {
  const s        = d.stats;
  const maxTrend = Math.max(...(d.monthly_trend||[]).map(t=>t.cnt), 1);
  const maxProv  = Math.max(...(d.province_dist||[]).map(p=>p.cnt), 1);
  const maxDiag  = Math.max(...(d.top_diagnoses||[]).map(x=>x.cnt), 1);
  const maxFacP  = Math.max(...(d.facility_patients||[]).map(x=>x.cnt), 1);
  const maxFacE  = Math.max(...(d.facility_encounters||[]).map(x=>x.cnt), 1);
  const maxEnc   = Math.max(...(d.enc_types||[]).map(x=>x.cnt), 1);

  const header = `
  <div class="dash-banner dash-banner--admin">
    <div class="dash-banner__icon"><i class="fa-solid fa-shield-halved"></i></div>
    <div class="dash-banner__body">
      <div class="dash-banner__name">System Administration</div>
      <div class="dash-banner__meta">Ministry of Health · Republic of Zambia · ${_todayLabel()} — Full access</div>
    </div>
    <div class="dash-banner__actions">
      <button class="btn btn-primary btn-sm" onclick="navigate('users')">
        <i class="fa-solid fa-users-gear"></i> Manage Users
      </button>
      <button class="btn btn-outline btn-sm" onclick="navigate('reports')">
        <i class="fa-solid fa-chart-bar"></i> Reports
      </button>
    </div>
  </div>`;

  const stats = `
  <div class="stats-grid">
    <div class="stat-card primary">
      <div class="label"><i class="fa-solid fa-users fa-fw"></i> Total Patients</div>
      <div class="value">${s.total_patients}</div>
      <div class="sub">+${s.new_this_week} this week</div>
    </div>
    <div class="stat-card accent">
      <div class="label"><i class="fa-solid fa-stethoscope fa-fw"></i> Total Encounters</div>
      <div class="value">${s.total_encounters}</div>
      <div class="sub">All clinical visits</div>
    </div>
    <div class="stat-card warn">
      <div class="label"><i class="fa-solid fa-calendar-days fa-fw"></i> This Month</div>
      <div class="value">${s.monthly_encounters}</div>
      <div class="sub">Encounters recorded</div>
    </div>
    <div class="stat-card danger">
      <div class="label"><i class="fa-solid fa-clock fa-fw"></i> Today</div>
      <div class="value">${s.today_encounters}</div>
      <div class="sub">${s.total_users} system users</div>
    </div>
  </div>`;

  const facilityRow = `
  <div class="grid-2 mb-4">
    <div class="card">
      <div class="card-header">
        <h3><i class="fa-solid fa-hospital fa-fw" style="color:var(--primary)"></i> Patients by Facility</h3>
        <span class="badge badge-gray">${(d.facility_patients||[]).length} facilities</span>
      </div>
      <div class="card-body">
        ${(d.facility_patients||[]).length===0
          ? `<div class="empty-state"><p>No facility data yet</p></div>`
          : `<div class="bar-chart">
              ${(d.facility_patients||[]).map((f,i)=>`
              <div class="bar-row">
                <div class="bar-label" title="${f.facility||'Unknown'}">${f.facility||'Unknown'}</div>
                <div class="bar-track">
                  <div class="bar-fill" style="width:${Math.round((f.cnt/maxFacP)*100)}%;transition:width .6s ${i*0.08}s ease"></div>
                </div>
                <div class="bar-val">${f.cnt}</div>
              </div>`).join('')}
             </div>`}
      </div>
    </div>
    <div class="card">
      <div class="card-header">
        <h3><i class="fa-solid fa-chart-bar fa-fw" style="color:var(--accent)"></i> Encounters by Facility</h3>
      </div>
      <div class="card-body">
        ${(d.facility_encounters||[]).length===0
          ? `<div class="empty-state"><p>No encounter data yet</p></div>`
          : `<div class="bar-chart">
              ${(d.facility_encounters||[]).map((f,i)=>`
              <div class="bar-row">
                <div class="bar-label" title="${f.facility||'Unknown'}">${f.facility||'Unknown'}</div>
                <div class="bar-track">
                  <div class="bar-fill accent" style="width:${Math.round((f.cnt/maxFacE)*100)}%;transition:width .6s ${i*0.08}s ease"></div>
                </div>
                <div class="bar-val">${f.cnt}</div>
              </div>`).join('')}
             </div>`}
      </div>
    </div>
  </div>`;

  const trendRow = `
  <div class="grid-2 mb-4">
    <div class="card">
      <div class="card-header">
        <h3><i class="fa-solid fa-chart-line fa-fw" style="color:var(--primary)"></i> Monthly Encounter Trend — 6 Months</h3>
      </div>
      <div class="card-body">
        ${(d.monthly_trend||[]).length===0
          ? `<div class="empty-state"><p>No trend data yet</p></div>`
          : `<div class="trend-chart" style="height:70px">
              ${(d.monthly_trend||[]).map(m=>`
                <div class="trend-bar" style="height:${Math.max(6,Math.round((m.cnt/maxTrend)*64))}px">
                  <div class="tip">${m.month}: ${m.cnt} encounter${m.cnt!==1?'s':''}</div>
                </div>`).join('')}
             </div>
             <div style="display:flex;margin-top:8px">
               ${(d.monthly_trend||[]).map(m=>`
               <div style="flex:1;text-align:center">
                 <div style="font-size:10px;color:var(--text3)">${m.month.slice(5)}</div>
                 <div style="font-size:9px;color:var(--text3)">${m.cnt}</div>
               </div>`).join('')}
             </div>`}
      </div>
    </div>
    <div class="card">
      <div class="card-header">
        <h3><i class="fa-solid fa-clipboard-list fa-fw" style="color:var(--primary)"></i> Encounter Types — System-wide</h3>
      </div>
      <div class="card-body">
        ${(d.enc_types||[]).length===0
          ? `<div class="empty-state"><p>No encounters yet</p></div>`
          : `<div class="bar-chart">
              ${(d.enc_types||[]).map(e=>`
              <div class="bar-row">
                <div class="bar-label">${e.encounter_type}</div>
                <div class="bar-track"><div class="bar-fill" style="width:${Math.round((e.cnt/maxEnc)*100)}%"></div></div>
                <div class="bar-val">${e.cnt}</div>
              </div>`).join('')}
             </div>`}
      </div>
    </div>
  </div>`;

  const statsRow = `
  <div class="grid-3 mb-4">
    <div class="card">
      <div class="card-header"><h3><i class="fa-solid fa-venus-mars fa-fw" style="color:var(--accent)"></i> Gender Distribution</h3></div>
      <div class="card-body">
        <div class="bar-chart">
          ${(d.gender_dist||[]).map(g=>`
          <div class="bar-row">
            <div class="bar-label">${g.gender||'Unknown'}</div>
            <div class="bar-track"><div class="bar-fill" style="width:${s.total_patients?Math.round((g.cnt/s.total_patients)*100):0}%"></div></div>
            <div class="bar-val">${g.cnt}</div>
          </div>`).join('')}
        </div>
      </div>
    </div>
    <div class="card">
      <div class="card-header"><h3><i class="fa-solid fa-map-location-dot fa-fw" style="color:var(--accent)"></i> Patients by Province</h3></div>
      <div class="card-body">
        <div class="bar-chart">
          ${(d.province_dist||[]).map((p,i)=>`
          <div class="bar-row">
            <div class="bar-label">${p.province||'Unknown'}</div>
            <div class="bar-track">
              <div class="bar-fill accent" style="width:${Math.round((p.cnt/maxProv)*100)}%;transition:width .6s ${i*0.08}s ease"></div>
            </div>
            <div class="bar-val">${p.cnt}</div>
          </div>`).join('')}
        </div>
      </div>
    </div>
    <div class="card">
      <div class="card-header"><h3><i class="fa-solid fa-disease fa-fw" style="color:var(--warn)"></i> Top Diagnoses</h3></div>
      <div class="card-body">
        ${(d.top_diagnoses||[]).length===0
          ? `<div class="empty-state"><p>No diagnoses yet</p></div>`
          : `<div class="bar-chart">
              ${(d.top_diagnoses||[]).map((x,i)=>`
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
  </div>`;

  const recentRow = `
  <div class="grid-2 mb-4">
    <div class="card">
      <div class="card-header">
        <h3><i class="fa-solid fa-user-plus fa-fw"></i> Recent Registrations</h3>
        <button class="btn btn-ghost btn-sm" onclick="navigate('patients')">View all →</button>
      </div>
      <div class="table-wrap"><table>
        <thead><tr><th>Patient</th><th>SmartID</th><th>Facility</th><th>Registered</th></tr></thead>
        <tbody>
          ${(d.recent_patients||[]).map(p=>`
          <tr style="cursor:pointer" onclick="viewPatient(${p.id})">
            <td>
              <div style="display:flex;align-items:center;gap:8px">
                <div class="user-avatar" style="width:28px;height:28px;font-size:10px;background:var(--primary-ghost);color:var(--primary)">${_initials(p.first_name+' '+p.last_name)}</div>
                <span class="patient-name">${p.first_name} ${p.last_name}</span>
              </div>
            </td>
            <td><span class="tag">${p.smart_id}</span></td>
            <td style="font-size:12px">${p.facility||'—'}</td>
            <td style="font-size:12px">${fmtDate(p.registered_at)}</td>
          </tr>`).join('')}
        </tbody>
      </table></div>
    </div>
    <div class="card">
      <div class="card-header">
        <h3><i class="fa-solid fa-clock-rotate-left fa-fw"></i> Recent Encounters</h3>
        <button class="btn btn-ghost btn-sm" onclick="navigate('encounters')">View all →</button>
      </div>
      <div class="table-wrap"><table>
        <thead><tr><th>Patient</th><th>Type</th><th>Facility</th><th>Date</th></tr></thead>
        <tbody>
          ${(d.recent_encounters||[]).map(e=>`
          <tr>
            <td class="patient-name">${e.patient_name}</td>
            <td>${encTypeBadge(e.encounter_type)}</td>
            <td style="font-size:12px">${e.facility||'—'}</td>
            <td style="font-size:12px">${fmtDate(e.visit_date)}</td>
          </tr>`).join('')}
        </tbody>
      </table></div>
    </div>
  </div>`;

  // Use server-aggregated DQ counts (avoids loading all patients on the client)
  const dq      = d.data_quality || {};
  const noPhone  = dq.no_phone  ?? 0;
  const noVitals = dq.no_vitals ?? 0;
  const noNRC    = dq.no_nrc    ?? 0;

  const dqPanel = `
  <div class="card">
    <div class="card-header">
      <h3><i class="fa-solid fa-circle-exclamation fa-fw" style="color:var(--warn)"></i> Data Quality Indicators</h3>
      <span class="badge badge-gray">System-wide</span>
    </div>
    <div class="card-body">
      <div class="dq-issue">
        <div class="dq-icon high"><i class="fa-solid fa-phone-slash"></i></div>
        <div class="dq-body">
          <div class="dq-title">Missing phone numbers</div>
          <div class="dq-desc">Patients with no contact number — affects follow-up outreach capacity.</div>
        </div>
        <div class="dq-count" style="color:${noPhone>0?'var(--danger)':'var(--accent)'}">${noPhone}</div>
      </div>
      <div class="dq-issue">
        <div class="dq-icon med"><i class="fa-solid fa-heart-pulse"></i></div>
        <div class="dq-body">
          <div class="dq-title">Encounters with no vitals recorded</div>
          <div class="dq-desc">OPD/inpatient encounters where nursing triage vitals were not entered.</div>
        </div>
        <div class="dq-count" style="color:${noVitals>0?'var(--warn)':'var(--accent)'}">${noVitals}</div>
      </div>
      <div class="dq-issue" style="border-bottom:none">
        <div class="dq-icon low"><i class="fa-solid fa-id-card"></i></div>
        <div class="dq-body">
          <div class="dq-title">Patients missing NRC number</div>
          <div class="dq-desc">Incomplete demographic records — impacts national reporting accuracy.</div>
        </div>
        <div class="dq-count" style="color:${noNRC>0?'var(--primary)':'var(--accent)'}">${noNRC}</div>
      </div>
    </div>
  </div>`;

  document.getElementById('page-content').innerHTML =
    header + stats + facilityRow + trendRow + statsRow + recentRow + dqPanel;
}

function _initials(n) { return typeof initials === 'function' ? initials(n) : (n||'').split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase(); }
function _todayLabel() { return typeof todayLabel === 'function' ? todayLabel() : new Date().toLocaleDateString('en-ZM',{weekday:'long',day:'numeric',month:'long'}); }
