import { CONFIG } from '../../constants/config';

export default function MetricsPanel({ state }) {
  // Use configurable baseline FPR for the display panel
  const computedFPR = state.txIndex > 0 ? CONFIG.BASE_MODEL_FPR : "-";

  return (
    <>
      <div className="summary-panel">
        <div className="summary-item"><div className="summary-num" id="s-pass">{state.passCount}</div><div className="summary-lbl">PASSED</div></div>
        <div className="summary-item"><div className="summary-num" id="s-flag" style={{color:"var(--warn)"}}>{state.flagCount}</div><div className="summary-lbl">FLAGGED</div></div>
        <div className="summary-item"><div className="summary-num" id="s-block" style={{color:"var(--safe)"}}>{state.blockCount}</div><div className="summary-lbl">BLOCKED</div></div>
      </div>

      <div className="metric-block combined-scenarios">
        <div className="metric-block-title">PERFORMANCE COMPARISON</div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '10px' }}>
          {/* Baseline Side */}
          <div className="scenario-side">
            <div className="scenario-mini-label no-rule">BASELINE</div>
            <div className="metric-row">
              <span className="metric-name">P-1 Misses</span>
              <span className="metric-value bad">{state.fnCountNoRule}</span>
            </div>
            <div className="metric-row">
              <span className="metric-name">FPR</span>
              <span className="metric-value">{computedFPR}</span>
            </div>
            <div className="metric-row">
              <span className="metric-name">Caught</span>
              <span className="metric-value bad">{state.ruleDeployed ? state.baselineCaughtTotal : Math.max(0, state.flagCount)}</span>
            </div>
          </div>

          {/* Agentic Side */}
          <div className="scenario-side" style={{ borderLeft: '1px solid #2d3f56', paddingLeft: '20px' }}>
            <div className="scenario-mini-label with-rule">AGENTIC</div>
            <div className="metric-row">
              <span className="metric-name">P-2 Misses</span>
              <span className="metric-value">{state.phase >= 3 ? 0 : "-"}</span>
            </div>
            <div className="metric-row">
              <span className="metric-name">FPR</span>
              <span className="metric-value">{state.phase >= 3 ? CONFIG.WITH_RULE_FPR : "-"}</span>
            </div>
            <div className="metric-row">
              <span className="metric-name">Caught</span>
              <span className="metric-value good">{state.phase >= 3 ? state.newCaughtTotal : "0"}</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
