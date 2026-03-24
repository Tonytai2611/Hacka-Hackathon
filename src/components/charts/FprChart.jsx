import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function FprChart({ timelineStats }) {
  return (
    <div className="chart-panel">
      <div className="panel-header" style={{ marginBottom:"10px", borderBottom:"none", background:"transparent", padding:0 }}>
        FPR RATE OVER TIME (%)
      </div>
      <div style={{ flex: 1, width: '100%', minHeight: '150px', height: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={timelineStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2d3f56" />
            <XAxis dataKey="name" stroke="#8b9bb4" fontSize={10} tickMargin={8} />
            <YAxis stroke="#8b9bb4" fontSize={10} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#111827', borderColor: '#2d3f56', fontSize: '11px' }}
              itemStyle={{ fontSize: '12px', fontWeight: 700 }}
            />
            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
            <Line type="monotone" dataKey="fprBase" name="Legacy FPR" stroke="#ff4466" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="fprAfter" name="Agentic FPR" stroke="#00ffb2" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
