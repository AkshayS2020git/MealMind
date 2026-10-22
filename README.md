# MealMind React MVP

This folder contains the structured React and TypeScript version of MealMind.

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
- Restaurant sign-in and self-registration, with a separate local workspace per account

Data is stored in the browser's local storage. The reset icon in the lower-left restores the original demonstration data.

## Current scope

This is a runnable frontend application. Login and registration are local demonstration features: credentials and restaurant data stay only in the current browser and are not production-secure. A backend is still needed for real authentication, password hashing, database-backed tenant isolation, server-side CSV processing, production forecasting, and hosted LLM integration.

To enable a local demo account, copy `.env.example` to `.env.local` and set the two values. `.env.local` is ignored by Git.
