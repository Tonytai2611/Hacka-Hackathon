export default function TransactionFeed({ state, transactions }) {
  return (
    <div className="panel" style={{ gridRow: "1" }}>
      <div className="panel-header">
        TRANSACTION STREAM
        <span className="count">{(state.txIndex || 0) + (state.replayIndex || 0)} / 700</span>
      </div>
      <div className="feed-cols cols-5">
        <span>TX ID</span>
        <span>SCORE</span>
        <span>RESULT</span>
        <span>LABEL</span>
        <span>TIME</span>
      </div>
      <div id="tx-feed" style={{flex: 1, overflowY: 'auto', padding: '4px 0'}}>
        {transactions.map((tx, idx) => (
          <div key={`${tx.txId}-${idx}`} className="tx-row cols-5">
            <span className="tx-id">{tx.txId}</span>
            <span className={`tx-score ${tx.score > 0.82 ? "score-fraud" : tx.score > 0.5 ? "score-warn" : "score-safe"}`}>
              {tx.score.toFixed(3)}
            </span>
            <span><span className={`badge ${tx.badge}`}>{tx.result}</span></span>
            <span className={`cluster-label ${tx.cluster === 'Fraud' ? "cluster-attack" : ""}`}>
              {tx.cluster}
            </span>
            <span className="tx-time">{tx.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
