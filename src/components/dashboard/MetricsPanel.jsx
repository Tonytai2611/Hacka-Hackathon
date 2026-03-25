import { CONFIG } from '../../constants/config';

export default function MetricsPanel({ state }) {
  // Fix division by zero protection and missing state index variables
  const computedFPR = state.txIndex > 0 ? ((state.legitFlaggedNoRule / Math.min(state.txIndex, 500)) * 100).toFixed(2) + '%' : "-";

  return (
    <>
      <div className="summary-panel">
        <div className="summary-item"><div className="summary-num" id="s-pass">{state.passCount}</div><div className="summary-lbl">PASSED</div></div>
        <div className="summary-item"><div className="summary-num" id="s-flag" style={{color:"var(--warn)"}}>{state.flagCount}</div><div className="summary-lbl">FLAGGED</div></div>
        <div className="summary-item"><div className="summary-num" id="s-block" style={{color:"var(--safe)"}}>{state.blockCount}</div><div className="summary-lbl">BLOCKED</div></div>
      </div>

      <div className="metric-block">
        <div className="metric-block-title">SCENARIO A <span className="scenario-badge no-rule">WITHOUT RULE</span></div>
        <div className="metric-row">
          <span className="metric-name">Cluster 3 Misses</span>
          <span className="metric-value bad">{state.fnCountNoRule}</span>
        </div>
        <div className="metric-row">
          <span className="metric-name">Overall FPR</span>
          <span className="metric-value">{computedFPR}</span>
        </div>
        <div className="metric-row">
          <span className="metric-name">Fraud Caught</span>
          <span className="metric-value bad">{state.ruleDeployed ? state.baselineCaughtTotal : Math.max(0, state.flagCount)}</span>
        </div>
      </div>

      <div className="metric-block">
        <div className="metric-block-title">SCENARIO B <span className="scenario-badge with-rule">WITH RULE</span></div>
        <div className="metric-row">
          <span className="metric-name">Cluster 3 Misses</span>
          <span className="metric-value">{state.ruleDeployed ? 0 : "-"}</span>
        </div>
        <div className="metric-row">
          <span className="metric-name">Overall FPR</span>
          <span className="metric-value">{state.ruleDeployed ? CONFIG.WITH_RULE_FPR : "-"}</span>
        </div>
        <div className="metric-row">
          <span className="metric-name">Fraud Caught</span>
          <span className="metric-value good">{state.ruleDeployed ? state.newCaughtTotal : "0"}</span>
        </div>
      </div>
    </>
  );
}
