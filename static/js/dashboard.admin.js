/* ============================================================
   ADMIN DASHBOARD
   System-wide operational intelligence view
   ============================================================ */

function renderAdminDashboard(d) {
  const s        = d.stats;
  const maxTrend = Math.max(...d.monthly_trend.map(t=>t.cnt), 1);
  const maxProv  = Math.max(...d.province_dist.map(p=>p.cnt), 1);
  const maxDiag  = Math.max(...d.top_diagnoses.map(x=>x.cnt), 1);
  const maxFacP  = Math.max(...d.facility_patients.map(x=>x.cnt), 1);
  const maxFacE  = Math.max(...d.facility_encounters.map(x=>x.cnt), 1);
  const maxEnc   = Math.max(...d.enc_types.map(x=>x.cnt), 1);

  /* ── header banner ─────────────────────────────────────── */
  const header = `
  <div class="dash-banner dash-banner--admin">
    <div class="dash-banner__icon"><i class="fa-solid fa-shield-halved"></i></div>
    <div class="dash-banner__body">
      <div class="dash-banner__name">System Administration</div>
      <div class="dash-banner__meta">Ministry of Health · Republic of Zambia — Full access</div>
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

  /* ── stat cards ─────────────────────────────────────────── */
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
      <div class="sub">${s.total_users} active system users</div>
    </div>
  </div>`;

  /* ── trend + facility patients ──────────────────────────── */
  const row1 = `
  <div class="grid-2 mb-4">
    <div class="card">
      <div class="card-header">
        <h3><i class="fa-solid fa-chart-line fa-fw" style="color:var(--primary)"></i> Monthly Encounter Trend</h3>
      </div>
      <div class="card-body">
        ${d.monthly_trend.length === 0
          ? `<div class="empty-state"><p>No encounter data yet</p></div>`
          : `<div class="trend-chart">
              ${d.monthly_trend.map(m=>`
                <div class="trend-bar" style="height:${Math.max(6,Math.round((m.cnt/maxTrend)*56))}px">
                  <div class="tip">${m.month}: ${m.cnt}</div>
                </div>`).join('')}
             </div>
             <div style="display:flex;justify-content:space-between;margin-top:6px">
               ${d.monthly_trend.map(m=>`<span style="font-size:10px;color:var(--text3);flex:1;text-align:center">${m.month.slice(5)}</span>`).join('')}
             </div>`}
      </div>
    </div>
    <div class="card">
      <div class="card-header">
        <h3><i class="fa-solid fa-hospital fa-fw" style="color:var(--primary)"></i> Patients by Facility</h3>
      </div>
      <div class="card-body">
        <div class="bar-chart">
          ${d.facility_patients.map(f=>`
          <div class="bar-row">
            <div class="bar-label">${f.facility||'Unknown'}</div>
            <div class="bar-track"><div class="bar-fill" style="width:${Math.round((f.cnt/maxFacP)*100)}%"></div></div>
            <div class="bar-val">${f.cnt}</div>
          </div>`).join('')}
        </div>
      </div>
    </div>
  </div>`;

  /* ── encounters by facility + encounter types ───────────── */
  const row2 = `
  <div class="grid-2 mb-4">
    <div class="card">
      <div class="card-header">
        <h3><i class="fa-solid fa-chart-bar fa-fw" style="color:var(--accent)"></i> Encounters by Facility</h3>
      </div>
      <div class="card-body">
        <div class="bar-chart">
          ${d.facility_encounters.map(f=>`
          <div class="bar-row">
            <div class="bar-label">${f.facility||'Unknown'}</div>
            <div class="bar-track"><div class="bar-fill accent" style="width:${Math.round((f.cnt/maxFacE)*100)}%"></div></div>
            <div class="bar-val">${f.cnt}</div>
          </div>`).join('')}
        </div>
      </div>
    </div>
    <div class="card">
      <div class="card-header">
        <h3><i class="fa-solid fa-clipboard-list fa-fw" style="color:var(--primary)"></i> Encounter Types — System-wide</h3>
      </div>
      <div class="card-body">
        <div class="bar-chart">
          ${d.enc_types.map(e=>`
          <div class="bar-row">
            <div class="bar-label">${e.encounter_type}</div>
            <div class="bar-track"><div class="bar-fill" style="width:${Math.round((e.cnt/maxEnc)*100)}%"></div></div>
            <div class="bar-val">${e.cnt}</div>
          </div>`).join('')}
        </div>
      </div>
    </div>
  </div>`;

  /* ── gender + province + diagnoses ─────────────────────── */
  const row3 = `
  <div class="grid-3 mb-4">
    <div class="card">
      <div class="card-header">
        <h3><i class="fa-solid fa-venus-mars fa-fw" style="color:var(--accent)"></i> Gender Distribution</h3>
      </div>
      <div class="card-body">
        <div class="bar-chart">
          ${d.gender_dist.map(g=>`
          <div class="bar-row">
            <div class="bar-label">${g.gender||'Unknown'}</div>
            <div class="bar-track"><div class="bar-fill" style="width:${s.total_patients?Math.round((g.cnt/s.total_patients)*100):0}%"></div></div>
            <div class="bar-val">${g.cnt}</div>
          </div>`).join('')}
        </div>
      </div>
    </div>
    <div class="card">
      <div class="card-header">
        <h3><i class="fa-solid fa-map-location-dot fa-fw" style="color:var(--accent)"></i> By Province</h3>
      </div>
      <div class="card-body">
        <div class="bar-chart">
          ${d.province_dist.map(p=>`
          <div class="bar-row">
            <div class="bar-label">${p.province||'Unknown'}</div>
            <div class="bar-track"><div class="bar-fill" style="width:${Math.round((p.cnt/maxProv)*100)}%"></div></div>
            <div class="bar-val">${p.cnt}</div>
          </div>`).join('')}
        </div>
      </div>
    </div>
    <div class="card">
      <div class="card-header">
        <h3><i class="fa-solid fa-disease fa-fw" style="color:var(--warn)"></i> Top Diagnoses</h3>
      </div>
      <div class="card-body">
        <div class="bar-chart">
          ${d.top_diagnoses.map(x=>`
          <div class="bar-row">
            <div class="bar-label">${x.diagnosis}</div>
            <div class="bar-track"><div class="bar-fill accent" style="width:${Math.round((x.cnt/maxDiag)*100)}%"></div></div>
            <div class="bar-val">${x.cnt}</div>
          </div>`).join('')}
        </div>
      </div>
    </div>
  </div>`;

  /* ── recent patients + recent encounters ────────────────── */
  const row4 = `
  <div class="grid-2">
    <div class="card">
      <div class="card-header">
        <h3><i class="fa-solid fa-user-plus fa-fw"></i> Recent Registrations</h3>
        <button class="btn btn-ghost btn-sm" onclick="navigate('patients')">View all →</button>
      </div>
      <div class="table-wrap"><table>
        <thead><tr><th>Patient</th><th>SmartID</th><th>Facility</th><th>Registered</th></tr></thead>
        <tbody>
          ${d.recent_patients.map(p=>`
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
          ${d.recent_encounters.map(e=>`
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

  document.getElementById('page-content').innerHTML =
    header + stats + row1 + row2 + row3 + row4;
}
