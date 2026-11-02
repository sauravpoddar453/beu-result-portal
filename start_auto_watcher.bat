@echo off
title BEU Result Auto-Watcher & Live Fetcher
echo ==================================================================
echo Starting BEU Result Auto-Watcher (Monitoring every 30 minutes)
echo Will automatically detect newly declared results and fetch them!
echo ==================================================================
cd /d "%~dp0"
node src/scripts/beu_auto_watcher.cjs
pause
