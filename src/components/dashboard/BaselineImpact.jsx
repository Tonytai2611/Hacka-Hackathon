import { CONFIG } from '../../constants/config';

export default function BaselineImpact({ ruleDeployed }) {
  return (
    <div className="baseline-panel" >
      <div className="baseline-title">BASELINE IMPACT - Validation Set</div>
      <div className="baseline-row">
        <span className="baseline-name">Legit FPR (before rule)</span>
        <span className="baseline-val">1.02%</span>
      </div>
      <div className="baseline-row">
        <span className="baseline-name">Legit FPR (after rule)</span>
        <span className="baseline-val">{ruleDeployed ? CONFIG.BASELINE_FPR_AFTER : "-"}</span>
      </div>
      <div className="baseline-row">
        <span className="baseline-name">FPR Delta</span>
        <span className="baseline-val">{ruleDeployed ? CONFIG.BASELINE_FPR_DELTA : "-"}</span>
      </div>
      <div className="baseline-note">Pre-computed on 1,000-row held-out validation sample</div>
    </div>
  );
}
