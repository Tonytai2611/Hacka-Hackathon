# NeuroShield: Autonomous Fraud Remediation Loop

[![AWS](https://img.shields.io/badge/AWS-Managed--Services-orange?logo=amazon-aws)](https://aws.amazon.com/)
[![React](https://img.shields.io/badge/React-18-blue?logo=react)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-Dark--Theme-purple?logo=vite)](https://vitejs.dev/)

## Executive Summary
Fraud detection systems built on static machine learning models share a fundamental weakness, struggling to adapt to rapidly evolving adversarial tactics. Furthermore, extreme class imbalance in traditional fraud environments significantly complicates realistic modeling. Consequently, as fraudsters continuously modify their evasion techniques, these static models experience rapid performance degradation known as concept drift. 

To overcome this limitation, **NeuroShield** introduces an autonomous remediation loop that operates seamlessly alongside real-time inference. Specifically, upon misclassifying a transaction, the system automatically analyzes the failure, generates a targeted detection rule (via Amazon Bedrock), validates it in an isolated sandbox, and deploys it to production within ten minutes.

---

## Project Scope
NeuroShield serves as a backend fraud detection system for financial environments. It delivers four core capabilities:
1. **Real-time transaction scoring** via Amazon SageMaker.
2. **Autonomous failure detection** through S3-based feedback loops.
3. **Agentic rule generation** orchestrated through Amazon Bedrock.
4. **Governed deployment** featuring automated human escalation.

*Note: Client-facing interfaces, legacy banking integration, and physical infrastructure management are entirely excluded.*

---

## Technical Architecture
NeuroShield is structured as three decoupled processing lanes (see diagram below):

| Layer | AWS Service | Role |
| :--- | :--- | :--- |
| **Inference** | API Gateway + AWS Lambda | Transaction ingestion and decision return |
| **ML Scoring** | Amazon SageMaker | Base fraud probability model (XGBoost) |
| **Knowledge Base** | Amazon DynamoDB | Active detection rules and velocity counters |
| **Event Trigger** | Amazon EventBridge | Connects S3 failure logs to the agentic pipeline |
| **Orchestration** | AWS Step Functions | Manages the Diagnose → Synthesize → Validate lifecycle |
| **Reasoning** | Amazon Bedrock (Claude-3-5) | Interprets statistical patterns and generates Python rules |
| **Validation** | AWS Lambda (Sandbox) | Executes generated rules against historical data |
| **Governance** | Amazon SNS + CloudWatch | Analyst escalation and system observability |
| **Storage** | Amazon S3 + S3 Glacier | Warm failure logs and cold archival data |

---

## Core Innovation: The Agentic Loop
The central contribution of NeuroShield is a closed-loop remediation pipeline that responds to model failures without manual intervention:

1.  **Diagnosis:** Amazon EventBridge triggers the loop when a cluster of transactions is subsequently confirmed as fraud. AWS Lambda performs contrastive discriminative analysis against a safe control group in S3.
2.  **Rule Synthesis:** Findings are passed to Amazon Bedrock to generate an executable Python detection rule. This provides **auditable code** rather than an opaque retrained model.
3.  **Sandbox Validation:** Every rule is executed in an isolated Lambda sandbox. It is rejected if the False Positive Rate exceeds 0.1% or if Population Drift exceeds 3σ.
4.  **Deployment:** Rules passing all thresholds are automatically deployed to DynamoDB, becoming active in the inference path within minutes.

---

## Getting Started (Dashboard Demo)

This repository contains the **NeuroShield Visual Dashboard**, which simulates the end-to-end agentic workflow for demonstration purposes.

### Prerequisites
- Node.js (v18+)
- npm

### Installation
```bash
git clone https://github.com/Tonytai2611/Hacka-Hackathon.git
cd Hacka-Hackathon
npm install
```

### Running the Demo
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### Demo Controls
- **Phase 1: Baseline** - Streams standard transaction data through static rules.
- **Phase 2: Attack Detected** - Injects a cluster of "Cluster 3" anomalies that the base model misses.
- **Phase 3: Agent Response** - Triggers the Amazon Bedrock agent to generate a remediation rule.
- **Phase 4: Rule Deployed** - Finalizes the loop and re-runs the dataset to show 100% detection.

---

## Data Strategy
NeuroShield is validated using the **FIFAR dataset** (Feedzai Industry-First Annotated Financial Fraud Research dataset), a realistic benchmark containing labeled financial transactions with behavioral, device, and network-level attributes.

At runtime, data is partitioned across three tiers:
- **Hot Layer (DynamoDB):** Active detection rules (<200ms latency).
- **Warm Layer (S3):** Recent transaction payloads and failure logs for agentic analysis.
- **Cold Layer (Glacier):** Historical archives for model retraining and legal audits.

---

## References
[1] J. Cao, et al., "DriftShield: Autonomous fraud detection via actor-critic reinforcement learning," IEEE OJCS, 2025.  
[2] A. Dal Pozzolo, et al., "Credit card fraud detection: A realistic modeling strategy," IEEE TNNLS, 2018.  
[3] H. M. R. Al Lawati, et al., "An integrated preprocessing and drift detection approach," IEEE Access, 2025.
