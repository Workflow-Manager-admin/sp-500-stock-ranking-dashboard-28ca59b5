#!/bin/bash
cd /home/kavia/workspace/code-generation/sp-500-stock-ranking-dashboard-28ca59b5/sp500_dashboard_frontend
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

