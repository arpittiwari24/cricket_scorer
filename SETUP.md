# Cricket Scorer - Setup Guide

## Prerequisites
- Node.js 18+ or Bun installed
- A Google Cloud account for OAuth
- A Supabase account

---

## Step 1: Supabase Setup

### 1.1 Create a Supabase Project
1. Go to [https://supabase.com](https://supabase.com)
2. Click "Start your project"
3. Create a new project:
   - Name: `cricket-scorer` (or your choice)
   - Database Password: Choose a strong password
   - Region: Choose closest to you
   - Wait for project to finish setting up (~2 minutes)

### 1.2 Run Database Schema
1. In your Supabase dashboard, click "SQL Editor" in the left sidebar
2. Click "New query"
3. Copy the entire contents of `supabase-schema.sql` from this project
4. Paste into the SQL editor
5. Click "Run" to execute the schema
6. You should see "Success. No rows returned" - this is correct!

### 1.3 Get Supabase API Keys
1. In Supabase dashboard, click "Settings" (gear icon) in the left sidebar
2. Click "API" under Project Settings
3. You'll need 3 values:
   - **Project URL**: Copy the URL under "Project URL"
   - **anon/public key**: Copy the key under "Project API keys" → "anon public"
   - **service_role key**: Copy the key under "Project API keys" → "service_role"
4. Keep these safe - you'll need them in Step 3

---

## Step 2: Google OAuth Setup

### 2.1 Create Google Cloud Project
1. Go to [https://console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project or select an existing one
3. Name it "Cricket Scorer" (or your choice)

### 2.2 Enable Google+ API
1. In the Google Cloud Console, go to "APIs & Services" → "Library"
2. Search for "Google+ API"
3. Click on it and click "Enable"

### 2.3 Configure OAuth Consent Screen
1. Go to "APIs & Services" → "OAuth consent screen"
2. Select "External" and click "Create"
3. Fill in the required fields:
   - App name: "Cricket Scorer"
   - User support email: Your email
   - Developer contact: Your email
4. Click "Save and Continue"
5. On Scopes page, click "Save and Continue"
6. On Test users page, add your email, then click "Save and Continue"
7. Click "Back to Dashboard"

### 2.4 Create OAuth Credentials
1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. Select "Web application"
4. Name it "Cricket Scorer Web Client"
5. Under "Authorized JavaScript origins", add:
   - `http://localhost:3000`
   - Your production URL (if deploying, e.g., `https://yourdomain.com`)
6. Under "Authorized redirect URIs", add:
   - `http://localhost:3000/api/auth/callback/google`
   - Your production callback URL (if deploying)
7. Click "Create"
8. Copy your **Client ID** and **Client Secret** - you'll need them in Step 3

---

## Step 3: Environment Variables

### 3.1 Create `.env.local` file
1. In the project root, create a file named `.env.local`
2. Copy the contents from `.env.local.example`
3. Fill in the values:

```env
# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<GENERATE_THIS>

# Google OAuth (from Step 2.4)
GOOGLE_CLIENT_ID=your-google-client-id-here
GOOGLE_CLIENT_SECRET=your-google-client-secret-here

# Supabase Configuration (from Step 1.3)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

### 3.2 Generate NEXTAUTH_SECRET
Run this command in your terminal:
```bash
openssl rand -base64 32
```
Copy the output and paste it as the value for `NEXTAUTH_SECRET` in `.env.local`

---

## Step 4: Verify Setup

Once you've completed all steps, you should have:
- ✅ Supabase project created with schema installed
- ✅ Google OAuth credentials created
- ✅ `.env.local` file with all values filled in

---

## Step 5: Run the Application

After completing the setup guide and all auth files are created (next step in implementation):

```bash
bun run dev
```

The app will be available at `http://localhost:3000`

---

## Troubleshooting

### Error: "Invalid OAuth client"
- Make sure your redirect URIs in Google Cloud Console exactly match `http://localhost:3000/api/auth/callback/google`

### Error: "Failed to fetch from Supabase"
- Check that your Supabase URL and keys are correct in `.env.local`
- Make sure the schema was successfully run (check Tables in Supabase dashboard)

### Error: "NEXTAUTH_SECRET not defined"
- Make sure you've generated and added the secret to `.env.local`
- Restart the dev server after adding environment variables

---

## Next Steps

Once the setup is complete and the application is running:
1. You'll be able to sign in with Google
2. Your profile will be created automatically in Supabase
3. You can start creating teams and matches!
