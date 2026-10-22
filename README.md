# MealMind React MVP

This folder contains the structured React version of MealMind.

## Start the app

1. Open a terminal in this folder.
2. Run `npm install`.
3. Run `npm run dev`.
4. Open the local address Vite prints, normally `http://localhost:5173`.

Alternatively, double-click `start-mealmind.bat` to start the development server.

## Included MVP workflows

- Inventory alerts, expiry dates and low-stock thresholds
- Menu and recipe mappings
- Manual sales entry and CSV import validation
- Waste logging with estimated costs and inventory deduction
- Forecasts and recipe-based ingredient requirements
- Local data-grounded restaurant assistant

Data is stored in the browser's local storage. The reset icon in the lower-left restores the original demonstration data.

## Current scope

This is a runnable frontend application. Authentication, a database, tenant isolation, server-side CSV processing, production forecasting, and hosted LLM integration are intentionally the next backend phase.
