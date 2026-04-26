# LeadGen

LeadGen is an AI-powered business lead generation tool that helps you discover and organize business contacts seamlessly.

## Features
- Search for businesses across multiple categories and locations (City, Country).
- Extract and aggregate data like phone numbers, emails, WhatsApp contacts, formatting them efficiently.
- Sort and export functionality functionality.
- AI Search mode.

## Development
To start the project in a local environment:
```bash
npm install
npm run dev
```

## Setup & Integrations
This project uses `@google/genai` to parse search queries intelligently utilizing the Gemini Flash 2.0 experimental model and standard APIs.

## Architecture
- `src/App.tsx`: Main Application logic, rendering Header, Search bars, and Leads.
- `src/services/gemini.ts`: AI-powered intelligence.
- `src/components/`: Reusable complex UI components and icons (e.g. `CustomSelect.tsx`, `icons.tsx`).
- `src/constants.ts`: System categories and constants.
