import './App.css';
import { useTransactionEngine } from './hooks/useTransactionEngine';
import Header from './components/layout/Header';
import ControlBar from './components/layout/ControlBar';
import TransactionFeed from './components/dashboard/TransactionFeed';
import MetricsPanel from './components/dashboard/MetricsPanel';
import BaselineImpact from './components/dashboard/BaselineImpact';
import FalseNegativeMonitor from './components/agent/FalseNegativeMonitor';
import AgenticLoopStatus from './components/agent/AgenticLoopStatus';
import RulePanel from './components/agent/RulePanel';
import ComparisonChart from './components/charts/ComparisonChart';
import FprChart from './components/charts/FprChart';

export default function App() {
  const engine = useTransactionEngine();

  return (
    <>
      <Header phase={engine.state.phase} />
      
      <div className="grid">
        {/* Left Column */}
        <TransactionFeed state={engine.state} transactions={engine.transactions} />
        
        {/* Center Column */}
        <div className="center-col">
          {engine.state.phase < 4 ? (
            <>
              <FalseNegativeMonitor fnCount={engine.state.fnCount} />
              <AgenticLoopStatus loopStep={engine.state.loopStep} />
              <RulePanel 
                ruleGenerated={engine.state.ruleGenerated} 
                ruleDeployed={engine.state.ruleDeployed} 
                generatedRule={engine.state.generatedRule}
                deployRule={engine.deployRuleAndRerun} 
              />
            </>
          ) : (
            <>
              <ComparisonChart timelineStats={engine.timelineStats} />
              <FprChart timelineStats={engine.timelineStats} />
            </>
          )}
        </div>

        {/* Right Column */}
        <div className="right-col">
          <MetricsPanel state={engine.state} />
          <BaselineImpact ruleDeployed={engine.state.ruleDeployed} />
        </div>
      </div>

      <ControlBar 
        state={engine.state} 
        isLoaded={engine.isLoaded} 
        runBaseline={engine.runBaseline} 
        startAgentLoop={engine.startAgentLoop} 
        deployRuleAndRerun={engine.deployRuleAndRerun} 
        resetDemo={engine.resetDemo} 
      />
    </>
  );
}
