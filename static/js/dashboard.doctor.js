/* ============================================================
   DOCTOR DASHBOARD  — v6  (department-aware specialty panels)
   ============================================================ */

/* ── Specialty panel — unique per department ───────────────── */
function _deptPanel(d) {
  const dept = (d.department || '').toLowerCase();

  /* ── Internal Medicine ── */
  if (dept.includes('internal')) {
    return `
<div class="card mb-4" style="border-left:4px solid var(--primary)">
  <div class="card-icon-header">
    <div class="chi-icon" style="background:var(--primary-ghost);color:var(--primary)">
      <i class="fa-solid fa-pills"></i>
    </div>
    <h3>Internal Medicine — Daily Focus</h3>
    <div class="chi-right"><span class="badge badge-blue">Internal Medicine</span></div>
  </div>
  <div class="card-body">
    <p style="font-size:12px;color:var(--text2);margin-bottom:14px">
      Checklist for chronic-disease patients seen today. Tick off as you go.
    </p>
    <div class="dept-checklist">
      ${[
        ['fa-virus-covid',     'var(--danger)',  'HIV/ART patients: confirm VL status &amp; regimen'],
        ['fa-mosquito',        'var(--warn)',    'Malaria cases: verify AL completion &amp; schedule follow-up'],
        ['fa-heart',           'var(--primary)', 'Hypertension: review BP readings &amp; medication adherence'],
        ['fa-droplet',         'var(--accent)',  'Diabetes: check blood glucose records'],
        ['fa-lungs',           'var(--primary)', 'Respiratory: flag any low SpO₂ (&lt;94%) patients'],
        ['fa-notes-medical',   'var(--text2)',   'Discharge summaries: complete outstanding notes'],
      ].map(([ic, col, txt]) => `
      <label class="dept-check-row">
        <input type="checkbox" class="dept-cb">
        <i class="fa-solid ${ic}" style="color:${col};width:16px;text-align:center"></i>
        <span>${txt}</span>
      </label>`).join('')}
    </div>
    <div style="margin-top:16px;display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn btn-sm" style="background:var(--primary-ghost);color:var(--primary)"
              onclick="navigate('encounters')">
        <i class="fa-solid fa-stethoscope"></i> ART Encounters
      </button>
      <button class="btn btn-sm" style="background:var(--warn-light);color:var(--warn)"
              onclick="showEncounterModalSearch()">
        <i class="fa-solid fa-plus"></i> New Encounter
      </button>
    </div>
  </div>
</div>`;
  }

  /* ── Cardiology ── */
  if (dept.includes('cardiol')) {
    return `
<div class="card mb-4" style="border-left:4px solid var(--danger)">
  <div class="card-icon-header">
    <div class="chi-icon" style="background:var(--danger-light);color:var(--danger)">
      <i class="fa-solid fa-heart-pulse"></i>
    </div>
    <h3>Cardiology — Monitoring Priorities</h3>
    <div class="chi-right"><span class="badge badge-red">Cardiology</span></div>
  </div>
  <div class="card-body">
    <p style="font-size:12px;color:var(--text2);margin-bottom:14px">
      Cardiac monitoring tasks and high-priority patient alerts for today.
    </p>
    <div class="dept-checklist">
      ${[
        ['fa-gauge-high',      'var(--danger)',  'Hypertensive urgency patients: BP &gt;180/120 — review immediately'],
        ['fa-heart-crack',     'var(--danger)',  'Chest pain presentations: confirm ECG ordered &amp; reviewed'],
        ['fa-pills',           'var(--primary)', 'Anti-hypertensives: verify patients have adequate supply'],
        ['fa-calendar-check',  'var(--accent)',  'Post-admission follow-ups: cardiac patients discharged this month'],
        ['fa-stethoscope',     'var(--primary)', 'Auscultation findings: document murmurs or arrhythmias'],
        ['fa-file-waveform',   'var(--warn)',    'Referral letters: complete pending cardiology referrals'],
      ].map(([ic, col, txt]) => `
      <label class="dept-check-row">
        <input type="checkbox" class="dept-cb">
        <i class="fa-solid ${ic}" style="color:${col};width:16px;text-align:center"></i>
        <span>${txt}</span>
      </label>`).join('')}
    </div>
    <div style="margin-top:16px;display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn btn-sm" style="background:var(--danger-light);color:var(--danger)"
              onclick="navigate('encounters')">
        <i class="fa-solid fa-heart-pulse"></i> Cardiac Encounters
      </button>
      <button class="btn btn-sm" style="background:var(--primary-ghost);color:var(--primary)"
              onclick="navigateAI()">
        <i class="fa-solid fa-robot"></i> AI Clinical Assist
      </button>
    </div>
  </div>
</div>`;
  }

  /* ── General Practice ── */
  if (dept.includes('general')) {
    return `
<div class="card mb-4" style="border-left:4px solid var(--accent)">
  <div class="card-icon-header">
    <div class="chi-icon" style="background:var(--accent-light);color:var(--accent)">
      <i class="fa-solid fa-house-medical"></i>
    </div>
    <h3>General Practice — Today's Task List</h3>
    <div class="chi-right"><span class="badge badge-green">General Practice</span></div>
  </div>
  <div class="card-body">
    <p style="font-size:12px;color:var(--text2);margin-bottom:14px">
      Daily GP workflow. Review referrals, complete notes, and manage your patient queue.
    </p>
    <div class="dept-checklist">
      ${[
        ['fa-clipboard-check',  'var(--accent)',  'Morning queue: review all booked patients for today'],
        ['fa-right-from-bracket','var(--warn)',   'Referrals: complete outstanding referral letters'],
        ['fa-prescription',     'var(--primary)', 'Prescriptions: sign off repeat scripts awaiting approval'],
        ['fa-triangle-exclamation','var(--danger)','Urgent walk-ins: triage any unscheduled patients'],
        ['fa-notes-medical',    'var(--text2)',   'SOAP notes: finalise all incomplete encounter notes'],
        ['fa-phone',            'var(--accent)',  'Recall reminders: contact overdue chronic patients'],
      ].map(([ic, col, txt]) => `
      <label class="dept-check-row">
        <input type="checkbox" class="dept-cb">
        <i class="fa-solid ${ic}" style="color:${col};width:16px;text-align:center"></i>
        <span>${txt}</span>
      </label>`).join('')}
    </div>
    <div style="margin-top:16px;display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn btn-sm" style="background:var(--accent-light);color:var(--accent)"
              onclick="showEncounterModalSearch()">
        <i class="fa-solid fa-user-plus"></i> New Consultation
      </button>
      <button class="btn btn-sm" style="background:var(--primary-ghost);color:var(--primary)"
              onclick="navigate('patients')">
        <i class="fa-solid fa-users"></i> Patient List
      </button>
    </div>
  </div>
</div>`;
  }

  /* ── Surgery ── */
  if (dept.includes('surg')) {
    return `
<div class="card mb-4" style="border-left:4px solid var(--warn)">
  <div class="card-icon-header">
    <div class="chi-icon" style="background:var(--warn-light);color:var(--warn)">
      <i class="fa-solid fa-scalpel"></i>
    </div>
    <h3>Surgery — Pre &amp; Post-Op Checklist</h3>
    <div class="chi-right"><span class="badge badge-warn">Surgery</span></div>
  </div>
  <div class="card-body">
    <p style="font-size:12px;color:var(--text2);margin-bottom:14px">
      Surgical safety checklist — complete before and after each procedure.
    </p>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:0 24px">
      <div>
        <div style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">Pre-Operative</div>
        <div class="dept-checklist">
          ${[
            ['fa-file-medical',    'var(--primary)', 'Consent form signed &amp; documented'],
            ['fa-vials',           'var(--accent)',  'Blood group &amp; cross-match confirmed'],
            ['fa-ban',             'var(--warn)',    'Allergies reviewed &amp; flagged to theatre'],
            ['fa-syringe',         'var(--primary)', 'Anaesthetic review completed'],
          ].map(([ic, col, txt]) => `
          <label class="dept-check-row">
            <input type="checkbox" class="dept-cb">
            <i class="fa-solid ${ic}" style="color:${col};width:16px;text-align:center"></i>
            <span>${txt}</span>
          </label>`).join('')}
        </div>
      </div>
      <div>
        <div style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">Post-Operative</div>
        <div class="dept-checklist">
          ${[
            ['fa-heart-pulse',     'var(--danger)',  'Vitals stable — hourly monitoring confirmed'],
            ['fa-bandage',         'var(--warn)',    'Wound dressing reviewed, no signs of infection'],
            ['fa-pills',           'var(--primary)', 'Analgesia &amp; antibiotics prescribed &amp; charted'],
            ['fa-calendar-check',  'var(--accent)',  'Discharge plan &amp; follow-up date set'],
          ].map(([ic, col, txt]) => `
          <label class="dept-check-row">
            <input type="checkbox" class="dept-cb">
            <i class="fa-solid ${ic}" style="color:${col};width:16px;text-align:center"></i>
            <span>${txt}</span>
          </label>`).join('')}
        </div>
      </div>
    </div>
    <div style="margin-top:16px;display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn btn-sm" style="background:var(--warn-light);color:var(--warn)"
              onclick="navigate('encounters')">
        <i class="fa-solid fa-clipboard-list"></i> Inpatient List
      </button>
      <button class="btn btn-sm" style="background:var(--primary-ghost);color:var(--primary)"
              onclick="showEncounterModalSearch()">
        <i class="fa-solid fa-plus"></i> Record Procedure
      </button>
    </div>
  </div>
</div>`;
  }

  /* ── Obs & Gynaecology ── */
  if (dept.includes('obs') || dept.includes('gyn')) {
    return `
<div class="card mb-4" style="border-left:4px solid #e879a6">
  <div class="card-icon-header">
    <div class="chi-icon" style="background:#fce7f3;color:#db2777">
      <i class="fa-solid fa-person-pregnant"></i>
    </div>
    <h3>Obs &amp; Gynaecology — Antenatal Tracker</h3>
    <div class="chi-right"><span class="badge" style="background:#fce7f3;color:#db2777">Obs &amp; Gynae</span></div>
  </div>
  <div class="card-body">
    <p style="font-size:12px;color:var(--text2);margin-bottom:14px">
      Antenatal care priorities and MCH checklist for today's clinic.
    </p>
    <div class="dept-checklist">
      ${[
        ['fa-person-pregnant',  '#db2777',        'ANC visits: confirm all 8 contacts are on track'],
        ['fa-droplet',          'var(--danger)',   'Haemoglobin: flag anaemia (Hb &lt;10 g/dL) patients'],
        ['fa-gauge',            'var(--warn)',     'Pre-eclampsia screen: BP &gt;140/90 — escalate immediately'],
        ['fa-syringe',          'var(--primary)',  'TT &amp; IPTp doses: verify immunisation &amp; malaria prophylaxis'],
        ['fa-baby',             '#db2777',         'Foetal movements: confirm patients reporting movement'],
        ['fa-notes-medical',    'var(--text2)',    'Delivery plans: document birth plans for &ge;36 week patients'],
      ].map(([ic, col, txt]) => `
      <label class="dept-check-row">
        <input type="checkbox" class="dept-cb">
        <i class="fa-solid ${ic}" style="color:${col};width:16px;text-align:center"></i>
        <span>${txt}</span>
      </label>`).join('')}
    </div>
    <div style="margin-top:16px;display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn btn-sm" style="background:#fce7f3;color:#db2777"
              onclick="navigate('encounters')">
        <i class="fa-solid fa-person-pregnant"></i> MCH Encounters
      </button>
      <button class="btn btn-sm" style="background:var(--primary-ghost);color:var(--primary)"
              onclick="navigateAI()">
        <i class="fa-solid fa-robot"></i> AI Clinical Assist
      </button>
    </div>
  </div>
</div>`;
  }

  /* ── fallback: no department panel ── */
  return '';
}

/* ── Main render ────────────────────────────────────────────── */
function renderDoctorDashboard(d) {
  const el = document.getElementById('page-content');
  if (!el) return;

  const s        = d.stats;
  const _max     = (arr, fn) => arr.length ? arr.reduce((m, x) => Math.max(m, fn(x)), 0) || 1 : 1;
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
      ${d.facility}${d.department ? ' &nbsp;·&nbsp; ' + d.department : ''} &nbsp;·&nbsp; ${today}
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

<!-- ═══ SPECIALTY PANEL (unique per department) ═══ -->
${_deptPanel(d)}

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
