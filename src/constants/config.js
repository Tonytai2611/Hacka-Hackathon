export const CONFIG = {
  USE_REAL_API: false,
  GATEKEEPER_URL: 'https://1y2xabeojj.execute-api.us-east-1.amazonaws.com/analyze-transactions',
  DEPLOY_URL: 'https://1y2xabeojj.execute-api.us-east-1.amazonaws.com/approve-rule',
  GET_RULE_URL: 'https://1y2xabeojj.execute-api.us-east-1.amazonaws.com/get-latest-rule',
  
  PREFETCH_CHUNK: 20,

  TOTAL_LEGIT_PRE: 500,     // Phase 1 transactions
  CLUSTER3_ROWS: 103,       // Exactly 103 Cluster 3 transactions 
  FN_TRIGGER: 75,           // Threshold for Bedrock generation
  
  THRESHOLD: 0.82,

  BASELINE_FPR_AFTER: '1.09%',
  BASELINE_FPR_DELTA: '+0.07%',
  WITH_RULE_FNR: '5.8%',
  WITH_RULE_FPR: '1.09%',
  TX_INTERVAL_MS: 180,
};

export const SIMULATED_RULE = `# NeuroShield Agentic Rule - Auto-Generated
# Trigger: FN >= 75 | Cohen's d: 2.41 | Timestamp: {ts}

def detect_fraud(transaction: dict) -> bool:
    if transaction.get('C10', 0) >= 1100.0 or transaction.get('C7', 0) >= 700.0 or transaction.get('C8', 0) >= 1100.0:
        return True
    return False`;
