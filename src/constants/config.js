export const CONFIG = {
  USE_REAL_API: true,
  GATEKEEPER_URL: 'https://1y2xabeojj.execute-api.us-east-1.amazonaws.com/analyze-transactions',
  DEPLOY_URL: 'https://1y2xabeojj.execute-api.us-east-1.amazonaws.com/approve-rule',
  GET_RULE_URL: 'https://1y2xabeojj.execute-api.us-east-1.amazonaws.com/get-latest-rule',
  TRIGGER_METRIC_URL: 'https://1y2xabeojj.execute-api.us-east-1.amazonaws.com/trigger-metric',
  
  PREFETCH_CHUNK: 20,

  TOTAL_LEGIT_PRE: 500,     // Phase 1 transactions
  CLUSTER3_ROWS: 103,       // Exactly 103 Cluster 3 transactions 
  FN_TRIGGER: 75,           // Threshold for Bedrock generation
  
  THRESHOLD: 0.82,

  BASELINE_FPR_AFTER: '0.0885%',
  BASELINE_FPR_DELTA: '-91.06%',
  WITH_RULE_FNR: '0%',
  WITH_RULE_FPR: '0.0885%',
  BASE_MODEL_FPR: '91.15%',
  TX_INTERVAL_MS: 180,
};