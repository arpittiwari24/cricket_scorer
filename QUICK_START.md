# Cricket Scorer - Quick Start Guide

## ⚡ Get Running in 3 Steps

### Step 1: Set Up Database (5 minutes)

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Go to SQL Editor → New Query
4. Copy entire contents of `supabase-schema.sql`
5. Paste and click "Run"
6. Go to Settings → API → Copy your keys

### Step 2: Set Up Google OAuth (5 minutes)

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create project → Enable Google+ API
3. OAuth consent screen → Fill required fields
4. Create Credentials → OAuth Client ID → Web application
5. Add redirect: `http://localhost:3000/api/auth/callback/google`
6. Copy Client ID and Secret

### Step 3: Configure Environment

Create `.env.local` in project root:

```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<run: openssl rand -base64 32>
GOOGLE_CLIENT_ID=<from step 2>
GOOGLE_CLIENT_SECRET=<from step 2>
NEXT_PUBLIC_SUPABASE_URL=<from step 1>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from step 1>
SUPABASE_SERVICE_ROLE_KEY=<from step 1>
```

### Step 4: Run the App

```bash
bun run dev
```

Visit `http://localhost:3000`

---

## 🏏 Your First Match in 2 Minutes

### Create a Team
1. Login → Teams → Create Team
2. Add players:
   - Type name → "Add Guest" (for players without accounts)
   - OR search by email → "Add" (for registered users)
3. Select a captain
4. Create

### Start a Match
1. Matches → Create Match
2. Select your 2 teams, overs
3. Next → Select 2 opening batsmen + 1 opening bowler
4. Start Match!

### Score the Match
- **Click run buttons** (0-6) to score
- **Wicket button** → select dismissal type
- **Wide/No Ball** → extras
- **Auto-rotation** on odd runs
- **Over complete** → change bowler
- **Match ends** → see result + updated stats!

---

## 📊 Key Features

| Feature | Location |
|---------|----------|
| Create Team | Teams → Create Team |
| Start Match | Matches → Create Match |
| Score Match | Click on live match |
| View Stats | Profile |
| Live Matches | Live page |
| Export Scorecard | Match → Scorecard → Export PNG |

---

## 🎯 Guest Players

**Guest players** are players who don't have an account:
- ✅ Can play in matches
- ✅ Their match stats are recorded
- ❌ Career stats NOT tracked
- ❌ Can't login themselves

**Registered players** have accounts:
- ✅ Can play in matches
- ✅ Match stats recorded
- ✅ **Career stats automatically updated**
- ✅ Can login and view their profile

---

## 🔥 Pro Tips

1. **Mixed Teams**: You can have both guest and registered players in the same team
2. **Captain**: The captain gets a ⭐ badge
3. **Real-time**: Multiple people can watch the same match live
4. **Strike Rotation**: Strike automatically rotates on odd runs (1, 3, 5)
5. **Over Complete**: After 6 legal balls, you'll be prompted to change bowler
6. **Export**: You can export any completed match scorecard as PNG

---

## 🚨 Troubleshooting

**Login not working?**
- Check Google OAuth redirect URI is exactly: `http://localhost:3000/api/auth/callback/google`
- Verify NEXTAUTH_SECRET is set

**Database errors?**
- Confirm supabase-schema.sql ran successfully
- Check Supabase URL and keys in .env.local

**Real-time not updating?**
- Refresh the page
- Check Supabase realtime is enabled in your project

---

## 📖 Full Documentation

For detailed setup instructions, see `SETUP.md`
For implementation details, see `IMPLEMENTATION_SUMMARY.md`

---

**That's it! You're ready to score cricket matches! 🏏**
