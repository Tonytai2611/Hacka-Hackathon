export default function ControlBar({ state, runBaseline, startAgentLoop, deployRuleAndRerun, resetDemo, isLoaded }) {
  return (
    <div className="control-bar">
      {state.phase === 0 && (
        <button className="ctrl-btn running" onClick={runBaseline} disabled={!isLoaded}>
          {!isLoaded ? "LOADING DATA..." : "> START DEMO (RUN PRE-RULE)"}
        </button>
      )}
      {state.phase === 1 && (
        <button className="ctrl-btn running" onClick={startAgentLoop}>
          NEXT: RUN ANOMALY DETECTION
        </button>
      )}

      {state.phase === 4 && (
        <button className="ctrl-btn" disabled={true} style={{borderColor:"var(--safe)", color:"var(--safe)"}}>
          [OK] EVALUATION COMPLETE
        </button>
      )}
      <button className="ctrl-btn" id="resetBtn" onClick={resetDemo}>RESET</button>
    </div>
  );
}
