#!/bin/bash
cd /home/kavia/workspace/code-generation/nokia-olt-equipment-monitoring-automation-220195-220204/frontend_react
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

