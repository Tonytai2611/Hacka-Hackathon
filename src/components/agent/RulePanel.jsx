

function highlightCode(code) {
  return code
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/\\b(def|if|elif|else|return|and|or|not|True|False|None)\\b/g, '<span class="kw">$1</span>')
    .replace(/(\\b\\d+\\.?\\d*\\b)/g, '<span class="num">$1</span>')
    .replace(/('[^'\\n]*'|"[^"\\n]*")/g, '<span class="str">$1</span>')
    .replace(/(#[^\\n]*)/g, '<span class="cmt">$1</span>')
    .replace(/\\b(apply_rule|tx\\.get)\\b/g, '<span class="fn">$1</span>')
}

export default function RulePanel({ ruleGenerated, ruleDeployed, generatedRule, deployRule }) {
  const ruleHtml = generatedRule;
  
  return (
    <div className="rule-container-main" style={{ display: 'flex', flexDirection: 'column', flexShrink: 0, minHeight: '350px', background: 'var(--rule-bg)', border: '1px solid var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
      <div className="rule-panel" style={{ flex: 1, padding: '12px 18px', display: 'flex', flexDirection: 'column' }}>
        <div className="rule-title">
          <span>BEDROCK-GENERATED RULE</span>
          <span className="rule-source" id="rule-source">
            {ruleGenerated ? "SOURCE: aws bedrock / claude-3-5-sonnet" : ""}
          </span>
        </div>
        <div className="rule-code" id="rule-code" style={{ flex: 1, overflowY: 'auto' }} dangerouslySetInnerHTML={{ 
            __html: ruleGenerated ? highlightCode(ruleHtml) : '<span class="rule-placeholder">Awaiting agentic loop trigger...</span>' 
        }}>
        </div>
      </div>

      <div className="deploy-panel" style={{ background: 'var(--bg3)', padding: '12px 18px', borderTop: '1px solid var(--border)' }}>
        <button 
          className={`deploy-btn ${ruleDeployed ? "deployed" : ruleGenerated ? "ready" : ""}`} 
          id="deploy-btn" 
          disabled={!ruleGenerated || ruleDeployed} 
          onClick={deployRule}
        >
          {ruleDeployed ? "[OK] RULE DEPLOYED - MONITORING ACTIVE" : "> DEPLOY RULE TO PRODUCTION"}
        </button>
        <div 
          className="deploy-hint" 
          style={{ color: ruleDeployed ? "var(--safe)" : ruleGenerated ? "var(--warn)" : "var(--muted)" }}
        >
          {ruleDeployed 
            ? "Rule now enforced on all incoming transactions" 
            : ruleGenerated 
              ? "! Human review required - click to activate"
              : "Rule generation required before deployment"
          }
        </div>
      </div>
    </div>
  );
}
