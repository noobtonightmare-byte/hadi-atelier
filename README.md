# HADI ATELIER

A responsive luxury storefront built with React, TypeScript, Vite, and Supabase. It includes a real product catalog, Supabase Auth, guest and signed-in bags, saved pieces, a COD order transaction, database-enforced inventory and coupon checks, a restricted admin area, and deployable Edge Functions for extra admin verification and order email.

## Run locally

1. Install Node.js 20.19+ (or 22.12+) and the Supabase CLI.
2. Copy `.env.example` to `.env`. The example includes the supplied **publishable** Supabase key; it is safe for browser use only when database RLS is enabled. Never put a service-role key, database password, admin password, Resend key, or other secret in a `VITE_*` variable.
3. Run `npm install`, then `npm run dev`. Without valid Supabase settings, the app shows a read-only sample catalog; account, saved-bag persistence, checkout, and admin writes are intentionally unavailable.

## Supabase setup

The CLI was not available in the implementation environment, so migrations and functions have not been applied to the live project. With a trusted local Supabase CLI install:

```sh
supabase login
supabase link --project-ref uuqryctaczxombidrioe
supabase db push
supabase functions deploy admin-gate
supabase functions deploy order-notification
```

The `supabase/migrations` directory defines the schema, RLS policies, transactional order RPC, storage bucket, and initial catalog. It includes profiles, categories, products, image galleries, options/values, videos, banners, site settings, cart, wishlist, orders, line items, customizations, reviews, coupons, subscribers, and private admin verification data. Use the Supabase SQL editor for one-time admin provisioning after a verified account has been created; never use the database password from client code.

### Configure the administrator gate

1. Sign up and verify `haadmuhammad@gmail.com`.
2. In the Supabase SQL editor (as database owner), promote only that account and provision a bcrypt hash of a private favorite-car answer. Pick the answer privately; do not commit it:

```sql
update public.profiles
set role = 'admin'
where lower(email) = 'haadmuhammad@gmail.com';

insert into public.admin_security_config (singleton, favorite_car_hash)
values (true, extensions.crypt('REPLACE WITH YOUR PRIVATE ANSWER', extensions.gen_salt('bf')))
on conflict (singleton) do update
set favorite_car_hash = excluded.favorite_car_hash, updated_at = now();
```

3. Each admin session must pass the `admin-gate` Edge Function. It verifies the authenticated identity and role, checks the answer against the database hash, rate-limits failures, and grants a 30-minute server-checked authorization used by admin RLS policies. `ADMIN_PASSWORD` is deliberately not stored or seeded in this frontend app.

### Google OAuth and email

- Enable Google under **Supabase Dashboard → Authentication → Providers → Google**. Configure the OAuth client ID/secret in the dashboard and add the deployed site and Supabase callback URLs to the Google OAuth consent/client settings. Add local redirect URLs to Supabase Auth URL configuration. The UI starts Supabase’s Google sign-in flow; provider credentials are not included.
- Deploy email notifications and add secrets through the Supabase CLI or dashboard, not `.env` or source: `RESEND_API_KEY`, `ORDER_NOTIFICATION_FROM` (a verified Resend sender), `ADMIN_NOTIFICATION_EMAIL`, and optionally `SITE_ORIGIN` (your exact storefront origin). Resend sends a customer receipt and a separate admin notice after a committed order. Email delivery is best-effort after order commit; inspect Edge Function logs for delivery errors.
- Set Supabase Auth’s SMTP provider and sender in the dashboard for reliable verification and password-reset emails. The project does not ship SMTP credentials.

## Deploy and operate

Build with `npm run build`; it creates `dist/` and an SPA fallback for order/account routes. `.github/workflows/deploy.yml` deploys the site to GitHub Pages on pushes to `main`. Configure the repository Actions variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`; the latter is the browser-safe publishable key, not a secret/service-role key. Set `SITE_ORIGIN` on Edge Functions to the final site origin and configure Supabase Auth redirect URLs.

The deployment is available at `https://noobtonightmare-byte.github.io/hadi-atelier/` while custom DNS is pending. To serve `hadiatelier7.fashion` securely, replace the current Porkbun apex A records with GitHub Pages (`185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`), remove conflicting records, wait for DNS propagation, then set `hadiatelier7.fashion` as the custom domain in repository Pages settings. After GitHub provisions the certificate, enable **Enforce HTTPS**. The domain currently resolves to Porkbun's hosted-site page; no Porkbun API credentials are available in this environment, so its DNS records cannot be changed here.

Admins can create, edit, and delete products; upload product images; manage required/optional product choices with price deltas; and update order statuses. The panel displays live order updates and can export the latest 100 orders to CSV. Category, video/banner, settings, coupon, user-role, review-moderation, analytics, invoice-PDF, and full order search/filter administration screens are not implemented. The storefront does not yet include a video hero/product video, product review submission/display, ratings, related/recommendation algorithms, recently viewed, an editable welcome video, live carrier tracking, WhatsApp integration (no verified store number was supplied), live chat, or a full content/legal page system. These are not represented by dead controls.

Before launch, replace the sample product copy/images with verified catalog details, replace the sample support email (`hello@hadiatelier.com`) with an address you control, set shipping charges and publish delivery/returns terms, and provide the real WhatsApp/store contact if those links are desired. The theme is currently a fixed dark-and-gold design.

## Verification boundaries

Local TypeScript/build checks validate the frontend bundle only. Live sign-up and verification, OAuth, RLS, admin verification, storage permissions, order placement, email delivery, and admin visibility require applying migrations, configuring Supabase Dashboard providers/secrets, and testing against the project. They are not reported as live-verified here.
