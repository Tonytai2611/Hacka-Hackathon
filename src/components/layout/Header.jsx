import { useEffect, useState } from 'react';

export default function Header({ phase }) {
  const [time, setTime] = useState("--:--:--");

  useEffect(() => {
    const clockId = setInterval(() => {
      setTime(new Date().toLocaleTimeString("en-US", { hour12: false }));
    }, 1000);
    return () => clearInterval(clockId);
  }, []);

  return (
    <header>
      <div className="logo">NEURO<span>SHIELD</span></div>
      <div className="phase-bar">
        <div className={`phase-step ${phase === 0 ? "active" : phase > 0 ? "done" : ""}`}>01 BASELINE</div>
        <div className={`phase-step ${phase === 1 ? "active attack" : phase > 1 ? "done" : ""}`}>02 ATTACK DETECTED</div>
        <div className={`phase-step defense ${phase === 2 || phase === 3 ? "active" : phase > 3 ? "done" : ""}`}>03 AGENT RESPONSE</div>
        <div className={`phase-step ${phase === 4 ? "active" : ""}`}>04 RULE DEPLOYED</div>
      </div>
      <div className="header-right">
        <span><span className="live-dot"></span>LIVE</span>
        <span>{time}</span>
        <span>IEEE-CIS DATASET</span>
      </div>
    </header>
  );
}
