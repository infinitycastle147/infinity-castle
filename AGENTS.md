# Repository Guidelines

## Project Structure & Module Organization

`app/` contains Next.js routes, page components, and API handlers; `app/api/` holds server endpoints. Shared UI lives in `src/components/`, while note parsing, hashing, attachments, and persistence are in `src/lib/notes/`. Keep database changes in ordered `supabase/migrations/` files. Tests are in `tests/` and generally correspond to note service modules (for example, `parser.test.ts`).

## Build, Test, and Development Commands

- `npm install` installs dependencies.
- `npm run dev` starts the local Next.js server.
- `npm test` runs the Vitest suite once; `npm run test:watch` reruns tests during development.
- `npm run check` runs TypeScript without emitting files.
- `npm run lint` checks the repository with ESLint.
- `npm run build` creates a production build; `npm start` serves it.

Set local configuration in `.env.local` using `.env.example` as a reference. Apply Supabase migrations in filename order (`supabase db push` when linked to a project).

## Coding Style & Naming Conventions

Use TypeScript and follow the existing ESLint and project conventions. Use two spaces for JSON and config files; keep imports organized with the surrounding file style. Components and types use PascalCase, functions and variables use camelCase, and route folders follow URL segments. Name tests after the behavior or module they cover, ending in `.test.ts` or `.test.tsx`. Keep note and database logic in `src/lib/notes/` rather than duplicating it in route handlers.

## Testing Guidelines

Add or update focused Vitest tests for parser, attachment, and service behavior. Run `npm test` and `npm run check` after relevant changes; run `npm run lint` for style and `npm run build` for changes that affect app compilation or routing. No coverage threshold is configured.

## Commit & Pull Request Guidelines

Recent commits use short imperative subjects, sometimes with a conventional prefix (for example, `fix: preserve note identity and graph integrity`). Keep commits focused and describe the user-visible or data-level change. Pull requests should explain the change and its motivation, list relevant checks, link related issues when available, and include screenshots for visible UI changes. Call out new migrations and required configuration changes.

## Security & Configuration

Never commit `.env` or `.env.local`, API keys, or service-role credentials. Use the publishable Supabase key only where intended. Preserve the existing authentication and row-level security assumptions when changing data access.
