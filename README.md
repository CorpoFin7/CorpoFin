# CorpoFin — Deployment Guide
## Now powered by Google Gemini API (FREE — 1,500 extractions/day)

---

## How to Get Your FREE Gemini API Key (2 minutes)

1. Go to https://aistudio.google.com
2. Sign in with your Google account
3. Click "Get API Key" (top left)
4. Click "Create API Key"
5. Select "Create API key in new project"
6. Copy the key — looks like: AIzaSy...............

NO credit card needed. Completely free forever.
Free limits: 1,500 requests/day, 15 requests/minute

---

## How to Add Key to Netlify

1. Go to app.netlify.com → your corpofin site
2. Click "Project configuration" (left sidebar)
3. Click "Environment variables"
4. Click "Add a variable"
5. Key:   GEMINI_API_KEY
   Value: AIzaSy........... (your key)
6. Click Save
7. Go to Deploys → Trigger deploy → Deploy site
8. Done! Extractor works for free now.

---

## What Gemini Does

WITH PDF uploaded:
- Reads your annual report PDF directly
- Extracts exact numbers from the document
- Very accurate

WITHOUT PDF:
- Searches internet automatically
- Pulls data from Screener.in, MoneyControl, NSE
- Works for any listed Indian company
- Gets latest FY25/FY26 data

---

## File Structure
corpofin/
  index.html
  netlify.toml
  README.md
  models/
    Sun_Pharma.xlsx
    AWL(1).xlsx
  reports/
    AWL_Equity_Research_Report.pdf
    Equity Research Report- Sun Pharma.pdf
  netlify/
    functions/
      extract.js      <- Gemini powered backend
      package.json
