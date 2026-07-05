# GETEC Frota

Fleet mileage & fuel tracking for GETEC. Vanilla HTML/CSS/JS, no build step. Backend is Supabase (Postgres + Auth + Storage).

## Run locally

Any static server works (needed so the Supabase auth redirect URLs resolve):

```
python3 -m http.server 8000
```

Then open http://localhost:8000

## Structure

- `index.html` — login + "forgot password"
- `reset-senha.html` — set a new password from the email recovery link
- `app.html` — logged-in shell (home/forms land in Phase 3)
- `assets/js/supabase-client.js` — Supabase client (URL + publishable key)
- `assets/js/auth.js` — shared auth helpers (session guard, sign out, error copy)
- `assets/css/style.css` — mobile-first styles
- `schema.sql` — Supabase schema reference (already applied; not run by the app)

## Auth notes

- No public signup. Admin creates users in Supabase (Authentication → Users) and adds the matching row in `usuarios`.
- First access: the user hits "Esqueci minha senha" and sets their own password.
- For the recovery link to work, add the app origin (local and GitHub Pages) to **Auth → URL Configuration → Redirect URLs** in Supabase.
