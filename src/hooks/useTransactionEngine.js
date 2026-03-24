import { useState, useEffect, useCallback } from 'react';
import { CONFIG, SIMULATED_RULE } from '../constants/config';
import { loadAndParseDataset } from '../lib/parseDataset';

export function useTransactionEngine() {
  const [dataset, setDataset] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [timelineStats, setTimelineStats] = useState([]);
  
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
  });

  useEffect(() => {
    loadAndParseDataset().then(data => {
      const dataS = data.slice(0, 700);
      setDataset(dataS);
      setIsLoaded(true);
    }).catch(e => console.error(e));
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

  const runBaseline = () => {
    setState(st => ({ ...st, phase: 1 }));
    let idx = 0;
    let pC = 0, fC = 0, fnC = 0, bC = 0;
    let currentTxs = [];

    const interval = setInterval(() => {
      for (let i = 0; i < 50; i++) {
        if (idx >= dataset.length) {
          clearInterval(interval);
          return;
        }
        const item = dataset[idx];
        const tx = getTxResult(item, false);
        if (tx.result === 'PASS') pC++;
        if (tx.result === 'FLAG') fC++;
        if (tx.isCluster3 && !tx.isFraudByBase) fnC++;

        currentTxs.unshift(tx);
        idx++;
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
        
        let ruleCode = String(SIMULATED_RULE || "");
        
        if (CONFIG.USE_REAL_API) {
          try {
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
            if (data && data.rule) {
               ruleCode = String(data.rule);
            }
          } catch (e) {
            console.error('AWS Bedrock Link Failed:', e);
          }
        }

        let step = 0;
        const loopInterval = setInterval(() => {
          if (step >= 5) {
            clearInterval(loopInterval);
            setState(st => ({ 
              ...st, 
              loopStep: 6, 
              ruleGenerated: true, 
              phase: 3,
              generatedRule: ruleCode.replace('{ts}', new Date().toISOString().slice(0, 19) + 'Z')
            }));
          } else {
            step++;
            setState(st => ({ ...st, loopStep: step }));
          }
        }, CONFIG.USE_REAL_API ? 600 : 1200);
      }
    }, 25);
  };

  const deployRuleAndRerun = async () => {
    if (CONFIG.USE_REAL_API && state.generatedRule) {
      try {
        await fetch(CONFIG.DEPLOY_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rule: state.generatedRule, action: 'deploy' })
        });
      } catch (e) {
        console.error('AWS Deployment Failed:', e);
      }
    }

    setState(st => ({ ...st, phase: 4, ruleDeployed: true }));
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
      for (let i = 0; i < 50; i++) {
        if (idx >= dataset.length) {
          clearInterval(interval);
          setState(st => ({ ...st, ruleDeployed: true }));
          break;
        }
        
        const item = dataset[idx];
        const tx = getTxResult(item, true);
        const origTx = getTxResult(item, false);

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

        if (idx > 0 && idx % 35 === 0) {
          let fprB = baseLegitCount > 0 ? (baseLegitFlagged / baseLegitCount * 100) : 0;
          let fprA = newLegitCount > 0 ? (newLegitFlagged / newLegitCount * 100) : 0;
          tStats.push({ 
            name: `${idx}`, 
            caughtBase: baseCaughtCumul, 
            caughtAfter: newCaughtCumul,
            fprBase: parseFloat(fprB.toFixed(2)),
            fprAfter: parseFloat(fprA.toFixed(2))
          });
        }

        currentTxs.unshift(tx);
        idx++;
      }

      setTimelineStats([...tStats]); // Update chart progressively
      setTransactions([...currentTxs]);
      setState(st => ({
        ...st,
        replayIndex: idx,
        passCount: pC,
        flagCount: fC,
        blockCount: bC,
      }));
    }, 400);
  };

  const resetDemo = () => {
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
