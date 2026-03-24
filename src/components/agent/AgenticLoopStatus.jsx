export default function AgenticLoopStatus({ loopStep }) {
  const isActive = (stepIndex) => loopStep === stepIndex;
  const isDone = (stepIndex) => loopStep > stepIndex || loopStep === 5;

  const renderStep = (index, label) => (
    <div className={`loop-step ${isActive(index) ? "active" : ""} ${isDone(index) ? "done" : ""}`}>
      <div className="step-icon">
        {isDone(index) ? "[OK]" : isActive(index) ? "..." : index + 1}
      </div>
      <span>{label}</span>
    </div>
  );

  return (
    <div className="loop-panel" >
      <div className="loop-title">[Agent] Agentic Loop Status</div>
      <div className="loop-steps">
        {renderStep(0, "Threshold breach detected (FN >= 75)")}
        {renderStep(1, "Lambda Analyzer: Cohen's d computation")}
        {renderStep(2, "Feature divergence context -> Bedrock Component")}
        {renderStep(3, "Bedrock / Claude 3.5 Sonnet generates rule")}
        {renderStep(4, "Rule stored -> S3 Sandbox Validate")}
      </div>
    </div>
  );
}
