# Infinity Castle

Infinity Castle is a private, single-user Markdown knowledge base with a retro archive-terminal interface. Create or import notes, connect them with wikilinks, search with hybrid semantic and full-text retrieval, and explore the resulting knowledge graph.

Built with Next.js, Supabase (Postgres + pgvector), and Google Gemini embeddings.

## Features

- Markdown note creation, import, editing, export, and deletion
- Positional image attachments backed by private object storage and signed URLs
- Frontmatter, heading/paragraph chunking, and wikilink parsing
- Hybrid semantic and full-text search with reciprocal-rank fusion
- Interactive force-directed graph of linked notes
- UUID and SHA-256–based duplicate/re-upload protection
- Atomic note, chunk, and edge replacement in Supabase
- Email OTP / magic-link authentication with server-side session refresh
- Row-level security for authenticated requests

## Tech stack

- Next.js 16, React 19, and TypeScript
- Supabase Postgres, pgvector, and Auth
- Google Gemini (`gemini-embedding-001`) embeddings
- Vitest and ESLint

## Prerequisites

- Node.js 20.9 or later
- A Supabase project with the `vector` extension available
- A Google AI Studio API key with access to Gemini embeddings

## Getting started

1. Install dependencies:

   ```sh
   npm install
   ```

2. Copy the example environment file and fill in the values:

   ```sh
   cp .env.example .env.local
   ```

3. Apply the database migrations in order from `supabase/migrations`. With the Supabase CLI, link your project and run:

   ```sh
   supabase db push
   ```

4. Start the development server:

   ```sh
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000).

## Environment variables

| Variable | Purpose |
| --- | --- |
| `GEMINI_API_KEY` | Server-only Google Gemini API key used to generate embeddings. |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Client-safe Supabase publishable/anon key. |

Never commit `.env` or `.env.local`. They are intentionally ignored; use `.env.example` as the template. This app does not need a Supabase service-role key.

## Supabase configuration

1. Run the migrations in `supabase/migrations` in filename order.
2. In **Authentication → Providers → Email**, disable new-user signup and enable email OTP login.
3. Create the permitted user manually in **Authentication → Users**.
4. In **Authentication → Email Templates → Magic Link**, replace the confirmation-link URL with the OTP token. For example: `<p>Your login code is: {{ .Token }}</p>`. Supabase uses this template for both magic links and email OTPs; including `{{ .Token }}` makes the email contain the code entered on `/login`.

The included RLS policies allow the `authenticated` role, on the assumption that this is a single-user deployment with signup disabled. Add ownership columns and adjust policies before turning it into a multi-user product.

## Routes

| Route | Purpose |
| --- | --- |
| `/login` | Email authentication |
| `/new` | Create or import a note |
| `/note/[id]` | Read, edit, export, or delete a note |
| `/search` | Hybrid search console |
| `/graph` | Linked-note graph |

The API route handlers are located in `app/api`.

## Development

```sh
npm test
npm run check
npm run lint
npm run build
```

## Re-upload behavior

- Exported notes carry a stable `id` UUID in frontmatter.
- An unchanged UUID/hash pair returns `unchanged` without creating new embeddings.
- Changed content with an existing UUID requires explicit replacement confirmation.
- A matching title without a UUID also requires confirmation; titles and hashes are never silently treated as identity.
- Confirmed replacement checks the previous hash again inside the transaction, avoiding concurrent-edit overwrites.

## Project structure

```text
app/                    Next.js pages and API routes
src/lib/notes/          Parsing, embedding, hashing, and persistence logic
supabase/migrations/    Database schema, indexes, RPCs, and RLS policies
tests/                  Parser and note-service tests
```

## License

No license has been selected yet. Add one before accepting outside contributions or reuse.
