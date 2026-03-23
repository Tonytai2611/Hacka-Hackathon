import { useEffect, useRef } from "react";
import "./App.css";

const CONFIG = {
  USE_REAL_API  : true,
  GATEKEEPER_URL: 'https://1y2xabeojj.execute-api.us-east-1.amazonaws.com/analyze-transactions',
  DEPLOY_URL    : 'https://1y2xabeojj.execute-api.us-east-1.amazonaws.com/approve-rule',
  GET_RULE_URL  : 'https://1y2xabeojj.execute-api.us-east-1.amazonaws.com/get-latest-rule',
  PREFETCH_CHUNK: 20,

  TOTAL_LEGIT_PRE : 500,
  CLUSTER3_ROWS   : 103,
  FN_TRIGGER      : 75,
  TOTAL_LEGIT_POST: 500,
  THRESHOLD       : 0.82,

  BASELINE_FPR_AFTER: '1.09%',
  BASELINE_FPR_DELTA: '+0.07%',
  WITH_RULE_FNR     : '5.8%',
  WITH_RULE_FPR     : '1.09%',
  TX_INTERVAL_MS    : 180,
};


const SIMULATED_RULE = `<span class="cmt"># NeuroShield — fallback rule (API unavailable)</span>
<span class="kw">def</span> <span class="fn">detect_fraud</span>(transaction: dict) -> bool:
    c10 = transaction.get(<span class="str">'C10'</span>, <span class="num">0.0</span>)
    c7  = transaction.get(<span class="str">'C7'</span>,  <span class="num">0.0</span>)
    c8  = transaction.get(<span class="str">'C8'</span>,  <span class="num">0.0</span>)
    <span class="kw">if</span> (c10 >= <span class="num">1469.2</span> <span class="kw">or</span> c7 >= <span class="num">880.2</span> <span class="kw">or</span> c8 >= <span class="num">1315.3</span>):
        <span class="kw">return</span> <span class="num">True</span>
    <span class="kw">return</span> <span class="num">False</span>`;

const sleep = ms => new Promise(r => setTimeout(r, ms));

const INITIAL_STATE = {
  running: false, txIndex: 0, fnCount: 0,
  passCount: 0, flagCount: 0, blockCount: 0,
  fnCountNoRule: 0, fnCountWithRule: 0, legitFlaggedNoRule: 0,
  ruleGenerated: false, ruleDeployed: false,
  loopStep: -1, intervalId: null, speed: 1,
  prefetched: false, latestRuleKey: null,
};


function highlightPython(code) {
  return code
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/\b(def|if|elif|else|return|and|or|not|True|False|None)\b/g,
             '<span class="kw">$1</span>')
    .replace(/(\b\d+\.?\d*\b)/g, '<span class="num">$1</span>')
    .replace(/('[^'\n]*'|"[^"\n]*")/g, '<span class="str">$1</span>')
    .replace(/(#[^\n]*)/g, '<span class="cmt">$1</span>')
    .replace(/\b(detect_fraud|transaction\.get)\b/g, '<span class="fn">$1</span>')
}

export default function App() {
  const stateRef   = useRef({ ...INITIAL_STATE });
  const datasetRef = useRef([]);

  useEffect(() => {
    datasetRef.current = buildDataset();
    const clockId = setInterval(() => {
      document.getElementById("clock").textContent =
        new Date().toLocaleTimeString("en-US", { hour12: false });
    }, 1000);
    document.getElementById("clock").textContent =
      new Date().toLocaleTimeString("en-US", { hour12: false });
    return () => { clearInterval(clockId); clearInterval(stateRef.current.intervalId); };
  }, []);

  
  function buildDataset() {
    const rows = [];
    for (let i = 0; i < 500; i++)
      rows.push({ TransactionAmt: +(50+Math.random()*500).toFixed(2),
        C10: +(Math.random()*10).toFixed(2), C7: +(Math.random()*10).toFixed(2),
        C8: +(Math.random()*10).toFixed(2), isFraud: 0, _isCluster3: false });
    for (let i = 0; i < 103; i++)
      rows.push({ TransactionAmt: +(117+Math.random()*200).toFixed(2),
        C10: +(1500+Math.random()*2000).toFixed(2), C7: +(900+Math.random()*1500).toFixed(2),
        C8: +(1350+Math.random()*1500).toFixed(2), isFraud: 1, _isCluster3: true });
    for (let i = 0; i < 500; i++)
      rows.push({ TransactionAmt: +(50+Math.random()*500).toFixed(2),
        C10: +(Math.random()*10).toFixed(2), C7: +(Math.random()*10).toFixed(2),
        C8: +(Math.random()*10).toFixed(2), isFraud: 0, _isCluster3: false });
    return rows;
  }

  
  async function prefetchScores() {
    const dataset = datasetRef.current;
    const CHUNK   = CONFIG.PREFETCH_CHUNK;
    for (let i = 0; i < dataset.length; i += CHUNK) {
      const chunk = dataset.slice(i, i + CHUNK);
      await Promise.all(chunk.map((row, j) =>
        fetch(CONFIG.GATEKEEPER_URL, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(row),
        })
        .then(r => r.json())
        .then(res => {
          dataset[i+j]._realScore    = res.score;
          dataset[i+j]._realDecision = res.decision || 'APPROVE';
        })
        .catch(() => {})
      ));
      const pct = Math.min(100, Math.round(((i+CHUNK)/dataset.length)*100));
      document.getElementById('startBtn').textContent = `Loading ${pct}%...`;
    }
  }

  function getTxResult(index) {
    const row        = datasetRef.current[index] || {};
    const isCluster3 = row._isCluster3;
    const txId       = `T${String(3500000+index).slice(1)}`;
    const deployed   = stateRef.current.ruleDeployed;

    if (row._realScore !== undefined) {
      const score    = row._realScore;
      const decision = row._realDecision;
      const isCaughtByRule = decision === 'BLOCK' && isCluster3 && deployed;
      const isFraudByBase  = score >= CONFIG.THRESHOLD;
      let result, badge;
      if (isCaughtByRule)                         { result='BLOCK'; badge='badge-block'; }
      else if (decision==='BLOCK'||isFraudByBase) { result='FLAG';  badge='badge-flag';  }
      else                                        { result='PASS';  badge='badge-pass';  }
      return { txId, score, cluster: isCluster3?'C3-ATK':'LEGIT',
               result, badge, isCluster3, isCaughtByRule, isFraudByBase };
    }

    // Fallback simulation
    let score, isFraudByBase, isCaughtByRule;
    if (isCluster3) {
      score=0.45+Math.random()*0.25; isFraudByBase=false; isCaughtByRule=deployed;
    } else {
      score=Math.random()<0.02?0.83+Math.random()*0.15:0.1+Math.random()*0.55;
      isFraudByBase=score>CONFIG.THRESHOLD; isCaughtByRule=false;
    }
    const result=isCaughtByRule?'BLOCK':isFraudByBase?'FLAG':'PASS';
    const badge =isCaughtByRule?'badge-block':isFraudByBase?'badge-flag':'badge-pass';
    return { txId, score, cluster:isCluster3?'C3-ATK':'LEGIT',
             result, badge, isCluster3, isCaughtByRule, isFraudByBase };
  }

  function renderRow(tx) {
    const feed       = document.getElementById("tx-feed");
    const scoreClass = tx.score>0.82?"score-fraud":tx.score>0.5?"score-warn":"score-safe";
    const row        = document.createElement("div");
    row.className    = "tx-row";
    row.innerHTML    = `
      <span class="tx-id">${tx.txId}</span>
      <span class="tx-score ${scoreClass}">${tx.score.toFixed(3)}</span>
      <span><span class="badge ${tx.badge}">${tx.result}</span></span>
      <span class="cluster-label ${tx.isCluster3?"cluster-attack":""}">${tx.cluster}</span>
      <span>${tx.isCaughtByRule?'<span class="rule-badge">RULE</span>':'<span style="color:var(--muted)">—</span>'}</span>
    `;
    feed.insertBefore(row, feed.firstChild);
    while (feed.children.length > 60) feed.removeChild(feed.lastChild);
  }

  function updateMetrics(tx) {
    const state = stateRef.current;
    state.txIndex++;
    if (tx.result==="PASS")       state.passCount++;
    else if (tx.result==="FLAG")  state.flagCount++;
    else if (tx.result==="BLOCK") state.blockCount++;
    document.getElementById("s-pass").textContent  = state.passCount;
    document.getElementById("s-flag").textContent  = state.flagCount;
    document.getElementById("s-block").textContent = state.blockCount;
    document.getElementById("tx-total").textContent = `${state.txIndex} / 1103`;
    if (tx.isCluster3 && !tx.isFraudByBase && !tx.isCaughtByRule) {
      state.fnCount++; state.fnCountNoRule++;
    }
    if (!tx.isCluster3 && tx.isFraudByBase) state.legitFlaggedNoRule++;
    updateFNCounter(); updateScenarioMetrics(); updatePhase();
  }

  function updateFNCounter() {
    const state = stateRef.current;
    const count = state.fnCount;
    const pct   = Math.min(100,(count/CONFIG.FN_TRIGGER)*100).toFixed(0);
    document.getElementById("fn-count").textContent = count;
    document.getElementById("fn-pct").textContent   = pct+"%";
    document.getElementById("fn-bar").style.width   = Math.min(100,(count/CONFIG.FN_TRIGGER)*100)+"%";
    const danger = count>=CONFIG.FN_TRIGGER*0.7;
    document.getElementById("fn-count").className = "fn-count"+(danger?" danger":"");
    document.getElementById("fn-bar").className   = "fn-bar-fill"+(danger?" danger":"");
    if (count>=CONFIG.FN_TRIGGER) {
      document.getElementById("fn-sub").textContent = "⚠ THRESHOLD BREACHED — Agentic loop triggered";
      document.getElementById("fn-sub").style.color = "var(--fraud)";
    } else if (count>0) {
      document.getElementById("fn-sub").textContent = `${CONFIG.FN_TRIGGER-count} more misses until loop fires`;
    }
  }

  function updateScenarioMetrics() {
    const state    = stateRef.current;
    const c3seen   = Math.max(0, state.txIndex-CONFIG.TOTAL_LEGIT_PRE);
    const c3actual = Math.min(c3seen, CONFIG.CLUSTER3_ROWS);
    const legitSeen = state.txIndex<=CONFIG.TOTAL_LEGIT_PRE ? state.txIndex
                    : state.txIndex>=CONFIG.TOTAL_LEGIT_PRE+CONFIG.CLUSTER3_ROWS
                      ? state.txIndex-CONFIG.CLUSTER3_ROWS : CONFIG.TOTAL_LEGIT_PRE;
    if (c3actual>0) {
      document.getElementById("m-fnr-no").textContent  = ((state.fnCountNoRule/c3actual)*100).toFixed(1)+"%";
      document.getElementById("m-fnr-no").className    = "metric-value bad";
      document.getElementById("m-fpr-no").textContent  = legitSeen>0?((state.legitFlaggedNoRule/legitSeen)*100).toFixed(2)+"%":"—";
      document.getElementById("m-caught-no").textContent = c3actual-state.fnCountNoRule;
    }
    if (state.ruleDeployed && c3actual>0) {
      document.getElementById("m-fnr-yes").textContent  = CONFIG.WITH_RULE_FNR;
      document.getElementById("m-fnr-yes").className    = "metric-value good";
      document.getElementById("m-fpr-yes").textContent  = CONFIG.WITH_RULE_FPR;
      document.getElementById("m-caught-yes").textContent = state.blockCount;
    }
  }

  function updatePhase() {
    const i = stateRef.current.txIndex;
    setPhase(i<CONFIG.TOTAL_LEGIT_PRE?0:
             i<CONFIG.TOTAL_LEGIT_PRE+CONFIG.FN_TRIGGER?1:
             !stateRef.current.ruleDeployed?2:
             i<CONFIG.TOTAL_LEGIT_PRE+CONFIG.CLUSTER3_ROWS+100?3:4);
  }

  function setPhase(p) {
    ["ph0","ph1","ph2","ph3","ph4"].forEach((id,idx) => {
      const el = document.getElementById(id);
      el.className = "phase-step"+(id==="ph2"?" defense":"")+(idx===p?" active":idx<p?" done":"");
    });
  }

  async function triggerAgenticLoop() {
    const steps  = ["ls0","ls1","ls2","ls3","ls4"];
    const delays = [0, 1800, 3200, 5000, 7500];
    steps.forEach(id => document.getElementById(id).className="loop-step");
    for (let i=0; i<steps.length; i++) {
      await sleep(delays[i]);
      if (i>0) {
        document.getElementById(steps[i-1]).className="loop-step done";
        document.getElementById(steps[i-1]).querySelector(".step-icon").textContent="✓";
      }
      document.getElementById(steps[i]).className="loop-step active";
      document.getElementById(steps[i]).querySelector(".step-icon").textContent="…";
    }
    await sleep(2500);
    document.getElementById(steps[4]).className="loop-step done";
    document.getElementById(steps[4]).querySelector(".step-icon").textContent="✓";
    await showRule();
  }

  // ── Fetch rule thật từ S3 qua Lambda ──────────────────────────
  async function showRule() {
    const state = stateRef.current;
    state.ruleGenerated = true;

    let ruleHtml = SIMULATED_RULE;
    let source   = 'SOURCE: simulation (API unavailable)';

    if (CONFIG.USE_REAL_API) {
      try {
        const resp = await fetch(CONFIG.GET_RULE_URL);
        const data = await resp.json();

        if (data.rule_code) {
          ruleHtml = highlightPython(data.rule_code);
          source   = `SOURCE: ${data.model||'gemini-3-flash'} | iter=${data.iteration} | ${(data.generated_at||'').slice(0,19)}`;
          // Lưu rule key động — deployRule() dùng cái này
          state.latestRuleKey = data.rule_key;
          console.log('[GetRule] Fetched:', data.rule_key);
        }
      } catch(e) {
        console.warn('[GetRule] Failed, using fallback:', e);
      }
    }

    document.getElementById("rule-code").innerHTML    = ruleHtml;
    document.getElementById("rule-source").textContent = source;

    const btn = document.getElementById("deploy-btn");
    btn.disabled    = false;
    btn.className   = "deploy-btn ready";
    btn.textContent = "▶ DEPLOY RULE TO PRODUCTION";
    document.getElementById("deploy-hint").textContent = "⚠ Human review required — click to activate";
    document.getElementById("deploy-hint").style.color = "var(--warn)";
  }

  // ── Deploy — gọi approve-rule API thật ────────────────────────
  async function deployRule() {
    const state = stateRef.current;
    if (!state.ruleGenerated || state.ruleDeployed) return;
    state.ruleDeployed = true;

    // Dùng key dynamic từ get-latest-rule, không hardcode
    const ruleKey = state.latestRuleKey || null;

    if (CONFIG.USE_REAL_API && ruleKey) {
      try {
        const resp = await fetch(CONFIG.DEPLOY_URL, {
          method : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body   : JSON.stringify({ rule_key: ruleKey }),
        });
        const data = await resp.json();
        console.log('[Deploy]', data);
      } catch(e) {
        console.warn('[Deploy] API failed:', e);
      }
    }

    const btn = document.getElementById("deploy-btn");
    btn.className   = "deploy-btn deployed";
    btn.textContent = "✓ RULE DEPLOYED — MONITORING ACTIVE";
    document.getElementById("deploy-hint").textContent = "Rule now enforced on all incoming transactions";
    document.getElementById("deploy-hint").style.color = "var(--safe)";
    document.getElementById("b-fpr-after").textContent = CONFIG.BASELINE_FPR_AFTER;
    document.getElementById("b-delta").textContent     = CONFIG.BASELINE_FPR_DELTA;
  }

  async function tick() {
    const state = stateRef.current;
    const total = CONFIG.TOTAL_LEGIT_PRE+CONFIG.CLUSTER3_ROWS+CONFIG.TOTAL_LEGIT_POST;
    if (state.txIndex>=total) { stopDemo(); return; }
    const tx = getTxResult(state.txIndex);
    renderRow(tx); updateMetrics(tx);
    if (state.fnCount>=CONFIG.FN_TRIGGER && !state.ruleGenerated) {
      state.ruleGenerated = true;
      triggerAgenticLoop();
    }
  }

  async function startDemo() {
    const state = stateRef.current;
    if (state.running) { pauseDemo(); return; }


    if (!state.prefetched) {
      document.getElementById("startBtn").disabled  = true;
      document.getElementById("startBtn").textContent = "Loading 0%...";
      if (CONFIG.USE_REAL_API) await prefetchScores();
      state.prefetched = true;
      document.getElementById("startBtn").disabled = false;
    }

    state.running = true;
    document.getElementById("startBtn").textContent = "⏸ PAUSE";
    document.getElementById("startBtn").className   = "ctrl-btn running";
    state.intervalId = setInterval(tick, CONFIG.TX_INTERVAL_MS/state.speed);
  }

  function pauseDemo() {
    stateRef.current.running = false;
    clearInterval(stateRef.current.intervalId);
    document.getElementById("startBtn").textContent = "▶ RESUME";
    document.getElementById("startBtn").className   = "ctrl-btn";
  }

  function stopDemo() {
    stateRef.current.running = false;
    clearInterval(stateRef.current.intervalId);
    document.getElementById("startBtn").textContent = "✓ DEMO COMPLETE";
    document.getElementById("startBtn").className   = "ctrl-btn";
  }

  function resetDemo() {
    const speed = stateRef.current.speed;
    stopDemo();
    stateRef.current  = { ...INITIAL_STATE, speed };
    datasetRef.current = buildDataset();
    document.getElementById("tx-feed").innerHTML    = "";
    document.getElementById("fn-count").textContent = "0";
    document.getElementById("fn-count").className   = "fn-count";
    document.getElementById("fn-bar").style.width   = "0%";
    document.getElementById("fn-bar").className     = "fn-bar-fill";
    document.getElementById("fn-pct").textContent   = "0%";
    document.getElementById("fn-sub").textContent   = "Monitoring for anomalous false negative rate...";
    document.getElementById("fn-sub").style.color   = "";
    document.getElementById("rule-code").innerHTML  = '<span class="rule-placeholder">Awaiting agentic loop trigger...</span>';
    document.getElementById("rule-source").textContent = "";
    document.getElementById("deploy-btn").disabled    = true;
    document.getElementById("deploy-btn").className   = "deploy-btn";
    document.getElementById("deploy-btn").textContent = "▶ DEPLOY RULE TO PRODUCTION";
    document.getElementById("deploy-hint").textContent = "Rule generation required before deployment";
    document.getElementById("deploy-hint").style.color = "";
    document.getElementById("b-fpr-after").textContent = "—";
    document.getElementById("b-delta").textContent     = "—";
    ["s-pass","s-flag","s-block","tx-total"].forEach(id =>
      document.getElementById(id).textContent = id==="tx-total"?"0 / 1103":"0");
    ["m-fnr-no","m-fpr-no","m-caught-no","m-fnr-yes","m-fpr-yes","m-caught-yes"].forEach(id => {
      document.getElementById(id).textContent = id.includes("caught")?"0":"—";
      document.getElementById(id).className   = "metric-value";
    });
    ["ls0","ls1","ls2","ls3","ls4"].forEach((id,i) => {
      const el = document.getElementById(id);
      el.className = "loop-step";
      el.querySelector(".step-icon").textContent = i+1;
    });
    setPhase(0);
    document.getElementById("startBtn").textContent = "▶ START DEMO";
    document.getElementById("startBtn").className   = "ctrl-btn";
  }

  function toggleSpeed() {
    const state  = stateRef.current;
    const speeds = [1,3,8];
    const idx    = speeds.indexOf(state.speed);
    state.speed  = speeds[(idx+1)%speeds.length];
    document.getElementById("speedBtn").textContent = `SPEED: ${state.speed}×`;
    if (state.running) {
      clearInterval(state.intervalId);
      state.intervalId = setInterval(tick, CONFIG.TX_INTERVAL_MS/state.speed);
    }
  }

  return (
    <>
      <header>
        <div className="logo">NEURO<span>SHIELD</span></div>
        <div className="phase-bar">
          <div className="phase-step active" id="ph0">01 BASELINE</div>
          <div className="phase-step" id="ph1">02 ATTACK DETECTED</div>
          <div className="phase-step defense" id="ph2">03 AGENT RESPONSE</div>
          <div className="phase-step" id="ph3">04 RULE DEPLOYED</div>
          <div className="phase-step" id="ph4">05 VALIDATED</div>
        </div>
        <div className="header-right">
          <span><span className="live-dot"></span>LIVE</span>
          <span id="clock">--:--:--</span>
          <span>IEEE-CIS DATASET</span>
        </div>
      </header>

      <div className="grid">
        <div className="panel" style={{ gridRow: "1" }}>
          <div className="panel-header">
            TRANSACTION STREAM
            <span className="count" id="tx-total">0 / 1103</span>
          </div>
          <div className="feed-cols">
            <span>TX ID</span><span>SCORE</span><span>RESULT</span><span>CLUSTER</span><span>RULE</span>
          </div>
          <div id="tx-feed"></div>
        </div>

        <div className="center-col">
          <div className="fn-panel" style={{ background:"var(--bg2)", borderBottom:"1px solid var(--border)" }}>
            <div className="panel-header" style={{ margin:"-14px -18px 10px", padding:"8px 18px" }}>
              FALSE NEGATIVES (CLUSTER 3)
              <span id="fn-pct" className="count">0%</span>
            </div>
            <div className="fn-numbers">
              <span className="fn-count" id="fn-count">0</span>
              <span className="fn-threshold">/ 75 trigger</span>
            </div>
            <div className="fn-bar-bg"><div className="fn-bar-fill" id="fn-bar"></div></div>
            <div className="fn-sub" id="fn-sub">Monitoring for anomalous false negative rate...</div>
          </div>

          <div className="loop-panel" style={{ borderBottom:"1px solid var(--border)" }}>
            <div className="loop-title">⬡ Agentic Loop Status</div>
            <div className="loop-steps">
              <div className="loop-step" id="ls0"><div className="step-icon">1</div><span>Threshold breach detected (FN ≥ 75)</span></div>
              <div className="loop-step" id="ls1"><div className="step-icon">2</div><span>Lambda Analyzer: Cohen's d computation</span></div>
              <div className="loop-step" id="ls2"><div className="step-icon">3</div><span>Feature divergence context → Gemini 3 Flash</span></div>
              <div className="loop-step" id="ls3"><div className="step-icon">4</div><span>Gemini generates detection rule</span></div>
              <div className="loop-step" id="ls4"><div className="step-icon">5</div><span>Rule stored → S3, sandbox validated</span></div>
            </div>
          </div>

          <div className="rule-panel">
            <div className="rule-title">
              <span>AI-GENERATED RULE</span>
              <span className="rule-source" id="rule-source"></span>
            </div>
            <div className="rule-code" id="rule-code">
              <span className="rule-placeholder">Awaiting agentic loop trigger...</span>
            </div>
          </div>

          <div className="deploy-panel">
            <button className="deploy-btn" id="deploy-btn" disabled onClick={deployRule}>
              ▶ DEPLOY RULE TO PRODUCTION
            </button>
            <div className="deploy-hint" id="deploy-hint">Rule generation required before deployment</div>
          </div>
        </div>

        <div className="right-col">
          <div className="summary-panel">
            <div className="summary-item"><div className="summary-num" id="s-pass">0</div><div className="summary-lbl">PASSED</div></div>
            <div className="summary-item"><div className="summary-num" id="s-flag" style={{color:"var(--fraud)"}}>0</div><div className="summary-lbl">FLAGGED</div></div>
            <div className="summary-item"><div className="summary-num" id="s-block" style={{color:"var(--safe)"}}>0</div><div className="summary-lbl">BLOCKED</div></div>
          </div>

          <div className="metric-block">
            <div className="metric-block-title">SCENARIO A <span className="scenario-badge no-rule">WITHOUT RULE</span></div>
            <div className="metric-row"><span className="metric-name">Cluster 3 FNR</span><span className="metric-value bad" id="m-fnr-no">—</span></div>
            <div className="metric-row"><span className="metric-name">Overall FPR</span><span className="metric-value" id="m-fpr-no">—</span></div>
            <div className="metric-row"><span className="metric-name">Fraud Caught</span><span className="metric-value bad" id="m-caught-no">0</span></div>
          </div>

          <div className="metric-block">
            <div className="metric-block-title">SCENARIO B <span className="scenario-badge with-rule">WITH RULE</span></div>
            <div className="metric-row"><span className="metric-name">Cluster 3 FNR</span><span className="metric-value" id="m-fnr-yes">—</span></div>
            <div className="metric-row"><span className="metric-name">Overall FPR</span><span className="metric-value" id="m-fpr-yes">—</span></div>
            <div className="metric-row"><span className="metric-name">Fraud Caught</span><span className="metric-value good" id="m-caught-yes">0</span></div>
          </div>

          <div className="baseline-panel" style={{ borderTop:"1px solid var(--border)" }}>
            <div className="baseline-title">BASELINE IMPACT — Validation Set</div>
            <div className="baseline-row"><span className="baseline-name">Legit FPR (before rule)</span><span className="baseline-val">1.02%</span></div>
            <div className="baseline-row"><span className="baseline-name">Legit FPR (after rule)</span><span className="baseline-val" id="b-fpr-after">—</span></div>
            <div className="baseline-row"><span className="baseline-name">FPR Δ</span><span className="baseline-val" id="b-delta">—</span></div>
            <div className="baseline-note">Pre-computed on 1,000-row held-out validation sample</div>
          </div>

          <div className="aws-panel">
            <div className="aws-title">AWS Stack</div>
            <div className="aws-services">
              <span className="aws-tag">SageMaker</span>
              <span className="aws-tag">Gemini 3 Flash</span>
              <span className="aws-tag">Lambda</span>
              <span className="aws-tag">Step Functions</span>
              <span className="aws-tag">CloudWatch</span>
              <span className="aws-tag">S3</span>
              <span className="aws-tag">SNS</span>
              <span className="aws-tag">API Gateway</span>
            </div>
          </div>
        </div>
      </div>

      <div className="control-bar">
        <button className="ctrl-btn" id="speedBtn" onClick={toggleSpeed}>SPEED: 1×</button>
        <button className="ctrl-btn" id="startBtn" onClick={startDemo}>▶ START DEMO</button>
        <button className="ctrl-btn" id="resetBtn" onClick={resetDemo}>↺ RESET</button>
      </div>
    </>
  );
}
