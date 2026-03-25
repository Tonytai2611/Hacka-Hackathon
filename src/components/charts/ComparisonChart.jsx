import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function ComparisonChart({ timelineStats }) {
  return (
    <div className="chart-panel">
      <div className="panel-header" style={{ marginBottom:"10px", borderBottom:"none", background:"transparent", padding:0 }}>
        FINAL PERFORMANCE COMPARISON
      </div>
      <div style={{ flex: 1, width: "100%" }}>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={timelineStats} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e2d40" />
            <XAxis 
              dataKey="name" 
              stroke="#c8d8e8" 
              tick={{ fill: '#c8d8e8', fontSize: 11 }} 
              label={{ value: 'Transactions Processed Timeline', position: 'insideBottomRight', offset: -10, fill: '#c8d8e8', fontSize: 10 }} 
            />
            <YAxis 
              stroke="#c8d8e8" 
              tick={{ fill: '#c8d8e8', fontSize: 11 }} 
              label={{ value: 'Total Frauds Caught', angle: -90, position: 'insideLeft', fill: '#c8d8e8', fontSize: 10 }} 
            />
            <Tooltip 
              contentStyle={{ backgroundColor: '#0d1117', borderColor: '#1e2d40', color: '#c8d8e8' }} 
              itemStyle={{ color: '#e8f0f8' }} 
            />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
            <Line type="monotone" dataKey="caughtBase" stroke="#ff3355" name="Detected (Legacy Model)" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="caughtAfter" stroke="#00e5a0" name="Detected (Model + Rule)" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div style={{ marginTop:"15px", fontSize:"10px", color:"var(--muted)", textAlign:"center" }}>
        Dynamic zero-day anomaly injection caught entirely via AWS Bedrock agentic patch.
      </div>
    </div>
  );
}
