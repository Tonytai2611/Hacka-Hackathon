import { CONFIG } from '../../constants/config';

export default function FalseNegativeMonitor({ fnCount }) {
  const pct = Math.min(100, (fnCount / CONFIG.FN_TRIGGER) * 100).toFixed(0);
  const isDanger = fnCount >= CONFIG.FN_TRIGGER * 0.7;
  const isBreached = fnCount >= CONFIG.FN_TRIGGER;

  return (
    <div className="fn-panel" >
      <div className="panel-header" style={{ margin:"-14px -18px 10px", padding:"8px 18px" }}>
        FALSE NEGATIVES (CLUSTER 3)
        <span id="fn-pct" className="count">{pct}%</span>
      </div>
      
      <div className="fn-numbers">
        <span className={`fn-count ${isDanger ? "danger" : ""}`} id="fn-count">{fnCount}</span>
        <span className="fn-threshold">/ {CONFIG.FN_TRIGGER} trigger</span>
      </div>
      
      <div className="fn-bar-bg">
        <div 
          className={`fn-bar-fill ${isDanger ? "danger" : ""}`} 
          id="fn-bar" 
          style={{ width: `${pct}%` }}
        ></div>
      </div>
      
      <div 
        className="fn-sub" 
        id="fn-sub"
        style={{ color: isBreached ? "var(--fraud)" : "var(--muted)" }}
      >
        {isBreached 
          ? "! THRESHOLD BREACHED - Agentic loop triggered" 
          : fnCount > 0 
            ? `${CONFIG.FN_TRIGGER - fnCount} more misses until loop fires`
            : "Monitoring for anomalous false negative rate..."
        }
      </div>
    </div>
  );
}
