# NeuroShield Threat Monitor Demo

This repository contains the visual agentic workflow dashboard for the NeuroShield Threat Monitor.

## Prerequisites
- [Node.js](https://nodejs.org/) (v18+ recommended)
- \`npm\` package manager

## How to Run

1. **Install Dependencies**
   Navigate to the project directory and install the required modules:
   \`\`\`bash
   npm install
   \`\`\`

2. **Start the Development Server**
   Launch the Vite development server:
   \`\`\`bash
   npm run dev
   \`\`\`

3. **View the Application**
   Open your browser and navigate to the local server URL provided in the terminal (typically \`http://localhost:5173\`).

## Usage
The application runs as an interactive agentic flow:
- **Click "Start Demo"**: Streams the baseline dataset visualization.
- **Click "Next: Run Anomaly Detection"**: Triggers the visual Amazon Bedrock / LLM rule generation agent.
- **Click "Deploy & Re-run"**: Injects the AI-generated heuristic into the logic pipe and retroactively intercepts anomalous transactions.
