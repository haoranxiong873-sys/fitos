# Architecture

Skulpt is a local-first React Native and Expo application. Its product database is SQLite on the device. Network services, native platform APIs, and the watchOS target sit around that local core.

## Data flow

```text
screen, hook, or native target
             |
             v
      CRUD and services
             |
             v
    Drizzle ORM + SQLite
             |
             +---- local queries ----> UI, history, charts
             |
             +---- optional queue ---> SyncLayer provider
```

Workout operations commit to SQLite before any optional network work. The normal workout flow does not require an account or a reachable sync provider.

## Application layers

### Routes and screens

`src/routes/` contains Expo Router entry points and provider composition. Product screens live under `src/screens/`; reusable UI lives under `src/components/`.

`src/routes/_layout.tsx` starts database migrations and assembles the application's providers, including user state, analytics, notifications, audio, health import, workouts, reviews, and sync.

### Local data

`src/db/schema/` defines the SQLite schema with Drizzle ORM. Generated migrations live under `drizzle/` and run when the application starts.

Product writes belong in `src/crud/`. Screens do not need ad hoc SQL, and the optional sync queue has one consistent boundary.

The main local domains include:

- user preferences;
- exercises;
- workouts and workout groups;
- workout exercises and sets;
- body measurements;
- review-prompt state;
- sync queue and cursor metadata.

### Optional SyncLayer

`EXPO_PUBLIC_SYNC_HOST` selects a provider at build time. Without it, the app does not mount the active sync provider, authenticate with a provider, or add new CRUD operations to `sync_queue`.

When the variable is present:

1. local create, update, and delete operations can add entries to `sync_queue`;
2. the sync engine compacts compatible operations for each record;
3. `POST /sync` sends the pending batch;
4. `GET /sync` requests changes after the saved timestamp;
5. returned records and deleted IDs are applied to SQLite;
6. completed queue entries are removed.

Authentication uses `POST /auth/token` with the local user ID and a persistent device ID. The client stores the returned token in MMKV, with an in-memory fallback for the current launch.

The HTTP contract works with any compatible implementation. Store builds can use the Skulpt-operated provider, while a custom build can use another provider. See [SYNC_PROTOCOL.md](SYNC_PROTOCOL.md).

### Exercise catalogue

The maintained Skulpt exercise catalogue uses the same provider host but a separate `skulpt` pull scope and locale cursor. User-created exercises remain separate through their source and identifiers.

The catalogue is not currently bundled with the client. A clean build without a provider starts without the maintained system catalogue, but users can create exercises and use the workout flow locally.

### Health integrations

The iOS client reads authorised HealthKit data and can write completed workouts. Android uses Health Connect. Missing services or denied permissions must not break the local workout flow.

Authorised body measurements copied into Skulpt are stored in the local `measurement` table. Rows with `source: "health"` are currently eligible for optional SyncLayer in the same way as manual measurement rows.

### Apple Watch and Live Activities

`targets/watch/` contains the SwiftUI watchOS application. `modules/watch-connectivity/` bridges WatchConnectivity messages into the React Native client.

`modules/live-activity/` and `targets/workout-widget/` implement the Live Activity and Dynamic Island surfaces. Native target changes need simulator or physical-device verification in addition to JavaScript checks.

### Analytics, diagnostics, and updates

PostHog is initialised only when its public key and host are configured. Sentry uses `EXPO_PUBLIC_SENTRY_DSN`. Expo Updates uses the EAS project ID from the build configuration.

These services are separate from SyncLayer. A local-first build can still use any service whose variable is configured.

## State boundaries

- SQLite stores product records and migrations.
- React Query manages asynchronous query state.
- Zustand and React providers manage interaction state.
- MMKV stores small persistent values such as auth and sync metadata fallbacks.
- HealthKit and Health Connect remain external platform stores accessed through user permissions.

Do not store the same persistent product fact in several state systems. Use SQLite for history and other durable records.

## Tests

Jest covers sync flows, API and auth behaviour, health edge cases, review state, exercise search, and selected workout calculations. Run:

```bash
bun run verify
```

Native integrations and store-sensitive behaviour still require platform testing.

## FitOS phase-one audit (2026-11-16)

This section records findings from the public `skulptapp/skulpt` `main` source archive obtained on 2026-11-16. GitHub reported head `538363e70d8cf5a9832eddf4e9d06a6e931446cb` during the audit. The archive has no upstream Git history. The local Git baseline is a snapshot import, **not a verified FitOS fork**; `origin` and the intended GitHub owner remain unknown. Do not use the local baseline as a PR base until the actual fork and its common ancestor are checked.

### Confirmed implementation

| Area | Evidence in this tree | Boundary |
| --- | --- | --- |
| Client | `package.json`, `src/routes/`, `src/screens/` | Expo 57.0.10, React Native 0.86.2, React 19.2.3, Expo Router 57.0.10 |
| Local storage | `src/db/index.ts`, `src/db/schema/`, `drizzle/0000`–`0020` | `expo-sqlite` 57.0.1, Drizzle ORM 0.45.2; database name remains `skulpt.db` |
| Workout core | `src/db/schema/workout.ts`, `exercise.ts`, `src/crud/workout/`, `src/crud/exercise/` | Planned/completed workouts, exercise sets, weight, reps, RPE and rest are represented. There is no RIR column or per-exercise note column. |
| Watch | `targets/watch/`, `modules/watch-connectivity/`, `src/services/watch-connectivity.ts` | SwiftUI target and phone bridge exist. Watch can display a phone-started workout, edit weight/reps/distance, control sets and rest, and run HealthKit workout collection. Native runtime behavior is unverified here. |
| Health | `src/services/health.ts`, `health-importer.ts`, `src/db/schema/measurement.ts` | HealthKit/Health Connect read selected measurements and workout metrics; imported measurements retain platform, external ID, timestamp and unit and have a uniqueness index. Watch reads heart rate and active energy during a session. |
| Optional network | `src/sync/`, `src/api/`, `docs/LOCAL_ONLY.md` | SyncLayer is build-time optional. A local-only build lacks the maintained exercise catalogue; custom exercises still work. PostHog and Sentry have separate configuration. |
| Language | `src/locale/resources/zh/`, `targets/watch/zh.lproj/` | Chinese resources exist, while `user.lng` defaults to English; FitOS needs a Chinese-first default and review of new strings. |

### Missing or requiring design

- No food, meal or nutrient tables/screens were found in `src/db/schema/` or product screens. Daily targets and food provenance need new local tables and flows.
- No FitOS 12-week cycle, rotating 3-day scheduler, RIR-based double progression or confirmation-gated plan changes were found.
- `IOS_HEALTH_READ_TYPES` currently includes workout, heart rate, energy, steps and body measurements, but not resting heart rate, HRV or sleep. `requestHealthPermissions()` requests its configured list together; FitOS calls for permission at the point of use. HealthKit read authorization cannot be reliably inferred from a boolean alone; a zero-result read can mean no data or no read access.
- No complete personal-data CSV/JSON export, database backup/restore, or all-data deletion flow was established in this audit. Existing workout/exercise delete operations are narrower.
- No AI coach or consented local summary pipeline was found. The upstream README describes AI as a roadmap, not a shipped feature.
- Existing `measurement` rows imported from Health are eligible for optional SyncLayer. A FitOS privacy review must decide which imported fields may ever sync; do not enable a provider by default.

### FitOS boundaries

Keep the existing SQLite/Drizzle workout core. Treat `data/fitos/12-week-plan.zh-CN.json` as a public, generic plan template; copy or map it into user-owned SQLite rows only after explicit local initialization. Device-only profile, current loads, body metrics and nutrition targets belong under ignored `local/fitos/` during development and ultimately inside the app's private database. The seed contains no personal measurements or calibrated loads.

Proposed extension tables and migration gates are in [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md). The exact Skulpt schema and migration sequence must remain the baseline; new migrations follow `0020` and require upgrade tests before use. The current connection executes `PRAGMA foreign_keys = OFF`; any new referential constraints need an explicit compatibility review.

### Platform and license boundary

Windows can run source checks and JavaScript tests once Bun and dependencies are installed. It cannot run Xcode or compile the SwiftUI/watchOS targets locally. Native signing, HealthKit entitlements, permission UX, WatchConnectivity reliability and device data must be verified in a macOS build environment and on supported physical devices. Expo Go does not include this project's custom native modules.

Retain `LICENSE`, copyright notices and change attribution. Skulpt is GPL-3.0. Distribution of a modified app needs a review of GPL-3.0 corresponding-source and notice obligations; private health records are not source code and must not enter Git. See the [GNU GPL FAQ](https://www.gnu.org/licenses/gpl-faq.en.html). This is an engineering checklist, not a legal opinion.
