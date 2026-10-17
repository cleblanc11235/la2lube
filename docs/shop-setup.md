# Shop app setup

The staff app (Check-In → Bay Board → Payment → Reports) runs as its own
Netlify site, separate from the public website, with its data in Supabase.
About 30 minutes, once.

## 1. Database (Supabase)

1. Create a free project at [supabase.com](https://supabase.com). Pick a US region.
2. **SQL Editor → New query**: paste all of [`supabase/schema.sql`](../supabase/schema.sql) and run it.
3. **Authentication → Sign In / Providers**: turn **off** "Allow new users to sign up".
   (Even if you forget, strangers' accounts can't see anything; see step 5.)
4. **Authentication → Users → Add user**: create the shop login (email + password,
   tick "Auto confirm"). One shared login for the PC and the shop iPhone is fine for now.
5. Give that login access. Back in the SQL editor:

   ```sql
   insert into public.shop_users (user_id)
   select id from auth.users where email = 'THE-SHOP-LOGIN@example.com';
   ```

6. **Project Settings → API**: copy the **Project URL** and the **anon / publishable key**.
   The key is meant to be public; the access rules from `schema.sql` are what protect the data.

## 2. Hosting (Netlify)

1. **Add new site → Import an existing project**, the same repo as the public site.
   Build settings come from `netlify.toml`.
2. **Site configuration → Environment variables**:

   | Key | Value |
   |-----|-------|
   | `VITE_APP_TARGET` | `shop` |
   | `VITE_SUPABASE_URL` | Project URL from step 1.6 |
   | `VITE_SUPABASE_ANON_KEY` | anon key from step 1.6 |

3. Deploy. Rename the site to something like `la2lube-shop`.
   The public site needs no changes: without `VITE_APP_TARGET=shop` it builds the website only.

## 3. Devices

- **Counter PC:** open the shop site in Chrome and sign in. It needs Chrome 87 or newer
  (check at `chrome://version`; Windows 7 tops out at Chrome 109, which is fine).
  In the Chrome menu, find *Create shortcut…* (under *More tools* or *Cast, save and share*,
  depending on the version) and tick *Open as window*. That gives it its own window to
  alt-tab to from DataLube. The app refreshes every time you switch back to it.
- **Shop iPhone:** open the site in Safari, sign in, then *Share → Add to Home Screen*.
  Use it for **Scan Plate** out on the lot and for the Bay Board in the bays.
  The first plate scan downloads the OCR engine, so do one while on Wi-Fi.

## 4. Local development

Copy `.env.example` to `.env.local` and fill in the two Supabase values to run
`npm run dev` against the real database (the app is at `/shop`). Without them,
`/shop` runs in **practice mode**: an in-memory store, nothing saved.

## Trial run alongside DataLube

DataLube stays the official record during the trial. Ring up every car in both.

- **End of day:** Reports → compare the total and car count with DataLube's day-end.
  Note any difference and why (missed entry, typo, price mismatch).
- **Sales tax:** set `TAX_RATE` in `src/config/shopSettings.ts` to whatever a DataLube
  receipt shows, so the totals match to the penny.
- **Backups:** the free Supabase plan has no automatic backups. During the trial DataLube
  is the backup; you can also download each day's CSV from Reports.
- Free Supabase projects pause after a week with no use. Daily use keeps it awake; if it
  pauses (e.g. a holiday week), restore it from the Supabase dashboard.
