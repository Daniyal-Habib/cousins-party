# Cousins Game Night 🌴

A mobile-first, portrait-locked multiplayer party-game web app for the cousins.
GTA 6 / Vice-City neon aesthetic. Online (room-based) **and** Local (Pass & Play) modes.

**Currently ships with: Mafia** (full vertical slice — Online + Pass & Play).
The modular engine is structured so UNO and Word Guesser drop in as new modules.

---

## Tech stack
- **Next.js 14** (App Router) + **TypeScript**
- **Tailwind CSS** + **Framer Motion** (animations)
- **Firebase**: Firestore (game/user state), Realtime Database (live canvas + presence), Storage (profile photos)
- **Zustand** (local session state only)

## Quick start

```bash
npm install
cp .env.local.example .env.local   # then paste your Firebase keys
npm run dev
```

Open the app on your phone (or a narrow browser window — it's portrait-locked).
Log in with name + email (no password — email is just your player ID).

### Firebase setup
1. Create a Firebase project → add a **Web app** → copy the config values.
2. Enable **Firestore**, **Realtime Database**, and **Storage**.
3. Paste the config into `.env.local` (all `NEXT_PUBLIC_FIREBASE_*` vars).
4. Deploy the security rules:
   ```bash
   npm i -g firebase-tools
   firebase deploy --only firestore:rules,database:rules
   ```
   (Point `firebase.json` at `firestore.rules` + `database.rules.json`.)

> **Auth note:** the app uses email-as-ID with no Firebase Auth by default, so
> the included rules are permissive. For real per-user enforcement (especially
> the Mafia-only chat gate), enable **Anonymous Auth** and key rules on
> `request.auth.uid` instead of trusting client-supplied uids.

---

## Architecture

```
src/
  app/
    (app)/              # authenticated shell: home, leaderboard, profile, history
    create/             # create room
    room/[code]/        # waiting room (players + live canvas)
    play/[code]/mafia/  # live mafia game
    page.tsx            # instant login
  components/
    theme/              # NeonButton, GlassPanel, Avatar, GradientBackdrop
    role-reveal/        # RoleRevealCard (the draggable 50%-lock component)
    canvas/             # LiveCanvas (shared RTDB drawing + zoom/pan)
    nav/                # BottomNav, BackHeader
    games/mafia/        # Mafia phase screens + status bar
  lib/
    firebase.ts         # init (resilient to missing config)
    hooks/              # useUser, useRoom, useServerTimer, useChat, useHistory
    rooms/roomService   # create/join/leave/kick/host-migration/presence
  games/
    _engine/            # GameModule contract (drop-in new games)
    mafia/
      types.ts          # roles, phases, results
      setup.ts          # role assignment
      resolver.ts       # night/day/win resolution (pure)
      state.ts          # authoritative game-doc shape
      mafiaService.ts   # host phase machine + player action submission
      useMafia.tsx      # game context + selectors
      useHostEngine.ts  # host-only auto-advance effect
```

### Key design choices
- **Host-authoritative game model.** The host's client runs the phase machine and
  writes the authoritative `game` doc inside Firestore transactions; all players
  read it. Players write only their own action fields. This avoids Cloud
  Functions in v1 and matches the PRD's host-adjustable timers / host migration.
- **Server-driven timers.** `timerEndsAt` is stored on the game doc; every client
  reads the same value and counts down. Client-clock-skew is accepted for v1.
- **Mafia chat privacy.** Mafia-only chat lives on `rooms/{code}/mafiaChat`, a
  *separate* path from the main game reads, so non-Mafia clients never receive
  it. Server-side enforcement requires Anonymous Auth (see note above).
- **Modularity.** Each game implements the `GameModule` contract; adding a 4th
  game is a new `games/<name>/` folder + a play route.

## Data model (Firestore)
- `users/{email}` — name, photo, stars, gamesPlayed, wins
- `users/{email}/history/{gameId}` — date, game, result, role, team
- `rooms/{code}` — host, gameType, status, settings
- `rooms/{code}/players/{uid}` — name, photo, isHost, isOnline, isSpectator
- `rooms/{code}/game` — phase machine state (see `state.ts`)
- `rooms/{code}/chat` — public day chat
- `rooms/{code}/spectatorChat` — eliminated-player chat
- `rooms/{code}/mafiaChat` — Mafia-only (gated)
- RTDB `canvas/{code}/strokes` — shared drawing strokes
- RTDB `presence/{code}/{uid}` — disconnect signal

## What's implemented
- ✅ Instant login, profile (photo upload), global leaderboard, past-games history
- ✅ Rooms: create/join (4-digit code), player list, host kick, leave, host migration
- ✅ Live shared drawing canvas (colors, sizes, eraser, clear, pinch-zoom + pan)
- ✅ Draggable Role Reveal card (50% drag → lock → Continue/Undo)
- ✅ **Mafia Online**: roles, reveal, night (mafia vote + private chat, doctor w/
  previous-night lockout, detective, sheriff), narration, day (timer, public chat,
  voting grid, tie rule), spectator mode, end screen, stars + history
- ⏳ Mafia Pass & Play, reconnect grace, hardening (in progress)
- 🔜 UNO, Word Guesser

## Scripts
```bash
npm run dev     # dev server
npm run build   # production build
npm run start   # serve the production build
npm run lint    # eslint
```
