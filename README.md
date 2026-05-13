# Cadence 🚗

**School pickup, simplified.** A real-time web app that replaces walkie-talkies at school pickup with a clean, fast, multi-device interface.

---

## How it works

- **Pickup Staff** search for a student by name, teacher, or class code → tap **Parent Here** → the classroom teacher sees an instant notification
- **Classroom Teachers** see a live queue of pickup requests → tap **Send Student Out** → staff confirm delivery
- **Admin** manages classes, students, and school settings behind a separate PIN

---

## Stack

| Layer | Tech | Cost |
|---|---|---|
| Frontend | React + Vite + Tailwind | Free |
| Database + Real-time | Supabase | Free tier |
| Hosting | Vercel (via GitHub) | Free |

---

## Getting started locally

### 1. Prerequisites
- [Node.js](https://nodejs.org) v18 or higher
- npm (comes with Node)

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment
```bash
cp .env.example .env.local
```
Open `.env.local`. The default `VITE_USE_MOCK_DATA=true` runs entirely on local seed data — no Supabase account needed to get started.

### 4. Run the dev server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173)

**Demo credentials:**
- Staff login: `MESA-ELEM` / `1234`
- Admin login: `MESA-ELEM` / `9999`

---

## Connecting Supabase (real-time, persistent data)

### 1. Create a Supabase project
Go to [supabase.com](https://supabase.com) → New project (free).

### 2. Run the schema
In your Supabase dashboard → SQL Editor → paste and run the contents of `supabase/schema.sql`.

### 3. Get your credentials
Dashboard → Settings → API → copy **Project URL** and **anon public key**.

### 4. Update `.env.local`
```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
VITE_USE_MOCK_DATA=false
```

### 5. Swap mock data for real Supabase calls
Each action in `src/context/CadenceContext.jsx` has a commented-out `── SUPABASE VERSION ──` block showing the exact replacement. Uncomment those and remove the `setState` lines beneath them.

---

## Deploying to Vercel (free)

### 1. Push to GitHub
```bash
git init
git add .
git commit -m "Initial Cadence commit"
# Create a new repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/cadence.git
git push -u origin main
```

### 2. Connect to Vercel
1. Go to [vercel.com](https://vercel.com) → Import Project
2. Select your GitHub repo
3. Add environment variables (your Supabase URL + key)
4. Deploy

Every push to `main` auto-deploys. Your app will be live at `cadence.vercel.app`.

### 3. Optional: custom domain
In Vercel → Settings → Domains → add `pickup.yourschool.org` (or any domain you own).

---

## Project structure

```
cadence/
├── public/
│   └── manifest.json          # PWA manifest (installable on home screen)
├── src/
│   ├── context/
│   │   ├── CadenceContext.jsx  # All app state + data actions
│   │   └── ToastContext.jsx    # Global toast notifications
│   ├── components/
│   │   ├── AppShell.jsx        # Responsive layout (sidebar tablet+, bottom nav mobile)
│   │   └── ui.jsx              # Shared UI primitives (Avatar, StatusPill, Input, etc.)
│   ├── views/
│   │   ├── LoginView.jsx       # School code + PIN login
│   │   ├── RoleView.jsx        # Pick role after login (Staff / Teacher / Admin)
│   │   ├── StaffView.jsx       # Pickup staff: search, Parent Here, active pickups
│   │   ├── TeacherView.jsx     # Teacher: live queue, Send Student Out, absences
│   │   └── AdminView.jsx       # Admin: add/edit classes & students, danger zone
│   ├── lib/
│   │   ├── mockData.js         # Seed data used when VITE_USE_MOCK_DATA=true
│   │   └── supabase.js         # Supabase client (reads from env vars)
│   ├── App.jsx                 # Root component — screen routing
│   ├── main.jsx                # React entry point
│   └── index.css               # Design tokens + global styles
├── supabase/
│   └── schema.sql              # Database schema — run in Supabase SQL Editor
├── .env.example                # Environment variable template
├── .gitignore
├── index.html
├── package.json
├── tailwind.config.js
└── vite.config.js
```

---

## Adding a new school

1. Insert a row into `public.schools` with a unique `code`, `staff_pin_hash`, and `admin_pin_hash`
2. Share the school code + staff PIN with pickup staff and teachers
3. Share the school code + admin PIN with the school administrator only
4. The admin logs in and adds classes + students via the Setup screen

---

## PWA — installing on phones

Teachers and staff can add Cadence to their home screen without an app store:
- **iPhone (Safari):** tap the Share button → "Add to Home Screen"
- **Android (Chrome):** tap the three-dot menu → "Add to Home screen" (or Chrome may prompt automatically)

Once installed, Cadence launches full-screen like a native app and goes straight to the login screen.
