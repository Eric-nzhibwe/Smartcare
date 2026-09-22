/* ============================================================
   SMARTCARE REPORTS  — Excel (CSV) & Word download
   Works for doctor / nurse / admin
   No server-side libraries needed — pure client-side generation
   ============================================================ */

/* ── cached dashboard data (populated by renderReports) ── */
let _reportData = null;

/* ════════════════════════════════════════════════════════
   MAIN RENDER
   ════════════════════════════════════════════════════════ */
async function renderReports() {
  const d = await api('/api/dashboard');
  if (!d) return;
  _reportData = d;

  const role  = d.role || currentUser?.role || 'admin';
  const today = new Date().toLocaleDateString('en-ZM', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  /* role-coloured accent */
  const accent = role === 'doctor' ? 'var(--primary)'
               : role === 'nurse'  ? 'var(--accent)'
               : 'var(--warn)';

  /* ── Download toolbar ── */
  const toolbar = `
  <div class="card mb-4" style="border-left:4px solid ${accent}">
    <div class="card-header">
      <h3><i class="fa-solid fa-download fa-fw" style="color:${accent}"></i>
        Download Reports
      </h3>
      <span class="badge badge-gray">as of ${today}</span>
    </div>
    <div class="card-body">
      <p style="font-size:13px;color:var(--text2);margin-bottom:16px">
        Export your data as a spreadsheet or Word document. Files are generated
        directly in the browser — no data leaves the system.
      </p>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <button class="btn btn-accent" onclick="downloadExcel('${role}')">
          <i class="fa-solid fa-file-excel"></i> Download Excel (.csv)
        </button>
        <button class="btn btn-primary" onclick="downloadWord('${role}')">
          <i class="fa-solid fa-file-word"></i> Download Word (.doc)
        </button>
      </div>
    </div>
  </div>`;

  /* ── Role-specific analytics content ── */
  let analyticsHtml = '';
  if (role === 'doctor')      analyticsHtml = _doctorReportHtml(d);
  else if (role === 'nurse')  analyticsHtml = _nurseReportHtml(d);
  else                        analyticsHtml = _adminReportHtml(d);

  document.getElementById('page-content').innerHTML = toolbar + analyticsHtml;
}

/* ════════════════════════════════════════════════════════
   EXCEL DOWNLOAD (CSV)
   ════════════════════════════════════════════════════════ */
function downloadExcel(role) {
  if (!_reportData) { toast('No report data loaded', 'error'); return; }
  const d     = _reportData;
  const today = new Date().toISOString().slice(0, 10);
  let csv     = '';

  if (role === 'doctor') {
    csv += _csvSection('CLINICAL WORKLOAD SUMMARY', [
      ['Metric', 'Value'],
      ['Total Patients Seen',       d.stats.total_my_patients],
      ['Total Encounters',          d.stats.total_my_encounters],
      ['Encounters Today',          d.stats.today_my_encounters],
      ['Encounters This Month',     d.stats.monthly_my_encounters],
      ['Upcoming Follow-ups (14d)', d.stats.upcoming_followups],
      ['Overdue Follow-ups',        d.stats.overdue_followups],
    ]);
    csv += _csvSection('TOP DIAGNOSES', [
      ['Diagnosis', 'Count'],
      ...(d.top_diagnoses || []).map(x => [x.diagnosis, x.cnt]),
    ]);
    csv += _csvSection('ENCOUNTER TYPES', [
      ['Type', 'Count'],
      ...(d.enc_types || []).map(e => [e.encounter_type, e.cnt]),
    ]);
    csv += _csvSection('MONTHLY TREND (6 MONTHS)', [
      ['Month', 'Encounters'],
      ...(d.monthly_trend || []).map(m => [m.month, m.cnt]),
    ]);
    csv += _csvSection('UPCOMING FOLLOW-UPS', [
      ['Patient', 'SmartID', 'Follow-up Date', 'Days Away', 'Last Diagnosis'],
      ...(d.upcoming_followups || []).map(f => [
        f.patient_name, f.smart_id, f.follow_up_date, f.days_away, f.last_diagnosis,
      ]),
    ]);
    csv += _csvSection('OVERDUE FOLLOW-UPS', [
      ['Patient', 'SmartID', 'Was Due', 'Days Overdue', 'Last Diagnosis'],
      ...(d.overdue_followups || []).map(f => [
        f.patient_name, f.smart_id, f.follow_up_date, f.days_overdue, f.last_diagnosis,
      ]),
    ]);
    csv += _csvSection('RECENT ENCOUNTERS', [
      ['Patient', 'Type', 'Diagnosis / Complaint', 'Visit Date'],
      ...(d.recent_encounters || []).map(e => [
        e.patient_name, e.encounter_type,
        e.diagnosis || e.chief_complaint, e.visit_date,
      ]),
    ]);

  } else if (role === 'nurse') {
    csv += _csvSection('TRIAGE & FACILITY SUMMARY', [
      ['Metric', 'Value'],
      ['Total Facility Patients',   d.stats.total_patients],
      ['Registered Today',          d.stats.registered_today],
      ['Registered This Week',      d.stats.registered_week],
      ['Encounters Today',          d.stats.encounters_today],
      ['Encounters This Month',     d.stats.encounters_month],
      ['Vitals Pending',            d.stats.vitals_pending],
      ['Upcoming Follow-ups',       d.stats.upcoming_followups],
      ['Overdue Follow-ups',        d.stats.overdue_followups],
      ['Allergy Alerts on File',    d.stats.allergy_count],
    ]);
    csv += _csvSection("TODAY'S TRIAGE QUEUE", [
      ['Patient', 'SmartID', 'Age', 'Gender', 'Type', 'Complaint', 'Clinician', 'Vitals', 'Allergy'],
      ...(d.todays_queue || []).map(e => [
        e.patient_name, e.smart_id, e.age, e.gender,
        e.encounter_type, e.chief_complaint,
        e.clinician_name, e.has_vitals ? 'Recorded' : 'Pending',
        e.has_allergy ? e.allergies : 'None',
      ]),
    ]);
    csv += _csvSection('ALLERGY ALERT REGISTER', [
      ['Patient', 'SmartID', 'Allergies', 'Blood Group'],
      ...(d.allergy_patients || []).map(p => [
        p.patient_name, p.smart_id, p.allergies, p.blood_group || 'Unknown',
      ]),
    ]);
    csv += _csvSection('UPCOMING FOLLOW-UPS (7 DAYS)', [
      ['Patient', 'SmartID', 'Follow-up Date', 'Days Away', 'Type', 'Clinician'],
      ...(d.upcoming_followups || []).map(f => [
        f.patient_name, f.smart_id, f.follow_up_date,
        f.days_away, f.encounter_type, f.clinician_name,
      ]),
    ]);
    csv += _csvSection('OVERDUE FOLLOW-UPS', [
      ['Patient', 'SmartID', 'Was Due', 'Days Overdue', 'Type', 'Clinician'],
      ...(d.overdue_followups || []).map(f => [
        f.patient_name, f.smart_id, f.follow_up_date,
        f.days_overdue, f.encounter_type, f.clinician_name,
      ]),
    ]);
    csv += _csvSection('ENCOUNTER TYPES', [
      ['Type', 'Count'],
      ...(d.enc_types || []).map(e => [e.encounter_type, e.cnt]),
    ]);

  } else {
    /* admin */
    csv += _csvSection('SYSTEM-WIDE STATISTICS', [
      ['Metric', 'Value'],
      ['Total Registered Patients', d.stats.total_patients],
      ['Total Clinical Encounters', d.stats.total_encounters],
      ['Encounters This Month',     d.stats.monthly_encounters],
      ['Encounters Today',          d.stats.today_encounters],
      ['Total System Users',        d.stats.total_users],
      ['New Patients This Week',    d.stats.new_this_week],
    ]);
    csv += _csvSection('PATIENTS BY FACILITY', [
      ['Facility', 'Patients'],
      ...(d.facility_patients || []).map(f => [f.facility || 'Unknown', f.cnt]),
    ]);
    csv += _csvSection('ENCOUNTERS BY FACILITY', [
      ['Facility', 'Encounters'],
      ...(d.facility_encounters || []).map(f => [f.facility || 'Unknown', f.cnt]),
    ]);
    csv += _csvSection('ENCOUNTER TYPES — SYSTEM-WIDE', [
      ['Type', 'Count'],
      ...(d.enc_types || []).map(e => [e.encounter_type, e.cnt]),
    ]);
    csv += _csvSection('TOP DIAGNOSES', [
      ['Diagnosis', 'Count'],
      ...(d.top_diagnoses || []).map(x => [x.diagnosis, x.cnt]),
    ]);
    csv += _csvSection('GENDER DISTRIBUTION', [
      ['Gender', 'Count'],
      ...(d.gender_dist || []).map(g => [g.gender || 'Unknown', g.cnt]),
    ]);
    csv += _csvSection('PATIENTS BY PROVINCE', [
      ['Province', 'Count'],
      ...(d.province_dist || []).map(p => [p.province || 'Unknown', p.cnt]),
    ]);
    csv += _csvSection('MONTHLY ENCOUNTER TREND', [
      ['Month', 'Encounters'],
      ...(d.monthly_trend || []).map(m => [m.month, m.cnt]),
    ]);
    csv += _csvSection('DATA QUALITY', [
      ['Issue', 'Count'],
      ['Missing phone numbers',        (d.data_quality || {}).no_phone  || 0],
      ['Encounters with no vitals',    (d.data_quality || {}).no_vitals || 0],
      ['Patients missing NRC number',  (d.data_quality || {}).no_nrc    || 0],
    ]);
    csv += _csvSection('RECENT REGISTRATIONS', [
      ['Patient', 'SmartID', 'Facility', 'Registered'],
      ...(d.recent_patients || []).map(p => [
        `${p.first_name} ${p.last_name}`, p.smart_id,
        p.facility || '—', p.registered_at?.slice(0, 10),
      ]),
    ]);
  }

  _triggerDownload(
    csv,
    `smartcare_report_${role}_${today}.csv`,
    'text/csv;charset=utf-8;',
  );
  toast('Excel report downloaded', 'success');
}

/* ── CSV helpers ── */
function _csvSection(title, rows) {
  const header = `\n"${title}"\n`;
  const body   = rows.map(r =>
    r.map(cell => {
      const s = String(cell ?? '').replace(/"/g, '""');
      return /[,"\n]/.test(s) ? `"${s}"` : s;
    }).join(',')
  ).join('\n');
  return header + body + '\n';
}

/* ════════════════════════════════════════════════════════
   WORD DOWNLOAD (HTML → .doc)
   ════════════════════════════════════════════════════════ */
function downloadWord(role) {
  if (!_reportData) { toast('No report data loaded', 'error'); return; }
  const d     = _reportData;
  const today = new Date().toLocaleDateString('en-ZM', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
  const facility = d.facility || d.clinician_name
    ? `${d.facility || ''} ${d.clinician_name ? '· ' + d.clinician_name : ''}`.trim()
    : 'SmartCare EMR';

  let body = '';
  if (role === 'doctor')     body = _doctorWordBody(d);
  else if (role === 'nurse') body = _nurseWordBody(d);
  else                       body = _adminWordBody(d);

  const html = `
<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="UTF-8">
<title>SmartCare Report</title>
<!--[if gte mso 9]>
<xml><w:WordDocument><w:View>Print</w:View><w:Zoom>90</w:Zoom></w:WordDocument></xml>
<![endif]-->
<style>
  body  { font-family: Calibri, Arial, sans-serif; font-size: 11pt; color: #0f172a; margin: 2cm; }
  h1    { font-size: 18pt; color: #0f4c81; border-bottom: 2px solid #0f4c81; padding-bottom: 6pt; margin-bottom: 4pt; }
  h2    { font-size: 13pt; color: #0f4c81; margin-top: 18pt; margin-bottom: 4pt; border-bottom: 1px solid #e2e8f0; }
  .meta { font-size: 9pt; color: #64748b; margin-bottom: 18pt; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 14pt; font-size: 10pt; }
  th    { background: #0f4c81; color: white; padding: 5pt 8pt; text-align: left; font-weight: bold; }
  td    { padding: 4pt 8pt; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
  tr:nth-child(even) td { background: #f8fafc; }
  .stat-row td:first-child { color: #475569; }
  .stat-row td:last-child  { font-weight: bold; color: #0f4c81; text-align: right; }
  .footer { font-size: 8pt; color: #94a3b8; margin-top: 24pt; border-top: 1px solid #e2e8f0; padding-top: 6pt; }
</style>
</head>
<body>
  <h1>SmartCare EMR — ${role.charAt(0).toUpperCase() + role.slice(1)} Report</h1>
  <p class="meta">
    ${facility}<br>
    Generated: ${today}<br>
    Ministry of Health · Republic of Zambia
  </p>
  ${body}
  <p class="footer">
    This report was generated by SmartCare EMR and contains aggregate, de-identified clinical data.
    For official use only.
  </p>
</body>
</html>`;

  const today2 = new Date().toISOString().slice(0, 10);
  _triggerDownload(html, `smartcare_report_${role}_${today2}.doc`, 'application/msword');
  toast('Word report downloaded', 'success');
}

/* ── Doctor Word body ── */
function _doctorWordBody(d) {
  const s = d.stats;
  return `
  <h2>Clinical Workload Summary</h2>
  <table>
    <tr class="stat-row"><td>Total Patients Seen</td><td>${s.total_my_patients}</td></tr>
    <tr class="stat-row"><td>Total Encounters</td><td>${s.total_my_encounters}</td></tr>
    <tr class="stat-row"><td>Encounters Today</td><td>${s.today_my_encounters}</td></tr>
    <tr class="stat-row"><td>Encounters This Month</td><td>${s.monthly_my_encounters}</td></tr>
    <tr class="stat-row"><td>Upcoming Follow-ups (14 days)</td><td>${s.upcoming_followups}</td></tr>
    <tr class="stat-row"><td>Overdue Follow-ups</td><td>${s.overdue_followups}</td></tr>
  </table>

  <h2>Top Diagnoses</h2>
  ${_wordTable(['Diagnosis','Count'], (d.top_diagnoses||[]).map(x=>[x.diagnosis, x.cnt]))}

  <h2>Encounter Types</h2>
  ${_wordTable(['Type','Count'], (d.enc_types||[]).map(e=>[e.encounter_type, e.cnt]))}

  <h2>6-Month Encounter Trend</h2>
  ${_wordTable(['Month','Encounters'], (d.monthly_trend||[]).map(m=>[m.month, m.cnt]))}

  <h2>Upcoming Follow-ups</h2>
  ${_wordTable(
    ['Patient','SmartID','Follow-up Date','Days Away','Last Diagnosis'],
    (d.upcoming_followups||[]).map(f=>[f.patient_name, f.smart_id, f.follow_up_date, f.days_away+'d', f.last_diagnosis||'—'])
  )}

  ${s.overdue_followups > 0 ? `
  <h2>Overdue Follow-ups</h2>
  ${_wordTable(
    ['Patient','SmartID','Was Due','Days Overdue','Last Diagnosis'],
    (d.overdue_followups||[]).map(f=>[f.patient_name, f.smart_id, f.follow_up_date, f.days_overdue+'d overdue', f.last_diagnosis||'—'])
  )}` : ''}`;
}

/* ── Nurse Word body ── */
function _nurseWordBody(d) {
  const s = d.stats;
  return `
  <h2>Triage & Facility Summary</h2>
  <table>
    <tr class="stat-row"><td>Total Facility Patients</td><td>${s.total_patients}</td></tr>
    <tr class="stat-row"><td>Registered Today</td><td>${s.registered_today}</td></tr>
    <tr class="stat-row"><td>Registered This Week</td><td>${s.registered_week}</td></tr>
    <tr class="stat-row"><td>Encounters Today</td><td>${s.encounters_today}</td></tr>
    <tr class="stat-row"><td>Encounters This Month</td><td>${s.encounters_month}</td></tr>
    <tr class="stat-row"><td>Vitals Pending</td><td>${s.vitals_pending}</td></tr>
    <tr class="stat-row"><td>Allergy Alerts on File</td><td>${s.allergy_count}</td></tr>
    <tr class="stat-row"><td>Upcoming Follow-ups (7 days)</td><td>${s.upcoming_followups}</td></tr>
    <tr class="stat-row"><td>Overdue Follow-ups</td><td>${s.overdue_followups}</td></tr>
  </table>

  <h2>Today's Triage Queue</h2>
  ${_wordTable(
    ['Patient','SmartID','Age','Gender','Type','Clinician','Vitals','Allergy'],
    (d.todays_queue||[]).map(e=>[
      e.patient_name, e.smart_id, e.age+'y', e.gender,
      e.encounter_type, e.clinician_name,
      e.has_vitals ? 'Recorded' : 'Pending',
      e.has_allergy ? '⚠ '+e.allergies : 'None',
    ])
  )}

  <h2>Allergy Alert Register</h2>
  ${_wordTable(
    ['Patient','SmartID','Known Allergies','Blood Group'],
    (d.allergy_patients||[]).map(p=>[p.patient_name, p.smart_id, p.allergies, p.blood_group||'Unknown'])
  )}

  <h2>Encounter Types</h2>
  ${_wordTable(['Type','Count'], (d.enc_types||[]).map(e=>[e.encounter_type, e.cnt]))}`;
}

/* ── Admin Word body ── */
function _adminWordBody(d) {
  const s  = d.stats;
  const dq = d.data_quality || {};
  return `
  <h2>System-wide Statistics</h2>
  <table>
    <tr class="stat-row"><td>Total Registered Patients</td><td>${s.total_patients}</td></tr>
    <tr class="stat-row"><td>Total Clinical Encounters</td><td>${s.total_encounters}</td></tr>
    <tr class="stat-row"><td>Encounters This Month</td><td>${s.monthly_encounters}</td></tr>
    <tr class="stat-row"><td>Encounters Today</td><td>${s.today_encounters}</td></tr>
    <tr class="stat-row"><td>Total System Users</td><td>${s.total_users}</td></tr>
    <tr class="stat-row"><td>New Patients This Week</td><td>${s.new_this_week}</td></tr>
  </table>

  <h2>Patients by Facility</h2>
  ${_wordTable(['Facility','Patients'], (d.facility_patients||[]).map(f=>[f.facility||'Unknown', f.cnt]))}

  <h2>Encounters by Facility</h2>
  ${_wordTable(['Facility','Encounters'], (d.facility_encounters||[]).map(f=>[f.facility||'Unknown', f.cnt]))}

  <h2>Encounter Types</h2>
  ${_wordTable(['Type','Count'], (d.enc_types||[]).map(e=>[e.encounter_type, e.cnt]))}

  <h2>Top Diagnoses</h2>
  ${_wordTable(['Diagnosis','Count'], (d.top_diagnoses||[]).map(x=>[x.diagnosis, x.cnt]))}

  <h2>Gender Distribution</h2>
  ${_wordTable(['Gender','Count'], (d.gender_dist||[]).map(g=>[g.gender||'Unknown', g.cnt]))}

  <h2>Patients by Province</h2>
  ${_wordTable(['Province','Patients'], (d.province_dist||[]).map(p=>[p.province||'Unknown', p.cnt]))}

  <h2>Monthly Encounter Trend</h2>
  ${_wordTable(['Month','Encounters'], (d.monthly_trend||[]).map(m=>[m.month, m.cnt]))}

  <h2>Data Quality Indicators</h2>
  <table>
    <tr class="stat-row"><td>Missing phone numbers</td><td>${dq.no_phone||0}</td></tr>
    <tr class="stat-row"><td>Encounters with no vitals</td><td>${dq.no_vitals||0}</td></tr>
    <tr class="stat-row"><td>Patients missing NRC number</td><td>${dq.no_nrc||0}</td></tr>
  </table>`;
}

/* ── Word table helper ── */
function _wordTable(headers, rows) {
  if (!rows || rows.length === 0) {
    return '<p style="color:#94a3b8;font-style:italic">No data available.</p>';
  }
  const head = `<tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr>`;
  const body = rows.map(r=>
    `<tr>${r.map(c=>`<td>${c ?? '—'}</td>`).join('')}</tr>`
  ).join('');
  return `<table><thead>${head}</thead><tbody>${body}</tbody></table>`;
}

/* ════════════════════════════════════════════════════════
   ON-SCREEN ANALYTICS (shown in browser under the download bar)
   ════════════════════════════════════════════════════════ */
function _doctorReportHtml(d) {
  const s = d.stats;
  const maxDiag  = Math.max(...(d.top_diagnoses||[]).map(x=>x.cnt), 1);
  const maxType  = Math.max(...(d.enc_types||[]).map(x=>x.cnt), 1);
  const maxTrend = Math.max(...(d.monthly_trend||[]).map(t=>t.cnt), 1);
  return `
  <div class="grid-2 mb-4">
    <div class="card">
      <div class="card-header"><h3><i class="fa-solid fa-table-list fa-fw" style="color:var(--primary)"></i> Clinical Summary</h3></div>
      <div class="card-body">
        <table style="width:100%"><tbody>
          ${[
            ['My total patients', s.total_my_patients],
            ['My total encounters', s.total_my_encounters],
            ['Encounters today', s.today_my_encounters],
            ['Encounters this month', s.monthly_my_encounters],
            ['Upcoming follow-ups (14d)', s.upcoming_followups],
            ['Overdue follow-ups', s.overdue_followups],
          ].map(([k,v])=>`<tr>
            <td style="padding:9px 0;border-bottom:1px solid var(--border);color:var(--text2);font-size:13px">${k}</td>
            <td style="padding:9px 0;border-bottom:1px solid var(--border);font-weight:600;font-size:16px;color:var(--primary);text-align:right">${v}</td>
          </tr>`).join('')}
        </tbody></table>
      </div>
    </div>
    <div class="card">
      <div class="card-header"><h3><i class="fa-solid fa-disease fa-fw" style="color:var(--warn)"></i> Top Diagnoses</h3></div>
      <div class="card-body">
        ${(d.top_diagnoses||[]).length===0
          ? '<div class="empty-state"><p>No diagnoses yet</p></div>'
          : `<div class="bar-chart">${(d.top_diagnoses||[]).map(x=>`
          <div class="bar-row">
            <div class="bar-label" title="${x.diagnosis}">${x.diagnosis}</div>
            <div class="bar-track"><div class="bar-fill" style="width:${Math.round((x.cnt/maxDiag)*100)}%"></div></div>
            <div class="bar-val">${x.cnt}</div>
          </div>`).join('')}</div>`}
      </div>
    </div>
  </div>
  <div class="grid-2 mb-4">
    <div class="card">
      <div class="card-header"><h3><i class="fa-solid fa-clipboard-list fa-fw" style="color:var(--primary)"></i> Encounter Types</h3></div>
      <div class="card-body">
        <div class="bar-chart">${(d.enc_types||[]).map(e=>`
          <div class="bar-row">
            <div class="bar-label">${e.encounter_type}</div>
            <div class="bar-track"><div class="bar-fill" style="width:${Math.round((e.cnt/maxType)*100)}%"></div></div>
            <div class="bar-val">${e.cnt}</div>
          </div>`).join('')}</div>
      </div>
    </div>
    <div class="card">
      <div class="card-header"><h3><i class="fa-solid fa-chart-line fa-fw" style="color:var(--primary)"></i> Monthly Trend</h3></div>
      <div class="card-body">
        <div class="trend-chart" style="height:70px">
          ${(d.monthly_trend||[]).map(m=>`
          <div class="trend-bar" style="height:${Math.max(6,Math.round((m.cnt/maxTrend)*64))}px">
            <div class="tip">${m.month}: ${m.cnt}</div>
          </div>`).join('')}
        </div>
        <div style="display:flex;margin-top:8px">
          ${(d.monthly_trend||[]).map(m=>`
          <div style="flex:1;text-align:center;font-size:10px;color:var(--text3)">${m.month.slice(5)}<br>${m.cnt}</div>`).join('')}
        </div>
      </div>
    </div>
  </div>
  <div class="card">
    <div class="card-header">
      <h3><i class="fa-solid fa-calendar-check fa-fw" style="color:var(--accent)"></i> Upcoming Follow-ups</h3>
      <span class="badge badge-blue">${s.upcoming_followups}</span>
    </div>
    <div class="table-wrap"><table>
      <thead><tr><th>Patient</th><th>SmartID</th><th>Follow-up</th><th>Days Away</th><th>Last Diagnosis</th></tr></thead>
      <tbody>
        ${(d.upcoming_followups||[]).length===0
          ? '<tr><td colspan="5"><div class="empty-state"><p>No upcoming follow-ups</p></div></td></tr>'
          : (d.upcoming_followups||[]).map(f=>`
          <tr>
            <td class="patient-name">${f.patient_name}</td>
            <td><span class="tag">${f.smart_id}</span></td>
            <td style="font-size:12px">${f.follow_up_date}</td>
            <td><span class="badge ${f.days_away<=1?'badge-warn':'badge-blue'}">${f.days_away===0?'Today':f.days_away+'d'}</span></td>
            <td style="font-size:12px">${f.last_diagnosis||'—'}</td>
          </tr>`).join('')}
      </tbody>
    </table></div>
  </div>`;
}

function _nurseReportHtml(d) {
  const s = d.stats;
  const maxType = Math.max(...(d.enc_types||[]).map(x=>x.cnt), 1);
  return `
  <div class="grid-2 mb-4">
    <div class="card">
      <div class="card-header"><h3><i class="fa-solid fa-table-list fa-fw" style="color:var(--accent)"></i> Facility Summary</h3></div>
      <div class="card-body">
        <table style="width:100%"><tbody>
          ${[
            ['Total facility patients', s.total_patients],
            ['Registered today', s.registered_today],
            ['Registered this week', s.registered_week],
            ['Encounters today', s.encounters_today],
            ['Vitals pending', s.vitals_pending],
            ['Allergy alerts on file', s.allergy_count],
            ['Upcoming follow-ups', s.upcoming_followups],
            ['Overdue follow-ups', s.overdue_followups],
          ].map(([k,v])=>`<tr>
            <td style="padding:9px 0;border-bottom:1px solid var(--border);color:var(--text2);font-size:13px">${k}</td>
            <td style="padding:9px 0;border-bottom:1px solid var(--border);font-weight:600;font-size:16px;color:var(--accent);text-align:right">${v}</td>
          </tr>`).join('')}
        </tbody></table>
      </div>
    </div>
    <div class="card">
      <div class="card-header"><h3><i class="fa-solid fa-chart-pie fa-fw" style="color:var(--primary)"></i> Encounter Types</h3></div>
      <div class="card-body">
        <div class="bar-chart">${(d.enc_types||[]).map(e=>`
          <div class="bar-row">
            <div class="bar-label">${e.encounter_type}</div>
            <div class="bar-track"><div class="bar-fill accent" style="width:${Math.round((e.cnt/maxType)*100)}%"></div></div>
            <div class="bar-val">${e.cnt}</div>
          </div>`).join('')}</div>
      </div>
    </div>
  </div>
  <div class="card">
    <div class="card-header">
      <h3><i class="fa-solid fa-shield-virus fa-fw" style="color:var(--warn)"></i> Allergy Alert Register</h3>
      <span class="badge badge-warn">${s.allergy_count} patients</span>
    </div>
    <div class="table-wrap"><table>
      <thead><tr><th>Patient</th><th>SmartID</th><th>Known Allergies</th><th>Blood Group</th></tr></thead>
      <tbody>
        ${(d.allergy_patients||[]).length===0
          ? '<tr><td colspan="4"><div class="empty-state"><p>No allergy records</p></div></td></tr>'
          : (d.allergy_patients||[]).map(p=>`
          <tr>
            <td class="patient-name">${p.patient_name}</td>
            <td><span class="tag">${p.smart_id}</span></td>
            <td><span class="badge badge-warn"><i class="fa-solid fa-triangle-exclamation"></i> ${p.allergies}</span></td>
            <td style="font-size:12px">${p.blood_group||'Unknown'}</td>
          </tr>`).join('')}
      </tbody>
    </table></div>
  </div>`;
}

function _adminReportHtml(d) {
  const s  = d.stats;
  const dq = d.data_quality || {};
  const maxFacP = Math.max(...(d.facility_patients||[]).map(x=>x.cnt), 1);
  const maxFacE = Math.max(...(d.facility_encounters||[]).map(x=>x.cnt), 1);
  const maxDiag = Math.max(...(d.top_diagnoses||[]).map(x=>x.cnt), 1);
  const maxTrend= Math.max(...(d.monthly_trend||[]).map(t=>t.cnt), 1);
  return `
  <div class="grid-2 mb-4">
    <div class="card">
      <div class="card-header"><h3><i class="fa-solid fa-table-list fa-fw" style="color:var(--warn)"></i> System Summary</h3></div>
      <div class="card-body">
        <table style="width:100%"><tbody>
          ${[
            ['Total registered patients', s.total_patients],
            ['Total clinical encounters', s.total_encounters],
            ['Encounters this month', s.monthly_encounters],
            ['Encounters today', s.today_encounters],
            ['Total system users', s.total_users],
            ['New patients this week', s.new_this_week],
          ].map(([k,v])=>`<tr>
            <td style="padding:9px 0;border-bottom:1px solid var(--border);color:var(--text2);font-size:13px">${k}</td>
            <td style="padding:9px 0;border-bottom:1px solid var(--border);font-weight:600;font-size:16px;color:var(--warn);text-align:right">${v}</td>
          </tr>`).join('')}
        </tbody></table>
      </div>
    </div>
    <div class="card">
      <div class="card-header"><h3><i class="fa-solid fa-chart-line fa-fw" style="color:var(--primary)"></i> Monthly Trend</h3></div>
      <div class="card-body">
        <div class="trend-chart" style="height:70px">
          ${(d.monthly_trend||[]).map(m=>`
          <div class="trend-bar" style="height:${Math.max(6,Math.round((m.cnt/maxTrend)*64))}px">
            <div class="tip">${m.month}: ${m.cnt}</div>
          </div>`).join('')}
        </div>
        <div style="display:flex;margin-top:8px">
          ${(d.monthly_trend||[]).map(m=>`
          <div style="flex:1;text-align:center;font-size:10px;color:var(--text3)">${m.month.slice(5)}<br>${m.cnt}</div>`).join('')}
        </div>
      </div>
    </div>
  </div>
  <div class="grid-2 mb-4">
    <div class="card">
      <div class="card-header"><h3><i class="fa-solid fa-hospital fa-fw" style="color:var(--primary)"></i> Patients by Facility</h3></div>
      <div class="card-body"><div class="bar-chart">
        ${(d.facility_patients||[]).map(f=>`<div class="bar-row">
          <div class="bar-label" title="${f.facility||'Unknown'}">${f.facility||'Unknown'}</div>
          <div class="bar-track"><div class="bar-fill" style="width:${Math.round((f.cnt/maxFacP)*100)}%"></div></div>
          <div class="bar-val">${f.cnt}</div>
        </div>`).join('')}
      </div></div>
    </div>
    <div class="card">
      <div class="card-header"><h3><i class="fa-solid fa-chart-bar fa-fw" style="color:var(--accent)"></i> Encounters by Facility</h3></div>
      <div class="card-body"><div class="bar-chart">
        ${(d.facility_encounters||[]).map(f=>`<div class="bar-row">
          <div class="bar-label" title="${f.facility||'Unknown'}">${f.facility||'Unknown'}</div>
          <div class="bar-track"><div class="bar-fill accent" style="width:${Math.round((f.cnt/maxFacE)*100)}%"></div></div>
          <div class="bar-val">${f.cnt}</div>
        </div>`).join('')}
      </div></div>
    </div>
  </div>
  <div class="grid-2 mb-4">
    <div class="card">
      <div class="card-header"><h3><i class="fa-solid fa-disease fa-fw" style="color:var(--warn)"></i> Top Diagnoses</h3></div>
      <div class="card-body"><div class="bar-chart">
        ${(d.top_diagnoses||[]).map(x=>`<div class="bar-row">
          <div class="bar-label" title="${x.diagnosis}">${x.diagnosis}</div>
          <div class="bar-track"><div class="bar-fill" style="width:${Math.round((x.cnt/maxDiag)*100)}%"></div></div>
          <div class="bar-val">${x.cnt}</div>
        </div>`).join('')}
      </div></div>
    </div>
    <div class="card">
      <div class="card-header"><h3><i class="fa-solid fa-circle-exclamation fa-fw" style="color:var(--warn)"></i> Data Quality</h3></div>
      <div class="card-body">
        <table style="width:100%"><tbody>
          <tr><td style="padding:9px 0;border-bottom:1px solid var(--border);color:var(--text2);font-size:13px">Missing phone numbers</td>
            <td style="padding:9px 0;border-bottom:1px solid var(--border);font-weight:700;font-size:18px;color:${dq.no_phone>0?'var(--danger)':'var(--accent)'};text-align:right">${dq.no_phone||0}</td></tr>
          <tr><td style="padding:9px 0;border-bottom:1px solid var(--border);color:var(--text2);font-size:13px">Encounters with no vitals</td>
            <td style="padding:9px 0;border-bottom:1px solid var(--border);font-weight:700;font-size:18px;color:${dq.no_vitals>0?'var(--warn)':'var(--accent)'};text-align:right">${dq.no_vitals||0}</td></tr>
          <tr><td style="padding:9px 0;color:var(--text2);font-size:13px">Patients missing NRC</td>
            <td style="padding:9px 0;font-weight:700;font-size:18px;color:${dq.no_nrc>0?'var(--primary)':'var(--accent)'};text-align:right">${dq.no_nrc||0}</td></tr>
        </tbody></table>
      </div>
    </div>
  </div>`;
}

/* ════════════════════════════════════════════════════════
   SHARED DOWNLOAD TRIGGER
   ════════════════════════════════════════════════════════ */
function _triggerDownload(content, filename, mimeType) {
  const bom  = mimeType.includes('csv') ? '\uFEFF' : ''; // BOM for Excel UTF-8
  const blob = new Blob([bom + content], { type: mimeType });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
