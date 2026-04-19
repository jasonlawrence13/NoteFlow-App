# NoteFlow — Complete Setup Guide
### Cloud sync + automated email alerts in ~15 minutes

---

## OVERVIEW — What you're building

| Service | Purpose | Cost |
|---------|---------|------|
| **Supabase** | Cloud database — stores all your notes | Free |
| **Resend** | Email delivery service | Free (3,000 emails/month) |
| **Vercel** | Hosts the app so you can open it anywhere | Free |

**Your email schedule once live:**
- **Mon–Fri at 8am** — Daily brief: what's overdue, due today, due this week
- **Friday at 5pm** — Weekly summary: full picture + weekend planning + what carries into Monday
- **No emails on weekends**

---

## STEP 1 — Create your Supabase database (5 min)

### 1a. Create account & project
1. Go to **https://supabase.com** → click **"Start your project"**
2. Sign up (GitHub is fastest, or use your Gmail)
3. Click **"New Project"**
   - Name: `noteflow`
   - Database password: create a strong one and save it somewhere
   - Region: pick the one closest to you (e.g. US East, EU West)
4. Click **"Create new project"** — wait ~90 seconds for it to spin up

### 1b. Create the database table
1. In the left sidebar click **"SQL Editor"**
2. Click **"+ New query"**
3. Paste in the entire contents of the file `supabase/schema.sql` (included in your download)
4. Click **"Run"** (or Cmd+Enter)
5. You should see: `Success. No rows returned`

### 1c. Copy your credentials
1. In the left sidebar go to **Settings → API**
2. Find and copy these two values — you'll need them in Step 3:
   - **Project URL** — looks like `https://abcdefghijkl.supabase.co`
   - **anon public** key — long string starting with `eyJhbGc...`

---

## STEP 2 — Create your Resend account (3 min)

Resend handles sending the emails. It works with any email address you want to receive alerts at — Gmail, Outlook, anything.

1. Go to **https://resend.com** → click **"Get Started"**
2. Sign up (use your Gmail for convenience)
3. In the dashboard, go to **"API Keys"** in the left sidebar
4. Click **"+ Create API Key"**
   - Name: `noteflow`
   - Permission: **Sending access**
   - Click **"Add"**
5. **Copy the key immediately** — it starts with `re_` and is only shown once
   - Paste it somewhere safe (Notes app, password manager, etc.)

**About the FROM address:**
Resend gives you a free shared sending address: `onboarding@resend.dev`
This is what we'll use — it works perfectly for personal alerts.
(Later you can set up your own domain if you want, but it's not needed.)

---

## STEP 3 — Add your credentials to the app (2 min)

Open the file `src/App.jsx` in a text editor (TextEdit on Mac works fine).

Find these two lines near the top of the file:

```javascript
const SUPABASE_URL = "YOUR_SUPABASE_URL";
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";
```

Replace them with your actual values from Step 1c. Example:

```javascript
const SUPABASE_URL = "https://abcdefghijkl.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";
```

Save the file.

---

## STEP 4 — Deploy the app to Vercel (3 min)

Vercel gives your app a real URL so you can open it from your iPad, phone, or any browser.

1. Go to **https://vercel.com** → sign up with GitHub (or your Gmail)
2. Click **"Add New → Project"**
3. You'll see an option to **drag and drop a folder** — drag the entire `noteflow-app` folder in
4. Vercel detects it automatically. Under **Framework Preset** select **"Vite"** if prompted
5. Click **"Deploy"**
6. In ~30 seconds you get a URL like: `https://noteflow-abc123.vercel.app`

**That URL is your app.** Bookmark it and add it to your iPad home screen (open in Safari → Share → Add to Home Screen).

---

## STEP 5 — Set up the email alert function (5 min)

This is where the automation lives. You're deploying a small function to Supabase that runs on a schedule and emails you.

### 5a. Install Supabase CLI

On your Mac, open **Terminal** and run:

```bash
brew install supabase/tap/supabase
```

If you don't have Homebrew: go to **https://brew.sh** and run the one-line install command there first.

### 5b. Log in and link your project

```bash
supabase login
```

This opens a browser — click Authorize.

Then:

```bash
supabase link --project-ref YOUR_PROJECT_REF
```

Your project ref is the part of your Supabase URL between `https://` and `.supabase.co`.
Example: if your URL is `https://abcdefghijkl.supabase.co`, the ref is `abcdefghijkl`.

### 5c. Set your secrets

Run each of these commands one at a time — replace the values with your real ones:

```bash
supabase secrets set RESEND_API_KEY=re_your_key_here
```

```bash
supabase secrets set ALERT_TO_EMAIL=your.gmail@gmail.com
```

```bash
supabase secrets set FROM_EMAIL=onboarding@resend.dev
```

```bash
supabase secrets set MY_NAME="Your First Name"
```

> ⚠️ MY_NAME must match exactly what you type in the app's "My Name" field.
> If your name in the app is "Sarah", set MY_NAME="Sarah"

### 5d. Deploy the function

Navigate your Terminal to your downloaded folder, then run:

```bash
supabase functions deploy noteflow-alert
```

You'll see: `Deployed Edge Function noteflow-alert`

### 5e. Set up the two schedules

1. In Supabase dashboard go to **Edge Functions** in the left sidebar
2. Click on **noteflow-alert**
3. Click the **"Schedule"** tab
4. Add the first schedule:
   - **Cron expression:** `0 8 * * 1-5`
   - **HTTP Method:** GET
   - **URL suffix:** `?mode=daily`
   - This runs Mon–Fri at 8am UTC
5. Click **"+ Add schedule"** and add the second:
   - **Cron expression:** `0 17 * * 5`
   - **HTTP Method:** GET
   - **URL suffix:** `?mode=weekly`
   - This runs every Friday at 5pm UTC

> **Note on timezones:** Supabase cron runs in UTC.
> - If you're in **US Eastern** (ET): 8am UTC = 3am ET — adjust to `0 13 * * 1-5` for 8am ET
> - If you're in **US Central** (CT): use `0 14 * * 1-5` for 8am CT
> - If you're in **US Pacific** (PT): use `0 16 * * 1-5` for 8am PT
> - If you're in **UK/GMT**: `0 8 * * 1-5` is correct
> - If you're in **CET (Europe)**: use `0 7 * * 1-5` for 8am CET
>
> For the Friday 5pm alert, add 5 hours to whatever offset you used above.

---

## STEP 6 — Test it right now (1 min)

Don't wait until Monday morning to find out if it works.

In Supabase dashboard → Edge Functions → noteflow-alert → click **"Invoke"**

Add query param: `mode=daily`

Click Invoke. Check your Gmail inbox — the email should arrive within 10–15 seconds.

Then test the weekly summary:
Same thing but with `mode=weekly` — you'll see the full Friday format.

---

## WHAT THE EMAILS LOOK LIKE

### Mon–Fri 8am Daily Brief
```
Subject: ⚠ 2 overdue + 1 due today · NoteFlow

Good morning. Here's what needs your attention today, Monday.

MY ACTION ITEMS
──────────────
⚠ OVERDUE (2)
  • Send revised proposal to ABC Corp    👤 Me    ⏰ 3 days OVERDUE
  • Review Q3 numbers                   👤 Me    ⏰ 1 day OVERDUE

🔥 DUE TODAY (1)
  • Call Sarah re: contract renewal      👤 Me    ⏰ Due TODAY

📅 DUE THIS WEEK (2)
  • Draft board presentation            👤 Me    ⏰ 2 days left
  • Submit expense report               👤 Me    ⏰ 4 days left

OTHERS' ITEMS TO CHASE
──────────────────────
⚠ OVERDUE — Follow up now (1)
  • Mike: send updated budget            👤 Mike  ⏰ 2 days OVERDUE
```

### Friday 5pm Weekly Summary
```
Subject: ⚠ 3 unresolved · NoteFlow Weekly Summary

MY ITEMS
  [Full breakdown with weekend planning note]
  "You have 2 overdue items that should be resolved before the weekend ends."

OTHERS' COMMITMENTS
  [Full list of what others owe, with chase-up flags]

🗓 Planning for Monday Jan 20
  You have 2 overdue items. 3 items carry into next week.
```

---

## TROUBLESHOOTING

**Email not arriving?**
1. Check Gmail spam folder — add `onboarding@resend.dev` to contacts to prevent this
2. In Supabase → Edge Functions → noteflow-alert → click "Logs" — look for errors
3. Make sure RESEND_API_KEY is correct: `supabase secrets list`

**"Cannot connect to database" in the app?**
- Double-check the SUPABASE_URL and SUPABASE_ANON_KEY in App.jsx
- Make sure you ran the schema.sql successfully (Step 1b)

**Wrong timezone on the emails?**
- Adjust the cron expressions as described in Step 5e

**MY_NAME not matching?**
- It's case-insensitive but must be a substring of the name in the app
- If app says "Sarah Chen" and MY_NAME="Sarah" — that works
- If MY_NAME="sarah chen" — also works

---

## ALL SET

Once this is live, the system runs entirely on its own. You never need to think about it.
Every weekday morning your inbox will have a clear picture of what needs action.
Every Friday evening you'll have a full week-in-review with a plan for Monday.

If anything breaks or you want changes, paste the error into Claude.
