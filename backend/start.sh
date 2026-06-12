#!/bin/bash
echo "Starting SmartHire AI Backend..."
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
