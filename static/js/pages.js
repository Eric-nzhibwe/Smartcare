/* ============================================================
   SHARED PAGES — Patients, Encounters, Reports, Users
   + all patient/encounter/user modals
   ============================================================ */

// ── PATIENTS LIST ─────────────────────────────────────────
async function renderPatients(q='') {
  const patients = await api(`/api/patients?q=${encodeURIComponent(q)}`);
  if (!patients) return;
  document.getElementById('page-content').innerHTML = `
  <div class="page-toolbar">
    <div class="search-bar" style="max-width:420px;flex:1">
      <i class="fa-solid fa-magnifying-glass"></i>
      <input type="text" id="patient-search"
             placeholder="Search name, SmartID, NRC, phone…"
             value="${q}" oninput="debounceSearch(this.value)">
    </div>
    <button class="btn btn-primary" onclick="showRegisterModal()">
      <i class="fa-solid fa-user-plus"></i> Register Patient
    </button>
  </div>
  <div class="card">
    <div class="card-header">
      <h3>${patients.length} patient${patients.length!==1?'s':''}</h3>
    </div>
    <div class="table-wrap"><table>
      <thead>
        <tr>
          <th>Patient</th><th>SmartID</th><th>Age / Gender</th>
          <th>Province</th><th>Facility</th><th>Status</th><th></th>
        </tr>
      </thead>
      <tbody>
        ${patients.length === 0
          ? `<tr><td colspan="7"><div class="empty-state"><p>No patients found</p></div></td></tr>`
          : patients.map(p=>`
          <tr>
            <td>
              <div style="display:flex;align-items:center;gap:8px">
                <div class="user-avatar" style="width:30px;height:30px;font-size:11px;background:var(--primary-ghost);color:var(--primary)">
                  ${initials(p.first_name+' '+p.last_name)}
                </div>
                <div>
                  <div class="patient-name">${p.first_name} ${p.last_name}</div>
                  <div style="font-size:11px;color:var(--text3)">${p.phone||''}</div>
                </div>
              </div>
            </td>
            <td><span class="tag">${p.smart_id}</span></td>
            <td>${age(p.date_of_birth)} yrs · ${genderBadge(p.gender)}</td>
            <td>${p.province||'—'}</td>
            <td style="font-size:12px">${p.facility||'—'}</td>
            <td><span class="badge badge-green">Active</span></td>
            <td><button class="btn btn-ghost btn-sm" onclick="viewPatient(${p.id})">View →</button></td>
          </tr>`).join('')}
      </tbody>
    </table></div>
  </div>`;
}

let searchTimer;
function debounceSearch(v) {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => renderPatients(v), 300);
}

// ── PATIENT DETAIL VIEW ───────────────────────────────────
async function viewPatient(pid) {
  const data = await api(`/api/patients/${pid}`);
  if (!data) return;
  const p = data.patient;
  const encs = data.encounters;
  const hasAllergy = p.allergies && p.allergies !== 'None' && p.allergies !== '';

  document.getElementById('page-content').innerHTML = `
  <div style="margin-bottom:14px">
    <button class="btn btn-outline btn-sm" onclick="navigate('patients')">
      <i class="fa-solid fa-arrow-left"></i> Back to patients
    </button>
  </div>
  <div class="card mb-4">
    <div class="patient-header">
      <div class="patient-avatar">${initials(p.first_name+' '+p.last_name)}</div>
      <div class="patient-meta">
        <h2>${p.first_name} ${p.last_name}</h2>
        <span class="smart-id">${p.smart_id}</span>
        <div style="display:flex;gap:8px;margin-top:6px;flex-wrap:wrap">
          ${genderBadge(p.gender)}
          <span class="badge badge-gray">${age(p.date_of_birth)} years old</span>
          <span class="badge badge-gray">${p.blood_group||'Blood group unknown'}</span>
          ${hasAllergy ? `<span class="badge badge-warn"><i class="fa-solid fa-triangle-exclamation"></i> ${p.allergies}</span>` : ''}
        </div>
      </div>
      <div class="patient-actions">
        <button class="btn btn-outline btn-sm"
          onclick="showEncounterModal(${p.id},'${(p.first_name+' '+p.last_name).replace(/'/g,"\\'")}')">
          <i class="fa-solid fa-plus"></i> New Encounter
        </button>
        <button class="btn btn-ghost btn-sm" onclick="showEditPatientModal(${p.id})">
          <i class="fa-solid fa-pen-to-square"></i> Edit
        </button>
      </div>
    </div>
    <div class="info-grid">
      <div class="info-item"><div class="key">Date of Birth</div><div class="val">${fmtDate(p.date_of_birth)}</div></div>
      <div class="info-item"><div class="key">NRC Number</div><div class="val">${p.nrc_number||'—'}</div></div>
      <div class="info-item"><div class="key">Phone</div><div class="val">${p.phone||'—'}</div></div>
      <div class="info-item"><div class="key">Province</div><div class="val">${p.province||'—'}</div></div>
      <div class="info-item"><div class="key">District</div><div class="val">${p.district||'—'}</div></div>
      <div class="info-item"><div class="key">Facility</div><div class="val">${p.facility||'—'}</div></div>
      <div class="info-item"><div class="key">Address</div><div class="val">${p.address||'—'}</div></div>
      <div class="info-item"><div class="key">Next of Kin</div><div class="val">${p.next_of_kin||'—'}</div></div>
      <div class="info-item"><div class="key">NOK Phone</div><div class="val">${p.next_of_kin_phone||'—'}</div></div>
    </div>
  </div>
  <div class="card">
    <div class="card-header">
      <h3>Clinical Encounters (${encs.length})</h3>
      <button class="btn btn-primary btn-sm"
        onclick="showEncounterModal(${p.id},'${(p.first_name+' '+p.last_name).replace(/'/g,"\\'")}')">
        <i class="fa-solid fa-plus"></i> New Encounter
      </button>
    </div>
    <div class="card-body" style="padding:12px 14px">
      ${encs.length === 0
        ? `<div class="empty-state"><p>No encounters recorded yet</p></div>`
        : encs.map((e,i)=>`
        <div class="enc-card">
          <div class="enc-header" onclick="toggleEnc(this)">
            <div class="enc-header-left">
              ${encTypeBadge(e.encounter_type)}
              <span style="font-weight:500;font-size:13px">${e.diagnosis||e.chief_complaint||'Encounter'}</span>
              ${e.diagnosis_code ? `<span class="tag">${e.diagnosis_code}</span>` : ''}
            </div>
            <div class="enc-header-right">
              <span style="font-size:12px;color:var(--text3)">${fmtDate(e.visit_date)}</span>
              <i class="fa-solid fa-chevron-down chevron" style="font-size:12px;color:var(--text3);transition:transform .2s"></i>
            </div>
          </div>
          <div class="enc-body ${i===0?'open':''}">
            ${e.temperature||e.pulse||e.blood_pressure ? `
            <div class="vitals-row">
              ${e.temperature  ? `<div class="vital"><div class="v-label">Temp</div><div class="v-val">${e.temperature}°</div><div class="v-unit">°C</div></div>` : ''}
              ${e.pulse        ? `<div class="vital"><div class="v-label">Pulse</div><div class="v-val">${e.pulse}</div><div class="v-unit">bpm</div></div>` : ''}
              ${e.blood_pressure ? `<div class="vital"><div class="v-label">BP</div><div class="v-val">${e.blood_pressure}</div><div class="v-unit">mmHg</div></div>` : ''}
              ${e.weight       ? `<div class="vital"><div class="v-label">Weight</div><div class="v-val">${e.weight}</div><div class="v-unit">kg</div></div>` : ''}
              ${e.oxygen_sat   ? `<div class="vital"><div class="v-label">SpO₂</div><div class="v-val">${e.oxygen_sat}%</div><div class="v-unit"></div></div>` : ''}
            </div>` : ''}
            <div class="enc-detail-grid" style="padding:12px 0">
              ${e.chief_complaint ? `<div class="enc-detail"><div class="key">Chief complaint</div><div class="val">${e.chief_complaint}</div></div>` : ''}
              ${e.diagnosis   ? `<div class="enc-detail"><div class="key">Diagnosis</div><div class="val">${e.diagnosis}</div></div>` : ''}
              ${e.treatment   ? `<div class="enc-detail"><div class="key">Treatment plan</div><div class="val">${e.treatment}</div></div>` : ''}
              ${e.medications ? `<div class="enc-detail"><div class="key">Medications</div><div class="val">${e.medications}</div></div>` : ''}
              ${e.notes       ? `<div class="enc-detail"><div class="key">Clinical notes</div><div class="val">${e.notes}</div></div>` : ''}
              ${e.follow_up_date ? `<div class="enc-detail"><div class="key">Follow-up</div><div class="val">${fmtDate(e.follow_up_date)}</div></div>` : ''}
            </div>
          </div>
        </div>`).join('')}
    </div>
  </div>`;
}

function toggleEnc(header) {
  const body    = header.nextElementSibling;
  const chevron = header.querySelector('.chevron');
  body.classList.toggle('open');
  chevron.style.transform = body.classList.contains('open') ? 'rotate(180deg)' : '';
}

// ── REGISTER / EDIT PATIENT MODALS ───────────────────────
function showRegisterModal(prefill={}) {
  const provinces = ['Lusaka','Copperbelt','Central','Eastern','Luapula','Muchinga','North-Western','Northern','Southern','Western'];
  openModal('Register New Patient', `
  <div class="form-grid">
    <div class="field"><label>First Name *</label><input id="rf-first" value="${prefill.first_name||''}" placeholder="First name"></div>
    <div class="field"><label>Last Name *</label><input id="rf-last" value="${prefill.last_name||''}" placeholder="Last name"></div>
    <div class="field"><label>Date of Birth *</label><input id="rf-dob" type="date" value="${prefill.date_of_birth||''}"></div>
    <div class="field"><label>Gender *</label>
      <select id="rf-gender">
        ${['Male','Female','Other'].map(g=>`<option ${g===(prefill.gender||'Male')?'selected':''}>${g}</option>`).join('')}
      </select>
    </div>
    <div class="field"><label>NRC Number</label><input id="rf-nrc" placeholder="123456/78/1" value="${prefill.nrc_number||''}"></div>
    <div class="field"><label>Phone</label><input id="rf-phone" type="tel" placeholder="+260 97 1234567" value="${prefill.phone||''}"></div>
    <div class="section-divider"><h4>Location & Facility</h4></div>
    <div class="field"><label>Province</label>
      <select id="rf-province">${provinces.map(p=>`<option ${p===prefill.province?'selected':''}>${p}</option>`).join('')}</select>
    </div>
    <div class="field"><label>District</label><input id="rf-district" placeholder="e.g. Lusaka District" value="${prefill.district||''}"></div>
    <div class="field span-2"><label>Address</label><input id="rf-address" placeholder="Plot / Street / Area" value="${prefill.address||''}"></div>
    <div class="field span-2"><label>Facility</label><input id="rf-facility" placeholder="Health facility name" value="${prefill.facility||currentUser.facility||''}"></div>
    <div class="section-divider"><h4>Clinical Info</h4></div>
    <div class="field"><label>Blood Group</label>
      <select id="rf-blood">
        <option value="">Unknown</option>
        ${['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(b=>`<option ${b===prefill.blood_group?'selected':''}>${b}</option>`).join('')}
      </select>
    </div>
    <div class="field"><label>Known Allergies</label><input id="rf-allergy" placeholder="e.g. Penicillin, or None" value="${prefill.allergies||''}"></div>
    <div class="section-divider"><h4>Next of Kin</h4></div>
    <div class="field"><label>Name</label><input id="rf-kin" placeholder="Full name" value="${prefill.next_of_kin||''}"></div>
    <div class="field"><label>Phone</label><input id="rf-kin-phone" type="tel" placeholder="+260 97…" value="${prefill.next_of_kin_phone||''}"></div>
  </div>`,
  `<button class="btn btn-outline" onclick="closeModal()"><i class="fa-solid fa-xmark"></i> Cancel</button>
   <button class="btn btn-primary" onclick="submitRegister()"><i class="fa-solid fa-user-plus"></i> Register Patient</button>`);
}

function _collectPatientForm() {
  return {
    first_name:        document.getElementById('rf-first').value.trim(),
    last_name:         document.getElementById('rf-last').value.trim(),
    date_of_birth:     document.getElementById('rf-dob').value,
    gender:            document.getElementById('rf-gender').value,
    nrc_number:        document.getElementById('rf-nrc').value.trim(),
    phone:             document.getElementById('rf-phone').value.trim(),
    province:          document.getElementById('rf-province').value,
    district:          document.getElementById('rf-district').value.trim(),
    address:           document.getElementById('rf-address').value.trim(),
    facility:          document.getElementById('rf-facility').value.trim(),
    blood_group:       document.getElementById('rf-blood').value,
    allergies:         document.getElementById('rf-allergy').value.trim(),
    next_of_kin:       document.getElementById('rf-kin').value.trim(),
    next_of_kin_phone: document.getElementById('rf-kin-phone').value.trim(),
  };
}

async function submitRegister() {
  const d = _collectPatientForm();
  if (!d.first_name || !d.last_name || !d.date_of_birth) {
    toast('Please fill in required fields (name, DOB)', 'error'); return;
  }
  const res = await api('/api/patients', {method:'POST', body:JSON.stringify(d)});
  if (res && res.success) {
    closeModal();
    toast(`Patient registered — SmartID: ${res.smart_id}`, 'success');
    navigate('patients');
  } else {
    toast(res?.error || 'Registration failed', 'error');
  }
}

async function showEditPatientModal(pid) {
  const data = await api(`/api/patients/${pid}`);
  if (!data) return;
  showRegisterModal(data.patient);
  document.getElementById('modal-title').textContent = 'Edit Patient';
  document.getElementById('modal-footer').innerHTML =
    `<button class="btn btn-outline" onclick="closeModal()"><i class="fa-solid fa-xmark"></i> Cancel</button>
     <button class="btn btn-primary" onclick="submitEditPatient(${pid})"><i class="fa-solid fa-floppy-disk"></i> Save Changes</button>`;
}

async function submitEditPatient(pid) {
  const d = _collectPatientForm();
  const res = await api(`/api/patients/${pid}`, {method:'PUT', body:JSON.stringify(d)});
  if (res && res.success) { closeModal(); toast('Patient updated', 'success'); viewPatient(pid); }
  else { toast('Update failed', 'error'); }
}

// ── ENCOUNTERS PAGE ───────────────────────────────────────
async function renderEncounters() {
  const data = await api('/api/dashboard');
  if (!data) return;
  document.getElementById('page-content').innerHTML = `
  <div class="page-toolbar">
    <h3 class="section-title" style="margin:0">Clinical Encounters</h3>
    <button class="btn btn-primary" onclick="showEncounterModalSearch()">
      <i class="fa-solid fa-plus"></i> New Encounter
    </button>
  </div>
  <div class="card">
    <div class="table-wrap"><table>
      <thead>
        <tr><th>Patient</th><th>SmartID</th><th>Type</th><th>Diagnosis / Complaint</th><th>Date</th><th>Facility</th></tr>
      </thead>
      <tbody>
        ${data.recent_encounters.map(e=>`
        <tr>
          <td class="patient-name">${e.patient_name}</td>
          <td><span class="tag">${e.smart_id}</span></td>
          <td>${encTypeBadge(e.encounter_type)}</td>
          <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px">
            ${e.diagnosis||e.chief_complaint||'—'}
          </td>
          <td style="font-size:12px">${fmtDate(e.visit_date)}</td>
          <td style="font-size:12px">${e.facility||'—'}</td>
        </tr>`).join('')}
      </tbody>
    </table></div>
  </div>`;
}

function showEncounterModalSearch() {
  openModal('New Clinical Encounter', `
  <p style="margin-bottom:14px;color:var(--text2);font-size:13px">Search for the patient first:</p>
  <div class="search-bar" style="max-width:100%;margin-bottom:14px">
    <i class="fa-solid fa-magnifying-glass"></i>
    <input type="text" id="enc-search" placeholder="Patient name or SmartID…" oninput="searchForEnc(this.value)">
  </div>
  <div id="enc-search-results"></div>`,
  `<button class="btn btn-outline" onclick="closeModal()"><i class="fa-solid fa-xmark"></i> Cancel</button>`);
}

async function searchForEnc(q) {
  if (q.length < 2) { document.getElementById('enc-search-results').innerHTML = ''; return; }
  const patients = await api(`/api/patients?q=${encodeURIComponent(q)}`);
  const el = document.getElementById('enc-search-results');
  if (!el) return;
  if (!patients || patients.length === 0) {
    el.innerHTML = '<p style="font-size:13px;color:var(--text3)">No patients found</p>'; return;
  }
  el.innerHTML = patients.slice(0,5).map(p=>`
    <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border);gap:10px">
      <div>
        <div style="font-weight:500;font-size:13px">${p.first_name} ${p.last_name}</div>
        <div style="font-size:11px;color:var(--text3)">${p.smart_id} · ${age(p.date_of_birth)} yrs</div>
      </div>
      <button class="btn btn-primary btn-sm"
        onclick="showEncounterModal(${p.id},'${(p.first_name+' '+p.last_name).replace(/'/g,"\\'")}')">
        Select →
      </button>
    </div>`).join('');
}

function showEncounterModal(patientId, patientName) {
  const today = new Date().toISOString().slice(0,10);
  openModal(`New Encounter — ${patientName}`, `
  <div class="form-grid">
    <div class="field"><label>Encounter Type *</label>
      <select id="ef-type"><option>OPD</option><option>ART Clinic</option><option>MCH</option><option>TB Clinic</option><option>Inpatient</option><option>Emergency</option></select>
    </div>
    <div class="field"><label>Visit Date *</label><input id="ef-date" type="date" value="${today}"></div>
    <div class="field span-2"><label>Chief Complaint</label><input id="ef-complaint" placeholder="Main reason for visit"></div>
    <div class="section-divider"><h4>Vitals</h4></div>
    <div class="field"><label>Temperature (°C)</label><input id="ef-temp" type="number" step="0.1" placeholder="37.0" inputmode="decimal"></div>
    <div class="field"><label>Pulse (bpm)</label><input id="ef-pulse" type="number" placeholder="80" inputmode="numeric"></div>
    <div class="field"><label>Blood Pressure</label><input id="ef-bp" placeholder="120/80"></div>
    <div class="field"><label>Weight (kg)</label><input id="ef-weight" type="number" step="0.1" placeholder="70" inputmode="decimal"></div>
    <div class="field"><label>Height (cm)</label><input id="ef-height" type="number" placeholder="170" inputmode="numeric"></div>
    <div class="field"><label>SpO₂ (%)</label><input id="ef-spo2" type="number" placeholder="98" inputmode="numeric"></div>
    <div class="section-divider"><h4>Clinical Assessment</h4></div>
    <div class="field"><label>Diagnosis</label><input id="ef-diag" placeholder="e.g. Malaria (confirmed)"></div>
    <div class="field"><label>ICD-10 Code</label><input id="ef-code" placeholder="e.g. B54"></div>
    <div class="field span-2"><label>Treatment Plan</label><input id="ef-treatment" placeholder="Treatment or management plan"></div>
    <div class="field span-2"><label>Medications Prescribed</label><textarea id="ef-meds" placeholder="Drug name, dose, frequency, duration…"></textarea></div>
    <div class="field span-2"><label>Clinical Notes</label><textarea id="ef-notes" placeholder="Additional notes, referrals, observations…"></textarea></div>
    <div class="field"><label>Follow-up Date</label><input id="ef-followup" type="date"></div>
    <div class="field"><label>Facility</label><input id="ef-facility" value="${currentUser.facility}"></div>
  </div>`,
  `<button class="btn btn-outline" onclick="closeModal()"><i class="fa-solid fa-xmark"></i> Cancel</button>
   <button class="btn btn-accent" onclick="submitEncounter(${patientId})"><i class="fa-solid fa-floppy-disk"></i> Save Encounter</button>`);
}

async function submitEncounter(patientId) {
  const d = {
    patient:        patientId,
    encounter_type: document.getElementById('ef-type').value,
    visit_date:     document.getElementById('ef-date').value,
    chief_complaint:document.getElementById('ef-complaint').value,
    temperature:    document.getElementById('ef-temp').value    || null,
    pulse:          document.getElementById('ef-pulse').value   || null,
    blood_pressure: document.getElementById('ef-bp').value,
    weight:         document.getElementById('ef-weight').value  || null,
    height:         document.getElementById('ef-height').value  || null,
    oxygen_sat:     document.getElementById('ef-spo2').value    || null,
    diagnosis:      document.getElementById('ef-diag').value,
    diagnosis_code: document.getElementById('ef-code').value,
    treatment:      document.getElementById('ef-treatment').value,
    medications:    document.getElementById('ef-meds').value,
    notes:          document.getElementById('ef-notes').value,
    follow_up_date: document.getElementById('ef-followup').value || null,
    facility:       document.getElementById('ef-facility').value,
  };
  if (!d.visit_date) { toast('Visit date is required', 'error'); return; }
  const res = await api('/api/encounters', {method:'POST', body:JSON.stringify(d)});
  if (res && res.success) { closeModal(); toast('Encounter saved', 'success'); viewPatient(patientId); }
  else { toast('Failed to save encounter', 'error'); }
}

// ── REPORTS PAGE ──────────────────────────────────────────
async function renderReports() {
  const d = await api('/api/dashboard');
  if (!d) return;
  const s = d.stats;
  document.getElementById('page-content').innerHTML = `
  <div class="grid-2 mb-4">
    <div class="card">
      <div class="card-header"><h3><i class="fa-solid fa-table-list fa-fw" style="color:var(--primary)"></i> System Summary</h3></div>
      <div class="card-body">
        <table style="width:100%"><tbody>
          ${[
            ['Total registered patients', s.total_patients],
            ['Total clinical encounters', s.total_encounters],
            ['Encounters this month',     s.monthly_encounters],
            ['Encounters today',          s.today_encounters],
          ].map(([k,v])=>`
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid var(--border);color:var(--text2);font-size:13px">${k}</td>
            <td style="padding:10px 0;border-bottom:1px solid var(--border);font-weight:600;font-size:16px;color:var(--primary);text-align:right">${v}</td>
          </tr>`).join('')}
        </tbody></table>
      </div>
    </div>
    <div class="card">
      <div class="card-header"><h3><i class="fa-solid fa-chart-pie fa-fw" style="color:var(--accent)"></i> Encounter Types</h3></div>
      <div class="card-body">
        <div class="bar-chart">
          ${d.enc_types.map(e=>`
          <div class="bar-row">
            <div class="bar-label">${e.encounter_type}</div>
            <div class="bar-track"><div class="bar-fill" style="width:${Math.round((e.cnt/Math.max(...d.enc_types.map(x=>x.cnt),1))*100)}%"></div></div>
            <div class="bar-val">${e.cnt}</div>
          </div>`).join('')}
        </div>
      </div>
    </div>
  </div>
  <div class="grid-2 mb-4">
    <div class="card">
      <div class="card-header"><h3><i class="fa-solid fa-map-location-dot fa-fw" style="color:var(--accent)"></i> Patients by Province</h3></div>
      <div class="card-body">
        <div class="bar-chart">
          ${d.province_dist.map(p=>`
          <div class="bar-row">
            <div class="bar-label">${p.province||'Unknown'}</div>
            <div class="bar-track"><div class="bar-fill accent" style="width:${Math.round((p.cnt/Math.max(...d.province_dist.map(x=>x.cnt),1))*100)}%"></div></div>
            <div class="bar-val">${p.cnt}</div>
          </div>`).join('')}
        </div>
      </div>
    </div>
    <div class="card">
      <div class="card-header"><h3><i class="fa-solid fa-disease fa-fw" style="color:var(--warn)"></i> Top 5 Diagnoses</h3></div>
      <div class="card-body">
        <div class="bar-chart">
          ${d.top_diagnoses.map(x=>`
          <div class="bar-row">
            <div class="bar-label">${x.diagnosis}</div>
            <div class="bar-track"><div class="bar-fill" style="width:${Math.round((x.cnt/Math.max(...d.top_diagnoses.map(y=>y.cnt),1))*100)}%"></div></div>
            <div class="bar-val">${x.cnt}</div>
          </div>`).join('')}
        </div>
      </div>
    </div>
  </div>
  <div class="card">
    <div class="card-header"><h3><i class="fa-solid fa-chart-column fa-fw" style="color:var(--primary)"></i> Monthly Encounter Trend</h3></div>
    <div class="card-body">
      <div style="display:flex;align-items:flex-end;gap:10px;height:100px;padding-bottom:8px">
        ${d.monthly_trend.map(m=>`
        <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px">
          <span style="font-size:11px;color:var(--text3)">${m.cnt}</span>
          <div style="width:100%;background:var(--primary);border-radius:4px 4px 0 0;height:${Math.max(4,Math.round((m.cnt/Math.max(...d.monthly_trend.map(x=>x.cnt),1))*80))}px"></div>
          <span style="font-size:10px;color:var(--text3)">${m.month.slice(5)}</span>
        </div>`).join('')}
      </div>
    </div>
  </div>`;
}

// ── USERS PAGE ────────────────────────────────────────────
async function renderUsers() {
  const users = await api('/api/users');
  if (!users) return;
  const isAdmin = currentUser.role === 'admin';
  document.getElementById('page-content').innerHTML = `
  <div class="page-toolbar">
    <h3 class="section-title" style="margin:0">${users.length} System Users</h3>
    ${isAdmin ? `<button class="btn btn-primary" onclick="showAddUserModal()"><i class="fa-solid fa-user-plus"></i> Add User</button>` : ''}
  </div>
  <div class="card">
    <div class="table-wrap"><table>
      <thead><tr><th>Name</th><th>Username</th><th>Role</th><th>Facility</th><th>Joined</th></tr></thead>
      <tbody>
        ${users.map(u=>`
        <tr>
          <td>
            <div style="display:flex;align-items:center;gap:8px">
              <div class="user-avatar" style="width:30px;height:30px;font-size:11px;background:var(--primary-ghost);color:var(--primary)">
                ${initials(u.name)}
              </div>
              <span class="patient-name">${u.name}</span>
            </div>
          </td>
          <td style="font-family:'DM Mono',monospace;font-size:12px">${u.username}</td>
          <td>${roleBadge(u.role)}</td>
          <td style="font-size:12px">${u.facility||'—'}</td>
          <td style="font-size:12px">${fmtDate(u.created_at)}</td>
        </tr>`).join('')}
      </tbody>
    </table></div>
  </div>`;
}

function roleBadge(r) {
  const m = {doctor:'badge-blue', nurse:'badge-green', admin:'badge-warn'};
  return `<span class="badge ${m[r]||'badge-gray'}">${r}</span>`;
}

function showAddUserModal() {
  openModal('Add New User', `
  <div class="form-grid">
    <div class="field span-2"><label>Full Name *</label><input id="uf-name" placeholder="Full name" autocomplete="off"></div>
    <div class="field"><label>Username *</label><input id="uf-user" placeholder="Login username" autocomplete="off"></div>
    <div class="field"><label>Password *</label><input id="uf-pass" type="password" placeholder="Password"></div>
    <div class="field"><label>Role *</label>
      <select id="uf-role"><option>doctor</option><option>nurse</option><option>admin</option></select>
    </div>
    <div class="field"><label>Facility</label><input id="uf-facility" value="${currentUser.facility}"></div>
  </div>`,
  `<button class="btn btn-outline" onclick="closeModal()"><i class="fa-solid fa-xmark"></i> Cancel</button>
   <button class="btn btn-primary" onclick="submitAddUser()"><i class="fa-solid fa-user-plus"></i> Create User</button>`);
}

async function submitAddUser() {
  const d = {
    name:     document.getElementById('uf-name').value.trim(),
    username: document.getElementById('uf-user').value.trim(),
    password: document.getElementById('uf-pass').value,
    role:     document.getElementById('uf-role').value,
    facility: document.getElementById('uf-facility').value.trim(),
  };
  if (!d.name || !d.username || !d.password) { toast('All fields required', 'error'); return; }
  const res = await api('/api/users', {method:'POST', body:JSON.stringify(d)});
  if (res && res.success) { closeModal(); toast('User created', 'success'); navigate('users'); }
  else { toast(res?.error || 'Failed', 'error'); }
}
