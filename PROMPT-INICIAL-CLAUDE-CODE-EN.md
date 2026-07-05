Let's build the "GETEC Frota" app — a fleet mileage and fuel tracking system for the company GETEC.

Read the file ESPEC-GETEC-FROTA.md (in this folder) carefully — it has the data model, screens, business rules, and implementation phases. The schema.sql (also in this folder) has already been executed on Supabase, it's just a reference, no need to run it again. Note: the spec and comments are in Portuguese (the client is Brazilian), but you can write code, commit messages, and talk to me in English.

Supabase credentials (already provisioned):
- Project URL: https://mcmyvlnptqxsgkoxqbhn.supabase.co
- Publishable key: [PASTE HERE the key starting with sb_publishable_...]

There's already a test admin user (login: filipe@filipeferraz.co) to validate the auth flow.

Start with Phase 1 and 2 from the spec:
1. Project folder structure (plain HTML/CSS/JS, no build step, no npm — Supabase JS via CDN)
2. Working login screen (email/password via Supabase Auth), with persisted session
3. "Forgot password" link and the reset password screen (reset-senha.html)

After that, stop and show me the result before moving on to the fuel/trip forms (Phase 3).

Follow the copy standards from the spec: sentence case, direct tone, buttons describe the action (e.g. "Save fuel entry", not "Submit"). Mobile-first: large buttons, numeric fields with inputmode="decimal". UI copy should be in Portuguese (pt-BR) since end users are Brazilian, but code, comments, and commit messages should be in English.
