import React from 'react';

export default function JsonRulePanel({ metadata, title = "AWS PRODUCTION RULE" }) {
  if (!metadata) {
    return (
      <div className="summary-panel" style={{ background: "rgba(255,165,0,0.05)", border: "1px dashed var(--warn)", padding: "20px", textAlign: "center", color: "var(--warn)", fontSize: "12px" }}>
        {title} Awaiting...
      </div>
    );
  }

  const { rule_code, rule_key, last_modified, ...other } = metadata;

  return (
    <div className="metric-block" id="aws-rule-card" style={{ marginTop: "15px", background: "#060a11", border: "1px solid #1a2332" }}>
      <div className="metric-block-title" style={{ color: "var(--warn)", marginBottom: "15px" }}>
        {title} <span className="scenario-badge with-rule">S3_OBJ_LATEST</span>
      </div>

      <div className="metadata-rows" style={{ marginBottom: "15px" }}>
        <div className="metric-row">
            <span className="metric-name" style={{ color: "#8b9bb4" }}>RULE ID:</span>
            <span className="metric-value font-mono" style={{ fontSize: "10px", color: "#ddd" }}>{rule_key || "unknown_guid"}</span>
        </div>
        {last_modified && (
             <div className="metric-row">
             <span className="metric-name" style={{ color: "#8b9bb4" }}>LAST SYNC:</span>
             <span className="metric-value" style={{ fontSize: "10px", color: "#aaa" }}>{new Date(last_modified).toLocaleString()}</span>
         </div>
        )}
      </div>

      <div className="rule-source-code" style={{ 
        background: "#0a111a", 
        padding: "10px", 
        borderRadius: "4px", 
        border: "1px solid #1a2332",
        maxHeight: "350px", 
        overflowY: "auto",
        fontSize: "10px",
        fontFamily: "'Courier New', monospace",
        color: "#00ffb2"
      }}>
        <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>{rule_code || "/* No logic found in object */"}</pre>
      </div>
    </div>
  );
}
