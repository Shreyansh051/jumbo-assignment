# Jumbo User Dashboard (Updated)

This project implements the User Management Dashboard assignment.

## What I fixed and improved
- Fixed **Company filter** so selecting a company reliably filters table rows.
- Fixed **Pagination** edge-case by disabling "Next" when there is no more data.
- Added **Loading skeletons**, **Empty states**, and **responsive tweaks** for mobile use.
- Added explanatory comments across components to help reviewers understand structure & intent.
- Activity Log, Dark mode, and other core features are implemented per assignment.

## Run locally
```bash
npm install
npm run dev
# visit http://localhost:3000
```

## Deploy
Deploy to Netlify or Vercel as a Next.js project. Build command: `npm run build`

## Notes
JSONPlaceholder is a fake API: POST/PUT/DELETE requests won't persist after reload.
We use optimistic updates for better UX.
