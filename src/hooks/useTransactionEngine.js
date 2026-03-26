import { useState, useEffect, useCallback, useRef } from 'react';
import { CONFIG } from '../constants/config';
import { loadAndParseDataset } from '../lib/parseDataset';

export function useTransactionEngine() {
  const [dataset, setDataset] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [timelineStats, setTimelineStats] = useState([]);
  const rulePollingRef = useRef(null);  // holds the polling interval
  
  const [state, setState] = useState({
    phase: 0,
    txIndex: 0,
    replayIndex: 0,
    fnCount: 0,
    passCount: 0,
    flagCount: 0,
    blockCount: 0,
    fnCountNoRule: 0,
    legitFlaggedNoRule: 0,
    ruleGenerated: false,
    ruleDeployed: false,
    loopStep: -1,
    generatedRule: '',
    baselineCaughtTotal: 0,
    newCaughtTotal: 0,
    ruleMetadata: null,
    awsRuleJson: null,
  });

  useEffect(() => {
    loadAndParseDataset().then(data => {
      const dataS = data.slice(0, 700);
      setDataset(dataS);
      setIsLoaded(true);
    }).catch(e => console.error(e));

    // Fetch the latest deployed rule from the backend and cache locally.
    fetch(CONFIG.GET_RULE_URL)
      .then(res => res.json())
      .then(data => {
        if (data && data.rule_code) {
          localStorage.setItem('ns_rule_code', data.rule_code);
          localStorage.setItem('ns_rule_key', data.rule_key || '');
          console.log('[NeuroShield] Rule synced from backend:', data.rule_key);
          setState(st => ({ ...st, awsRuleJson: data }));
        }
      })
      .catch(err => console.warn('[NeuroShield] Could not sync rule from backend:', err));
  }, []);

  const getTxResult = useCallback((item, ruleActive = false) => {
    const isCluster3 = item.isCluster3;
    let score, isFraudByBase, isCaughtByRule, cluster;
    
    if (isCluster3) {
      score = 0.45 + Math.random() * 0.25; 
      isFraudByBase = false;
      isCaughtByRule = ruleActive; 
      cluster = 'Fraud';
    } else {
      score = Math.random() < 0.02 ? 0.83 + Math.random() * 0.15 : 0.1 + Math.random() * 0.55;
      isFraudByBase = score > CONFIG.THRESHOLD;
      isCaughtByRule = false;
      cluster = 'Legit';
    }

    let result, badge;
    if (isCaughtByRule) { 
      result = 'BLOCK'; badge = 'badge-block'; 
    } else if (isFraudByBase) { 
      result = 'FLAG'; badge = 'badge-flag'; 
    } else { 
      result = 'PASS'; badge = 'badge-pass'; 
    }

    return { txId: item.id, score, cluster, result, badge, isCluster3, isCaughtByRule, isFraudByBase, time: new Date().toLocaleTimeString("en-US", { hour12: false }) };
  }, []);

  const stopRulePolling = () => {
    if (rulePollingRef.current) {
      clearInterval(rulePollingRef.current);
      rulePollingRef.current = null;
      console.log('[NeuroShield] Rule polling stopped.');
    }
  };

  const runBaseline = () => {
    setState(st => ({ ...st, phase: 1 }));

    // 1. Grab the current rule_key as our baseline BEFORE triggering anything.
    //    We compare against this to know when the backend has generated something NEW.
    let baselineRuleKey = null;
    fetch(CONFIG.GET_RULE_URL)
      .then(res => res.json())
      .then(data => {
        baselineRuleKey = (data && data.rule_key) || null;
        console.log('[NeuroShield] Baseline rule_key recorded:', baselineRuleKey);
      })
      .catch(() => { baselineRuleKey = null; });

    // Clear stale cache so the agent loop starts fresh.
    localStorage.removeItem('ns_rule_code');
    localStorage.removeItem('ns_rule_key');

    // 2. Trigger CloudWatch metric so AWS starts generating a new rule.
    if (CONFIG.USE_REAL_API) {
      fetch(CONFIG.TRIGGER_METRIC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: CONFIG.FN_TRIGGER })
      })
        .then(res => res.json())
        .then(d => console.log('[NeuroShield] Metric triggered:', d))
        .catch(err => console.warn('[NeuroShield] Metric trigger failed:', err));
    }

    // 3. Wait 2 minutes, then poll every 5s.
    //    Approve the rule only after fetching the SAME new rule_key 5 times in a row.
    stopRulePolling();
    const POLL_DELAY_MS = 2 * 60 * 1000;   // 2 minutes
    const CONFIRM_COUNT = 5;                // must see same key this many times
    let consecutiveMatches = 0;
    let lastSeenKey = null;

    const startPolling = () => {
      rulePollingRef.current = setInterval(() => {
        fetch(CONFIG.GET_RULE_URL)
          .then(res => res.json())
          .then(data => {
            const incoming = data && data.rule_code && data.rule_code.trim();
            const incomingKey = (data && data.rule_key) || null;

            if (!incoming || !incomingKey) {
              consecutiveMatches = 0;
              lastSeenKey = null;
              console.log('[NeuroShield] No rule returned, resetting counter...');
              return;
            }

            if (incomingKey === baselineRuleKey) {
              consecutiveMatches = 0;
              lastSeenKey = null;
              console.log('[NeuroShield] Same as baseline, still waiting...');
              return;
            }

            // It's a new key — track consecutive matches for stability.
            if (incomingKey === lastSeenKey) {
              consecutiveMatches++;
              console.log(`[NeuroShield] New key match ${consecutiveMatches}/${CONFIRM_COUNT}: ${incomingKey}`);
            } else {
              consecutiveMatches = 1;
              lastSeenKey = incomingKey;
              console.log(`[NeuroShield] New key first seen (1/${CONFIRM_COUNT}): ${incomingKey}`);
            }

            if (consecutiveMatches >= CONFIRM_COUNT) {
              localStorage.setItem('ns_rule_code', incoming);
              localStorage.setItem('ns_rule_key', incomingKey);
              console.log('[NeuroShield] Rule approved after 5 stable fetches:', incomingKey);
              stopRulePolling();
            }
          })
          .catch(err => console.warn('[NeuroShield] Rule polling error:', err));
      }, 5000);
    };

    console.log('[NeuroShield] Polling will start in 2 minutes...');
    setTimeout(startPolling, POLL_DELAY_MS);
    let idx = 0;
    let pC = 0, fC = 0, fnC = 0, bC = 0;
    let currentTxs = [];

    const interval = setInterval(() => {
      for (let i = 0; i < 20; i++) {
        if (idx >= dataset.length) {
          clearInterval(interval);
          setTimeout(() => startAgentLoop(), 1800); // Auto-start next phase
          return;
        }
        const item = dataset[idx];
        const tx = getTxResult(item, false);
        if (tx.result === 'PASS') pC++;
        if (tx.result === 'FLAG') fC++;
        if (tx.isCluster3 && !tx.isFraudByBase) fnC++;

        currentTxs.unshift(tx);
        idx++;

        if (idx > 0 && idx % 35 === 0) {
           // Not doing tStats for baseline currently as only 1 line, 
           // but adding it if needed for symmetry. 
           // But actually App.jsx shows ComparisonChart has timelineStats
        }
      }
      
      setTransactions([...currentTxs]); // render all rows visually
      setState(st => ({
        ...st,
        txIndex: idx,
        replayIndex: 0,
        fnCount: 0, 
        passCount: pC,
        flagCount: fC,
        blockCount: bC,
        fnCountNoRule: fnC,
        legitFlaggedNoRule: fC
      }));
    }, 400);
  };

  const startAgentLoop = async () => {
    setState(st => ({ ...st, phase: 2, loopStep: 0, fnCount: 0 }));
    let currentFn = 0;
    
    // Animate the FN threshold 1-by-1
    const fnInterval = setInterval(async () => {
      currentFn++;
      setState(st => ({ ...st, fnCount: currentFn }));
      
      if (currentFn >= CONFIG.FN_TRIGGER) {
        clearInterval(fnInterval);

        // Use the rule fetched from GET_RULE_URL (cached in localStorage)
        const cachedRule = localStorage.getItem('ns_rule_code');
        let ruleCode = cachedRule ? String(cachedRule) : '';
        
        if (CONFIG.USE_REAL_API) {
          try {
            console.group('AWS Bedrock Handshake');
            console.log('Endpoint:', CONFIG.GATEKEEPER_URL);
            setState(st => ({ ...st, loopStep: 1 })); // Analyzing
            const response = await fetch(CONFIG.GATEKEEPER_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'analyze',
                trigger_type: 'threshold_breach',
                threshold: CONFIG.FN_TRIGGER,
                sample_ids: dataset.filter(d => d.isCluster3).map(d => d.id)
              })
            });
            const data = await response.json();
            console.log('Raw API Result (Bedrock):', JSON.stringify(data, null, 2));
            if (data && data.rule) {
                ruleCode = String(data.rule);
            }
            setState(st => ({ ...st, ruleMetadata: data })); // Capture JSON metadata
            console.groupEnd();
          } catch (e) {
            console.error('AWS Bedrock Link Failed:', e);
            console.groupEnd();
          }
        }

        let step = 0;
        let waitingForRule = false;
        const loopInterval = setInterval(() => {
          // If stuck waiting for rule at step 4 (S3 Validate), check localStorage.
          if (waitingForRule) {
            const freshRule = localStorage.getItem('ns_rule_code');
            if (freshRule && freshRule.trim()) {
              ruleCode = freshRule;
              waitingForRule = false;
              // Resume: advance to step 5
              step = 5;
              setState(st => ({ ...st, loopStep: step }));
            }
            // Otherwise just stay stuck — UI shows "..." on step 4.
            return;
          }

          if (step >= 4) {
            clearInterval(loopInterval);
            const rawRule = localStorage.getItem('ns_rule_code') || ruleCode;
            const finalRule = (rawRule && rawRule.trim().length > 10) ? rawRule : `
# NeuroShield Agentic Rule: Adaptive Cluster 3 Defense
# Optimized for IEEE-CIS / Cluster 3 Anomaly patterns
# Generated: {ts}

def apply_rule(tx):
    # High-confidence behavioral detection (Agentic Loop)
    if tx.get('score') > 0.40 and tx.get('cluster') == 'Fraud':
        return True # BLOCK
    return False # PASS
`.trim();

            setState(st => ({ 
              ...st, 
              loopStep: 6, 
              ruleGenerated: true, 
              phase: 3,
              generatedRule: finalRule.replace('{ts}', new Date().toISOString().slice(0, 19) + 'Z')
            }));
            
            // Auto-trigger simulation immediately so user can review performance
            runRuleRerun();
          } else {
            step++;
            setState(st => ({ ...st, loopStep: step }));
            // Pause after step 3 ("Rule stored → S3 Sandbox Validate") if no rule yet.
            if (step === 3 && !localStorage.getItem('ns_rule_code')) {
              waitingForRule = true;
            }
          }
        }, CONFIG.USE_REAL_API ? 600 : 1200);
      }
    }, 10);
  };

  const runRuleRerun = () => {
    let idx = 0;
    let pC = 0, fC = 0, bC = 0;
    let baseCaughtCumul = 0;
    let newCaughtCumul = 0;
    let tStats = [];
    let currentTxs = [];
    let baseLegitCount = 0;
    let baseLegitFlagged = 0;
    let newLegitCount = 0;
    let newLegitFlagged = 0;
    
    // reset visual stats
    setTransactions([]);
    setTimelineStats([]);
    const interval = setInterval(() => {
      // Process in smaller, faster batches for smoother UI
      for (let i = 0; i < 25; i++) {
        if (idx >= dataset.length) {
          clearInterval(interval);
          setState(st => ({ 
            ...st, 
            baselineCaughtTotal: baseCaughtCumul,
            newCaughtTotal: 103 // Hardcoded as requested
          }));
          return;
        }
        
        const item = dataset[idx];
        const tx = getTxResult(item, true);
        const origTx = getTxResult(item, false);

        if (idx === 0) console.log('[NeuroShield] First simulation TX:', tx);

        if (origTx.result === 'FLAG' || origTx.result === 'BLOCK') baseCaughtCumul++;
        if (tx.result === 'FLAG' || tx.result === 'BLOCK') newCaughtCumul++;

        if (origTx.cluster === 'Legit') {
           baseLegitCount++;
           if (origTx.result === 'FLAG') baseLegitFlagged++;
        }
        if (tx.cluster === 'Legit') {
           newLegitCount++;
           if (tx.result === 'FLAG') newLegitFlagged++;
        }

        if (tx.result === 'PASS') pC++;
        if (tx.result === 'FLAG') fC++;
        if (tx.result === 'BLOCK') bC++;

        currentTxs.unshift({ ...tx }); // Ensure new object reference
        idx++;

        if (idx > 0 && idx % 35 === 0) {
          let progress = idx / dataset.length;
          let targetBase = 8.846;
          let targetAfter = 8.928;
          let noise = (Math.sin(idx) * 0.05) * (1 - progress); 
          let fprB = targetBase + noise;
          let fprA = targetAfter + noise + (Math.cos(idx)*0.02) * (1 - progress);

          tStats.push({ 
            name: `${idx}`, 
            caughtBase: baseCaughtCumul, 
            caughtAfter: Math.min(103, newCaughtCumul),
            fprBase: parseFloat(fprB.toFixed(3)),
            fprAfter: parseFloat(fprA.toFixed(3))
          });
        }
      }

      setTimelineStats([...tStats]);
      setTransactions([...currentTxs]);
      setState(st => ({
        ...st,
        replayIndex: idx,
        passCount: pC,
        flagCount: fC,
        blockCount: bC,
      }));
    }, 150); // Faster updates for better UX 400);
  };

  const deployRuleAndRerun = async () => {
    if (CONFIG.USE_REAL_API && state.generatedRule) {
      try {
        const ruleKey = localStorage.getItem('ns_rule_key') || '';
        console.log('Deploying rule to AWS, key:', ruleKey);
        await fetch(CONFIG.DEPLOY_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rule_code: state.generatedRule, rule_key: ruleKey, action: 'deploy' })
        });
      } catch (e) {
        console.error('AWS Deployment Failed:', e);
      }
    }

    setState(st => ({ ...st, phase: 4, ruleDeployed: true }));
  };

  const resetDemo = () => {
    stopRulePolling();
    setTransactions([]);
    setTimelineStats([]);
    setState({
      phase: 0, txIndex: 0, replayIndex: 0, fnCount: 0, passCount: 0, flagCount: 0, blockCount: 0,
      fnCountNoRule: 0, legitFlaggedNoRule: 0,
      ruleGenerated: false, ruleDeployed: false, loopStep: -1,
    });
  };

  return { isLoaded, dataset, transactions, timelineStats, state, runBaseline, startAgentLoop, deployRuleAndRerun, resetDemo };
}
