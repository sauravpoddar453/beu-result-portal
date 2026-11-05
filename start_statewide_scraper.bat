@echo off
title BEU Statewide Result Fetcher (Live Crawl)
echo ==================================================================
echo Resuming BEU Statewide Data Crawler (Smart Resume Enabled)
echo Saving all colleges, branches, and semester marks to MongoDB Atlas...
echo ==================================================================
cd /d "%~dp0"
node src/scripts/scrape_beu_statewide.cjs
pause
