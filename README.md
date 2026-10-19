<p align="center">
  <img src="docs/banner.png" alt="Squad Hub — Kalvium @ AMET University" width="100%" />
</p>

<p align="center">
  <img alt="Expo SDK 58" src="https://img.shields.io/badge/Expo-SDK%2058-000020?logo=expo&logoColor=white" />
  <img alt="React Native" src="https://img.shields.io/badge/React%20Native-0.88-61DAFB?logo=react&logoColor=black" />
  <img alt="Supabase" src="https://img.shields.io/badge/Supabase-Postgres%20%2B%20Realtime-3ECF8E?logo=supabase&logoColor=white" />
  <img alt="Android APK" src="https://img.shields.io/badge/Android-APK-3DDC84?logo=android&logoColor=white" />
  <img alt="Cost" src="https://img.shields.io/badge/cost-%E2%82%B90-E3262E" />
</p>

**Squad Hub** is a private app for the Kalvium @ AMET University batch: Squads **91**, **92** and **93**, 77 students plus the Campus Manager. It's one place to share notes, show off projects, pitch ideas, chat, and keep up with deadlines.

---

## Features

| | Feature | What it does |
|---|---|---|
| 📚 | **Notes & resources** | Upload PDFs and images (up to 10 MB) or Drive links, tagged by subject, with search and squad filters |
| 🚀 | **Projects** | Showcase builds, with live GitHub stars, language and last update |
| 💡 | **Ideas** | Pitch, upvote, discuss and find teammates |
| 💬 | **Chat** | A whole-batch room plus one private room per squad, live, with unread badges |
| 📅 | **Deadlines & events** | Moderators post deadlines, exams and hackathons; tap the bell for a reminder an hour before |
| 🔔 | **Notifications** | An inbox with a live badge, plus push alerts for new posts, events, announcements and replies |
| 📊 | **Analytics** | For Admin and CM: sign-ups per squad, 14-day activity, posts by type and squad, top contributors |
| 🛡️ | **Moderation** | Announcements, pinning, reports, member allowlist |
| ✨ | **Design** | Plus Jakarta Sans, brand gradients, squad colours, spring animations, dark mode |

### Roles

| Role | Who | Powers |
|---|---|---|
| **Admin** | Sujan Anandh S I (builder) | Everything |
| **Campus Manager** | Saru Priya | Everything, same as Admin |
| **Squad lead** | optional | Pin, moderate, add events |
| **Student** | the batch | Post, comment, like, save, chat |

Only emails on the allowlist can sign in, using a 6-digit code sent by email. Row Level Security on every table means nobody can read or change data they shouldn't.

---

## How updates reach phones

```
push to main ──► GitHub Actions ──► eas update ──► every installed APK
                                     (channel: preview)    downloads it on next launch
```

- **JavaScript, design and screen changes** go out on every push to `main`. Nobody needs to reinstall.
- **Native changes** (a new library with native code, app icon, permissions) need a new APK: `npx eas-cli build -p android --profile preview`.
- In the app, **Me → About → Check for updates** pulls the latest update immediately.

| Workflow | When | Purpose |
|---|---|---|
| `ci.yml` | every push and PR | typecheck + lint |
| `eas-update.yml` | push to `main` | publishes an over-the-air update |
| `keep-alive.yml` | daily | pings Supabase so the free project never pauses |

---

## Tech stack

- **App:** Expo SDK 58, React Native 0.88, Expo Router, Reanimated 4, TypeScript
- **Backend:** Supabase (Postgres, Auth with email OTP, Storage, Realtime, pg_net)
- **Push:** Expo Push Service with Firebase Cloud Messaging
- **Builds & updates:** EAS Build (APK) and EAS Update

```
src/app/                  screens (Expo Router)
  (tabs)/                 Home, Notes, Projects, Ideas, Chat, Me
  chat/[channel].tsx      live chat room
  post/[id].tsx           post detail, likes, comments
  events.tsx              deadlines & events calendar
  notifications.tsx       inbox
  analytics.tsx           Admin / CM dashboard
  admin.tsx               announcements, reports, allowlist
src/components/           cards, avatar, brand, ui/* (buttons, chips, squad selector…)
src/lib/                  supabase client, queries, chat, push, events
supabase/migrations/      schema, security rules, triggers (run in order)
```

---

## Setup (for maintainers)

1. **Supabase:** run `supabase/migrations/0001…0003` in order in the SQL Editor, then your allowlist (copy `supabase/seed_allowlist.example.sql` to `seed_allowlist.sql`, which git ignores).
2. **Env:** `cp .env.example .env.local` and fill in the Supabase URL and publishable key.
3. **Run:** `npm install && npx expo start`.
4. **APK:** `npx eas-cli build -p android --profile preview`.

### Repository secrets

| Secret | Used by | Where to get it |
|---|---|---|
| `EXPO_TOKEN` | `eas-update.yml` | expo.dev → Account settings → Access tokens |
| `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` | `keep-alive.yml` | Supabase → Project settings → API |

### Turning on push notifications

1. Create a Firebase project and add an Android app with package `com.kalviumamet.squadhub`.
2. Put `google-services.json` in the project root and set `expo.android.googleServicesFile` in `app.json`.
3. In Firebase, go to Service accounts → **Generate new private key**, then upload it at expo.dev → squad-hub → Credentials → Android → **FCM V1**. Never commit this key.
4. Rebuild the APK.

---

## Roadmap

- [ ] Doubt Q&A with accepted answers
- [ ] LeetCode / GitHub leaderboard
- [ ] Hackathon team finder
- [ ] Attendance and sprint tracker

<p align="center">
  Designed &amp; built by <b>Sujan Anandh S I</b> · Squad 92 · Kalvium @ AMET University
</p>
