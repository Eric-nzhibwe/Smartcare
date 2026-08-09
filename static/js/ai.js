/* ============================================================
   SMARTCARE AI  — Groq-powered assistant
   Works for all roles: doctor (clinical), nurse (triage), admin (analytics)
   ============================================================ */

/* ── State ── */
let _aiMessages  = [];   // { role:'user'|'assistant', content:string }[]
let _aiSending   = false;
let _aiTab       = 'chat'; // 'chat' | 'insights'
let _aiInsight   = { content:'', loading:false, error:'' };

/* ── Role config ── */
const AI_CFG = {
  doctor: {
    color:        'var(--primary)',
    colorLight:   'var(--primary-ghost)',
    label:        'Clinical AI Assistant',
    subtitle:     'Differential diagnoses · Decision support',
    icon:         'fa-user-doctor',
    insightLabel: 'Clinical Insights',
    insightIcon:  'fa-stethoscope',
    insightEndpoint: '/api/ai/doctor-insights',
    suggestions: [
      'What are common causes of chest pain in adults?',
      'How do I manage hypertensive urgency?',
      'Investigations for suspected pulmonary TB?',
      'Differential diagnosis for acute abdomen?',
    ],
  },
  nurse: {
    color:        'var(--accent)',
    colorLight:   'var(--accent-light)',
    label:        'Triage AI Assistant',
    subtitle:     'Patient care coordination · Triage support',
    icon:         'fa-user-nurse',
    insightLabel: 'Triage Summary',
    insightIcon:  'fa-clipboard-list',
    insightEndpoint: '/api/ai/triage',
    suggestions: [
      'Normal vital sign ranges for adults?',
      'When should I escalate a patient urgently?',
      'How to manage SpO₂ below 92%?',
      'Early warning signs of sepsis during triage?',
    ],
  },
  admin: {
    color:        'var(--warn)',
    colorLight:   'var(--warn-light)',
    label:        'Health Analytics AI',
    subtitle:     'Operational insights · System performance',
    icon:         'fa-shield-halved',
    insightLabel: 'System Insights',
    insightIcon:  'fa-chart-line',
    insightEndpoint: '/api/ai/admin',
    suggestions: [
      'How can I improve EMR data quality?',
      'What metrics indicate a well-performing facility?',
      'How to improve patient follow-up compliance?',
      'How to interpret encounter volume trends?',
    ],
  },
};

/* ── Entry point: navigate to AI page ── */
function navigateAI() {
  const role = currentUser?.role || 'doctor';
  const cfg  = AI_CFG[role] || AI_CFG.doctor;
  currentPage = 'ai';
  document.getElementById('page-title').textContent = cfg.label;
  // setActiveNav is defined in index.html and handles sidebar highlight + close
  if (typeof setActiveNav === 'function') setActiveNav('ai');
  _aiMessages = [];
  _aiTab      = 'chat';
  _aiInsight  = { content:'', loading:false, error:'' };
  _renderAIShell(cfg, role);
  _aiAddWelcome(cfg);
}

/* ── Build the AI page shell ── */
function _renderAIShell(cfg, role) {
  document.getElementById('page-content').innerHTML = `
  <div id="ai-shell" style="display:flex;flex-direction:column;height:calc(100vh - 56px - 40px);max-width:860px;margin:0 auto">

    <!-- Header card -->
    <div class="ai-header-card" style="background:white;border:1px solid var(--border);border-radius:var(--radius);
         padding:16px 20px;margin-bottom:14px;display:flex;align-items:center;gap:14px;box-shadow:var(--shadow)">
      <div style="width:48px;height:48px;border-radius:12px;background:${cfg.colorLight};
           display:flex;align-items:center;justify-content:center;font-size:22px;color:${cfg.color};flex-shrink:0">
        <i class="fa-solid ${cfg.icon}"></i>
      </div>
      <div style="flex:1;min-width:0">
        <div style="font-size:16px;font-weight:600;color:var(--text);letter-spacing:-.2px">${cfg.label}</div>
        <div style="font-size:12px;color:var(--text3);margin-top:2px;display:flex;align-items:center;gap:6px">
          <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#22c55e"></span>
          Powered by Groq · LLaMA 3.3 70B · ${cfg.subtitle}
        </div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-outline btn-sm" onclick="_clearAIChat()">
          <i class="fa-solid fa-rotate-right"></i> New Chat
        </button>
      </div>
    </div>

    <!-- Tab bar -->
    <div style="display:flex;background:white;border:1px solid var(--border);border-radius:var(--radius);
         margin-bottom:14px;overflow:hidden;box-shadow:var(--shadow)">
      <button id="ai-tab-chat" onclick="_switchAITab('chat','${role}')"
        style="flex:1;padding:11px 16px;border:none;cursor:pointer;font-family:inherit;font-size:13px;
               font-weight:500;display:flex;align-items:center;justify-content:center;gap:7px;
               transition:all .15s;background:${_aiTab==='chat'?cfg.colorLight:'white'};
               color:${_aiTab==='chat'?cfg.color:'var(--text3)'};
               border-bottom:2px solid ${_aiTab==='chat'?cfg.color:'transparent'}">
        <i class="fa-solid fa-comments"></i> AI Chat
      </button>
      <button id="ai-tab-insights" onclick="_switchAITab('insights','${role}')"
        style="flex:1;padding:11px 16px;border:none;cursor:pointer;font-family:inherit;font-size:13px;
               font-weight:500;display:flex;align-items:center;justify-content:center;gap:7px;
               transition:all .15s;background:${_aiTab==='insights'?cfg.colorLight:'white'};
               color:${_aiTab==='insights'?cfg.color:'var(--text3)'};
               border-bottom:2px solid ${_aiTab==='insights'?cfg.color:'transparent'}">
        <i class="fa-solid ${cfg.insightIcon}"></i> ${cfg.insightLabel}
      </button>
    </div>

    <!-- Chat panel -->
    <div id="ai-chat-panel" style="flex:1;display:${_aiTab==='chat'?'flex':'none'};flex-direction:column;
         min-height:0;background:white;border:1px solid var(--border);border-radius:var(--radius);
         overflow:hidden;box-shadow:var(--shadow)">
      <div id="ai-messages" style="flex:1;overflow-y:auto;padding:20px;display:flex;
           flex-direction:column;gap:14px;scroll-behavior:smooth"></div>
      <div id="ai-input-area" style="border-top:1px solid var(--border);padding:14px 16px;background:var(--surface2)">
        <div style="display:flex;gap:10px;align-items:flex-end">
          <textarea id="ai-input" rows="1" placeholder="Ask SmartCare AI…"
            style="flex:1;border:1.5px solid ${cfg.color}50;border-radius:var(--radius-sm);padding:10px 12px;
                   font-size:14px;font-family:inherit;resize:none;outline:none;line-height:1.5;
                   transition:border-color .15s;max-height:120px;overflow-y:auto;background:white"
            onfocus="this.style.borderColor='${cfg.color}'"
            onblur="this.style.borderColor='${cfg.color}50'"
            onkeydown="_aiInputKeydown(event,'${role}')"
            oninput="_aiAutoResize(this)"></textarea>
          <button id="ai-send-btn" onclick="_sendAIMessage(null,'${role}')"
            style="width:42px;height:42px;border-radius:var(--radius-sm);border:none;cursor:pointer;
                   background:${cfg.color};color:white;font-size:15px;flex-shrink:0;
                   display:flex;align-items:center;justify-content:center;transition:opacity .15s">
            <i class="fa-solid fa-paper-plane"></i>
          </button>
        </div>
        <div style="font-size:11px;color:var(--text3);margin-top:8px;text-align:center;line-height:1.4">
          AI responses are for clinical support only — not a substitute for professional judgement.
        </div>
      </div>
    </div>

    <!-- Insights panel -->
    <div id="ai-insights-panel" style="flex:1;display:${_aiTab==='insights'?'flex':'none'};
         flex-direction:column;overflow-y:auto;gap:14px">
      ${_renderInsightsPanel(cfg, role)}
    </div>

  </div>`;

  // Render suggestion chips into the messages area
  _renderSuggestions(cfg, role);
}

/* ── Suggestion chips ── */
function _renderSuggestions(cfg, role) {
  const el = document.getElementById('ai-messages');
  if (!el || _aiMessages.length > 1) return;
  const chips = cfg.suggestions.map(s => `
    <button onclick="_sendAIMessage('${s.replace(/'/g, "\\'")}','${role}')"
      style="text-align:left;padding:10px 14px;border:1.5px solid ${cfg.color}30;border-radius:var(--radius-sm);
             background:white;cursor:pointer;font-size:12px;font-family:inherit;color:${cfg.color};
             font-weight:500;transition:all .15s;line-height:1.4;box-shadow:var(--shadow)"
      onmouseover="this.style.background='${cfg.colorLight}'"
      onmouseout="this.style.background='white'">
      ${s}
    </button>`).join('');

  const suggestDiv = document.createElement('div');
  suggestDiv.id = 'ai-suggestions';
  suggestDiv.innerHTML = `
    <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;
                color:var(--text3);margin-bottom:10px">Suggested questions</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">${chips}</div>`;
  el.appendChild(suggestDiv);
}

/* ── Welcome message ── */
function _aiAddWelcome(cfg) {
  _aiMessages = [{
    role:    'assistant',
    content: `Hello! I'm SmartCare AI, your ${cfg.subtitle.toLowerCase()}. How can I help you today?`,
    ts:      new Date(),
  }];
  _renderAIMessages(cfg);
}

/* ── Render all messages ── */
function _renderAIMessages(cfg) {
  const el = document.getElementById('ai-messages');
  if (!el) return;

  // Keep suggestions if chat is fresh
  const suggestHtml = _aiMessages.length <= 1
    ? (document.getElementById('ai-suggestions')?.outerHTML || '') : '';

  el.innerHTML = _aiMessages.map((m, i) => _renderBubble(m, cfg)).join('') + suggestHtml;
  el.scrollTop = el.scrollHeight;
}

/* ── Single message bubble ── */
function _renderBubble(m, cfg) {
  const isUser = m.role === 'user';
  const time   = m.ts ? m.ts.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}) : '';
  const txt    = m.isLoading
    ? `<div style="display:flex;gap:5px;align-items:center;padding:4px 2px">
         <span class="ai-dot"></span><span class="ai-dot" style="animation-delay:.2s"></span>
         <span class="ai-dot" style="animation-delay:.4s"></span>
       </div>`
    : `<div style="white-space:pre-wrap;word-break:break-word;line-height:1.6">${_fmtAIText(m.content)}</div>
       <div style="font-size:10px;color:${isUser?'rgba(255,255,255,.6)':'var(--text3)'};
                   margin-top:6px;text-align:right">${time}</div>`;

  if (isUser) return `
    <div style="display:flex;justify-content:flex-end;gap:8px;align-items:flex-end">
      <div style="max-width:72%;background:${cfg.color};color:white;border-radius:14px 14px 4px 14px;
                  padding:11px 15px;font-size:14px;box-shadow:var(--shadow)">${txt}</div>
      <div style="width:30px;height:30px;border-radius:50%;background:${cfg.color};color:white;
                  display:flex;align-items:center;justify-content:center;font-size:12px;flex-shrink:0;margin-bottom:2px">
        <i class="fa-solid fa-user"></i>
      </div>
    </div>`;

  return `
    <div style="display:flex;justify-content:flex-start;gap:8px;align-items:flex-end">
      <div style="width:30px;height:30px;border-radius:50%;background:${cfg.colorLight};
                  color:${cfg.color};display:flex;align-items:center;justify-content:center;
                  font-size:12px;flex-shrink:0;margin-bottom:2px">
        <i class="fa-solid fa-robot"></i>
      </div>
      <div style="max-width:72%;background:white;color:var(--text);border-radius:14px 14px 14px 4px;
                  padding:11px 15px;font-size:14px;border:1px solid var(--border);box-shadow:var(--shadow)">${txt}</div>
    </div>`;
}

/* ── Format AI markdown-ish text ── */
function _fmtAIText(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^(\d+)\.\s+/gm, '<span style="font-weight:600;color:var(--primary)">$1.</span> ')
    .replace(/^[-•]\s+/gm, '<span style="color:var(--primary);margin-right:4px">•</span> ')
    .replace(/\n{2,}/g, '</p><p style="margin-top:10px">')
    .replace(/\n/g, '<br>');
}

/* ── Send a message ── */
async function _sendAIMessage(text, role) {
  const cfg   = AI_CFG[role] || AI_CFG.doctor;
  const input = document.getElementById('ai-input');
  const msg   = (text || input?.value || '').trim();
  if (!msg || _aiSending) return;

  // Remove suggestions
  document.getElementById('ai-suggestions')?.remove();

  if (input) { input.value = ''; input.style.height = ''; }

  _aiMessages.push({ role:'user', content:msg, ts:new Date() });
  _aiMessages.push({ role:'assistant', content:'', ts:new Date(), isLoading:true });
  _aiSending = true;
  _renderAIMessages(cfg);
  _setAISendBtn(true, cfg);

  const history = _aiMessages
    .filter(m => !m.isLoading)
    .map(m => ({ role:m.role, content:m.content }));

  try {
    const res = await fetch('/api/ai/chat', {
      method:  'POST',
      headers: { 'Content-Type':'application/json', 'Authorization': `Bearer ${token}` },
      body:    JSON.stringify({ messages: history }),
    });
    const data = await res.json();
    _aiMessages.pop(); // remove loading placeholder
    if (!res.ok) throw new Error(data.error || 'AI error');
    _aiMessages.push({ role:'assistant', content:data.reply, ts:new Date() });
  } catch (err) {
    _aiMessages.pop();
    _aiMessages.push({ role:'assistant', content:`⚠ ${err.message || 'Unable to reach AI. Check your connection.'}`, ts:new Date() });
  } finally {
    _aiSending = false;
    _setAISendBtn(false, cfg);
    _renderAIMessages(cfg);
  }
}

function _setAISendBtn(loading, cfg) {
  const btn = document.getElementById('ai-send-btn');
  if (!btn) return;
  btn.disabled = loading;
  btn.style.opacity = loading ? '0.6' : '1';
  btn.innerHTML = loading
    ? '<i class="fa-solid fa-spinner fa-spin"></i>'
    : '<i class="fa-solid fa-paper-plane"></i>';
}

function _aiInputKeydown(e, role) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); _sendAIMessage(null, role); }
}

function _aiAutoResize(el) {
  el.style.height = '';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}

function _clearAIChat() {
  const role = currentUser?.role || 'doctor';
  const cfg  = AI_CFG[role] || AI_CFG.doctor;
  _aiMessages = [];
  _aiInsight  = { content:'', loading:false, error:'' };
  _aiAddWelcome(cfg);
  _renderSuggestions(cfg, role);
}

/* ── Tab switching ── */
function _switchAITab(tab, role) {
  _aiTab = tab;
  const cfg = AI_CFG[role] || AI_CFG.doctor;
  const chat     = document.getElementById('ai-chat-panel');
  const insights = document.getElementById('ai-insights-panel');
  const tabChat  = document.getElementById('ai-tab-chat');
  const tabIns   = document.getElementById('ai-tab-insights');

  const activeStyle   = `background:${cfg.colorLight};color:${cfg.color};border-bottom:2px solid ${cfg.color}`;
  const inactiveStyle = `background:white;color:var(--text3);border-bottom:2px solid transparent`;

  if (tab === 'chat') {
    chat.style.display     = 'flex';
    insights.style.display = 'none';
    tabChat.style.cssText  += ';' + activeStyle;
    tabIns.style.cssText   += ';' + inactiveStyle;
  } else {
    chat.style.display     = 'none';
    insights.style.display = 'flex';
    tabIns.style.cssText   += ';' + activeStyle;
    tabChat.style.cssText  += ';' + inactiveStyle;
    if (!_aiInsight.content && !_aiInsight.loading) _loadAIInsights(cfg, role);
  }
}

/* ── Insights panel HTML ── */
function _renderInsightsPanel(cfg, role) {
  return `
  <div style="background:white;border:1px solid var(--border);border-radius:var(--radius);
       padding:28px;text-align:center;box-shadow:var(--shadow)">
    <div style="width:60px;height:60px;border-radius:14px;background:${cfg.colorLight};
         display:flex;align-items:center;justify-content:center;font-size:26px;
         color:${cfg.color};margin:0 auto 12px">
      <i class="fa-solid ${cfg.insightIcon}"></i>
    </div>
    <div style="font-size:18px;font-weight:600;color:var(--text);letter-spacing:-.2px">${cfg.insightLabel}</div>
    <div style="font-size:12px;color:var(--text3);margin-top:4px">AI-generated from live system data</div>
  </div>
  <div id="ai-insight-card" style="background:white;border:1px solid var(--border);
       border-left:3px solid ${cfg.color};border-radius:var(--radius);
       padding:20px;box-shadow:var(--shadow)">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
      <div style="display:flex;align-items:center;gap:10px">
        <div style="width:32px;height:32px;border-radius:8px;background:${cfg.colorLight};
             display:flex;align-items:center;justify-content:center;color:${cfg.color}">
          <i class="fa-solid ${cfg.insightIcon}"></i>
        </div>
        <span style="font-size:13px;font-weight:600;color:var(--text)">${cfg.insightLabel}</span>
      </div>
      <button onclick="_loadAIInsights(AI_CFG['${role}'],'${role}')"
        style="background:none;border:1px solid var(--border2);border-radius:var(--radius-sm);
               padding:5px 10px;cursor:pointer;font-size:12px;color:var(--text3);
               display:flex;align-items:center;gap:5px">
        <i class="fa-solid fa-sync-alt"></i> Refresh
      </button>
    </div>
    <div id="ai-insight-body">
      ${_renderInsightBody()}
    </div>
  </div>
  <div style="display:flex;align-items:flex-start;gap:6px;padding:0 4px">
    <i class="fa-solid fa-circle-info" style="color:var(--text3);font-size:11px;margin-top:2px"></i>
    <span style="font-size:11px;color:var(--text3);line-height:1.5">
      Insights are generated from aggregate, de-identified data and refreshed on demand.
      Always apply professional judgement.
    </span>
  </div>`;
}

function _renderInsightBody() {
  if (_aiInsight.loading) return `
    <div style="display:flex;align-items:center;gap:10px;padding:16px 0;color:var(--text3)">
      <i class="fa-solid fa-spinner fa-spin" style="color:var(--primary)"></i>
      <span style="font-size:13px">Analysing live data…</span>
    </div>`;
  if (_aiInsight.error) return `
    <div style="display:flex;align-items:center;gap:8px;color:var(--danger);padding:10px 0">
      <i class="fa-solid fa-circle-exclamation"></i>
      <span style="font-size:13px">${_aiInsight.error}</span>
    </div>`;
  if (!_aiInsight.content) return `
    <div style="color:var(--text3);font-size:13px;padding:10px 0">
      Click <strong>Refresh</strong> to generate insights from current system data.
    </div>`;
  return `<div style="font-size:13px;color:var(--text2);line-height:1.75;white-space:pre-wrap">${_fmtAIText(_aiInsight.content)}</div>`;
}

async function _loadAIInsights(cfg, role) {
  _aiInsight = { content:'', loading:true, error:'' };
  _updateInsightBody();
  try {
    const endpoint = cfg.insightEndpoint;
    const res  = await fetch(endpoint, { headers:{ Authorization:`Bearer ${token}` } });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Insight error');
    _aiInsight = { content: data.insights || data.summary || '', loading:false, error:'' };
  } catch (err) {
    _aiInsight = { content:'', loading:false, error: err.message || 'Could not load insights' };
  }
  _updateInsightBody();
}

function _updateInsightBody() {
  const el = document.getElementById('ai-insight-body');
  if (el) el.innerHTML = _renderInsightBody();
}
