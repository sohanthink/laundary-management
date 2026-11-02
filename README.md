# an-nafi

Linen rental and washing service management for hotels.

- **Admin**: products and stock, customers and hotels, agreed prices, send / return, washing service, payments, expenses, reports.
- **Hotel owner**: read-only portal with their hotels, pieces held, statement, receipts and due.

Built with Next.js 16, PostgreSQL (Neon) + Prisma 6, custom auth (bcrypt + database sessions), Gmail via Nodemailer, and local photo storage.

## Quick try without any accounts

With no `DATABASE_URL` in `.env`, `npm run dev` starts a built-in local database (data kept in `.local-db/`), creates the tables and an admin, then runs the app. Sign in with `admin@annafi.local` / `admin12345`. Delete `.local-db/` to start over. Once `.env` has your Neon URL, `npm run dev` uses Neon instead.

## Local setup

1. Use Node.js 20.19+ or 22 LTS (some dev tools warn on older 20.x).
2. `npm install`
3. Create a free database at [neon.tech](https://neon.tech). Copy `.env.example` to `.env` and fill in `DATABASE_URL` (pooled) and `DIRECT_URL` (direct), plus `ADMIN_EMAIL` / `ADMIN_PASSWORD`.
4. Create the tables: `npm run db:deploy` (or `npm run db:migrate` while you are changing the schema).
5. Create the admin user and default expense categories: `npm run db:seed`
6. `npm run dev` and open http://localhost:3000/login

Email is optional. Without `GMAIL_USER` / `GMAIL_APP_PASSWORD`, emails are printed to the server console and temporary passwords are shown on screen.

## First steps in the app

1. Products > Categories: create categories, then products with base price and the pieces you own.
2. Customers: add the hotel owner (a login is created), then add their hotels.
3. Hotel > Prices: pick the products in the deal and set discounts. Add washing-service prices if needed.
4. Send: choose the hotel, enter quantities. Each send adds a charge to the hotel's due.
5. Return, Stock (mark washed, lost/damaged), Payments, Expenses, Reports.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm test` | Unit tests (pricing, stock, ledger math) |
| `npm run typecheck` | Generate route types and run TypeScript |
| `npm run lint` | ESLint |
| `npm run db:migrate` | Create a new migration after editing `prisma/schema.prisma` |
| `npm run db:deploy` | Apply migrations (production) |
| `npm run db:seed` | Create the admin user |
| `npm run db:studio` | Browse the database |

## Project layout

```
app/(admin)/admin/   admin pages
app/(owner)/portal/  hotel owner pages
app/uploads/         serves uploaded photos (logged-in users only)
server/auth/         sessions, permissions, data access checks
server/modules/      one folder per feature: queries.ts (reads), actions.ts (writes)
server/pricing.ts    price math, shared with the Send screen (unit tested)
server/stock.ts      stock buckets and FIFO matching (unit tested)
server/ledger.ts     due and running balance (unit tested)
prisma/              schema, migrations, seed
proxy.ts             redirects logged-out visitors (real checks are in server/auth/dal.ts)
```

Money is stored as integer poisha (100 = 1 tk). Stock counts and dues are always calculated from movements and ledger entries, never stored.

## Deploying to a VPS (Ubuntu)

Photos are stored on disk in `storage/uploads`, so the app needs a server with a persistent disk (not Vercel).

```bash
# once
sudo apt install -y nginx certbot python3-certbot-nginx
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt install -y nodejs
sudo npm install -g pm2

git clone <your-repo> ~/an-nafi && cd ~/an-nafi
cp .env.example .env   # fill in production values, APP_URL=https://your-domain
npm ci
npm run db:deploy
npm run db:seed
npm run build
pm2 start ecosystem.config.cjs && pm2 save && pm2 startup

sudo cp deploy/nginx.conf /etc/nginx/sites-available/an-nafi   # edit the domain
sudo ln -s /etc/nginx/sites-available/an-nafi /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d your-domain
```

Updating:

```bash
git pull && npm ci && npm run db:deploy && npm run build && pm2 restart an-nafi
```

Backups:

- Database: Neon keeps point-in-time history (restore from the Neon console).
- Photos: run `deploy/backup-uploads.sh` daily from cron and copy the archive off the server.

## Launch checklist

- `npm run lint && npm test && npm run build` pass.
- `.env` on the server has a strong `ADMIN_PASSWORD`; change it after the first login.
- Full flow works on the live domain over HTTPS: add stock, register a hotel, set prices, send, return, wash, pay, view statement, owner logs in.
