# Sierra Schedule — App README

This file documents the Sierra Schedule timer application specifically (the purpose-built app). It complements the project-level `README.md` and focuses on how the schedule is modeled, how to run and develop the app, and the important implementation details.

## Overview

The app is a lightweight React 18 + Vite single-page app that:

- Models an 8-day rotation schedule and computes exact Date-based start/end times for each period.
- Exposes a schedule-aware countdown UI that can either sync to the device clock or operate independently as a manual sequence
- Provides special Monday and Wednesday schedule variants per spec.
- Contains a manual timer for arbitrary countdowns.
- Displays a persistent clock at the bottom of the main view.

## Features (detailed)

- 8-day rotation: Days 1–8 map to block labels (A–H). The rotation mapping is defined in `src/utils/schedule.js`.
- Schedule construction: `buildDaySchedule(day, mode, lunchMode)` returns an ordered array of period objects: `{ type, name, start: Date, end: Date }`.
- Modes:
  - `standard` — default schedule (50-minute blocks, lab after 2nd block, and for Lunch 2 a 40-minute lunch after 4th block ending at 1:05 PM with a 5-minute passing period until 1:10 PM before period 5; 5-minute passing where applicable).
  - `monday` — lab replaced by a Morning Meeting; last block shortened by 5 minutes so the day ends on the same time; no additional post-meeting delay.
  - `wednesday` — blocks and Morning Meeting are 45 minutes; passing remains.
- Sync toggle: when enabled the app computes the active period from the device clock and displays a live countdown for the active period. When disabled the schedule behaves as a manual sequencer: clicking a block starts a countdown for that block.
- Safety: the sync toggle is disabled when the device time is outside the computed school hours for the selected day and mode (this prevents accidentally syncing to a non-school window).

## File map (important files)

- `src/utils/schedule.js` — schedule building logic and time helpers. The authoritative place for rotation mapping and per-mode durations.
- `src/components/ScheduleTimer.jsx` — shows the day schedule, highlights active period, handles countdowns and transitions; supports both sync and manual modes.
- `src/components/ManualTimer.jsx` — small utility to run an arbitrary countdown (accepts `MM:SS` or `HH:MM:SS`).
- `src/components/ClockView.jsx` — persistent clock component.
- `src/App.jsx` — top-level view that ties the pieces together: sidebar controls (mode, day, scheduleMode, sync toggle), main view, and the clock.

## How scheduling is implemented

- The schedule builder starts from a fixed local-time start: 8:30 AM for the day. It iterates through the 6 blocks defined by the day's rotation and inserts lab and lunch at the specified positions.
- Each period is a JavaScript `Date` range with concrete start and end values (not relative offsets). This makes it simple in the UI to compute "time remaining" as `Math.ceil((period.end - now)/1000)`.
- Passing periods are inserted between blocks except where lab/lunch replaces or is adjacent using the implementation logic in `src/utils/schedule.js`.

# Sierra Schedule — App README (detailed)

This document describes the Sierra Schedule timer application and the recent feature updates applied during development. It focuses on how the schedule is modeled, runtime behaviors (sync vs manual), UI details, and how to run and develop the app.

## Overview

The app is a lightweight React 18 + Vite single-page app that:

- Models an 8-day rotation schedule and computes exact Date-based start/end times for each period (and supports a special "Day 0" numbered-period view).
- Exposes a schedule-aware countdown UI that can either sync to the device clock or operate independently as a manual sequence.
- Automatically applies Monday/Wednesday schedule variants when sync is enabled (based on device weekday).
- Disables the sync toggle outside computed school hours to avoid accidental syncing off-hours.
- Includes a manual editable timer (with presets) and a persistent clock.
- Provides a large in-app "Time is up!" overlay notification (used by both schedule and manual timers) and a prominent, centered countdown UI.

## Features (detailed)

- Rotation and Day 0:
  - Days 1–8 map to block labels (A–H) using the rotation defined in `src/utils/schedule.js`.
  - Day 0 is a special view: the six lettered blocks are titled `Period 1`, `Period 2`, ... `Period 6` instead of letters. Lab/Lunch/Morning Meeting names remain unchanged. Timing remains identical — only the displayed block names change.

- Schedule construction and modes:
  - `buildDaySchedule(day, mode)` returns an ordered array of period objects: `{ type, name, start: Date, end: Date }`.
  - Modes supported:
    - `standard`: default schedule (50-minute blocks, 25-minute lab after 2nd block, 45-minute lunch after 4th block, 5-minute passing where appropriate).
    - `monday`: Morning Meeting in place of lab (30 minutes), final block shortened to keep the day end time the same; no inserted post-meeting delay.
    - `wednesday`: blocks and Morning Meeting are 45 minutes; passing remains.

- Sync behavior:
  - When "Sync to device time" is enabled the app derives the active period from the device clock and highlights it with a live countdown.
  - If `syncToClock` is true, the app automatically sets `scheduleMode` to `monday` on Mondays, `wednesday` on Wednesdays, and `standard` on other weekdays. The mode updates live as the `now` clock ticks (so mode will flip across midnight if necessary).
  - The sync toggle is disabled (and forced off) when the current device time is outside the computed school hours for the selected day/mode. A muted hint explains why the toggle is disabled.

- Manual timer and presets:
  - Manual mode includes an editable dropdown (input + `datalist`) with common presets (10s, 30s, 1m, 5m, etc.) while still allowing typing (MM:SS, HH:MM:SS, or plain minutes).
  - Starting a manual timer triggers the same "Time is up!" overlay when it completes.

- Notifications and presentation:
  - When any timer ends (synced schedule period or manual timer), the app shows a large centered overlay with a bold "Time is up!" title, an optional subtitle (period name), and a Dismiss button. The overlay auto-hides after a short interval.
  - The countdown display is the main focus of the UI. The `.timer` element was enlarged and made responsive; a monospace glyph/font and a fixed character width ensure numeric values do not shift position when digits change.

## File map (important files)

- `src/utils/schedule.js` — schedule building logic and time helpers. Rotation mapping, Day 0 naming, and per-mode durations are defined here.
- `src/components/ScheduleTimer.jsx` — schedule UI: builds/display periods, highlights active period, shows live countdown when synced, and supports manual start when sync is off.
- `src/components/ManualTimer.jsx` — manual editable dropdown input + presets and countdown behavior; calls parent `onFinish` when finished.
- `src/components/ClockView.jsx` — persistent clock component rendered at the bottom of the main area; uses a monospaced, fixed-width numeric layout.
- `src/App.jsx` — top-level wiring and UI controls: mode selector, Day 0..8 selector, scheduleMode buttons, sync checkbox (disabled out-of-hours), and notification overlay.
- `src/index.css` — global styles: light theme, responsive timer font sizes, overlay styling, and monospace/fixed-width layout for numeric elements.

## How scheduling is implemented

- The schedule builder starts from a fixed local-time start: 8:30 AM. It iterates through the 6 blocks for the chosen rotation and inserts lab and lunch at the specified positions.
- Each period is represented as a JavaScript `Date` range with concrete `start` and `end` values. The UI computes time remaining as `Math.ceil((period.end - now) / 1000)`.
- Passing periods are inserted between blocks except where lab/lunch are adjacent (the builder logic in `src/utils/schedule.js` controls these edge rules).

## Styling and UX notes

- Light theme: global color variables and light panels are applied in `src/index.css`.
- Countdown prominence: the `.timer` class is large and responsive (96px desktop, 64px tablet, 40px small screens) and centered in the main panel.
- Stable numeric layout: `.timer` and `.clock-value` use a monospace font and reserve `8ch` width so digits never shift position when values change (this applies to the persistent clock and countdowns).
- Sidebar controls: mode and schedule-mode buttons receive an `active` style when selected, and the button groups are allowed to wrap to avoid being cut off on narrow sidebars.

## Run & develop

From the project root:

```bash
npm install
npm run dev
```

- The dev server will print the local URL (usually `http://localhost:5173` or `5174` if `5173` is busy).
- Open the app in a browser and test Schedule vs Manual modes, Day 0..8, and the sync toggle behavior.

Build for production:

```bash
npm run build
npm run preview
```

## Troubleshooting

- If you see esbuild transform errors referencing duplicated imports or symbols, check `src/components/ScheduleTimer.jsx` and `src/App.jsx` for stray duplicated code blocks and ensure JSX is syntactically valid.
- If the sync toggle is immediately turned off when you select it, that's expected behavior when the device time is outside the computed school hours for the selected day/mode — the app forces sync off to avoid accidental out-of-session syncing.

## Known issues & assumptions

- Time math uses the JS `Date` object and local device time. Daylight saving transitions that occur during the school day are not specially handled.
- The auto-apply of `monday` / `wednesday` runs while `syncToClock` is active. If you'd prefer the user to override the mode while synced, we can change the effect to only set the mode when `syncToClock` is toggled on.

## Suggested next steps / enhancements

- Add a short audio chime for timer end events (and a user preference to enable/disable sound).
- Persist UI choices (`selectedDay`, `scheduleMode`, `syncToClock`) to `localStorage` so the app restores state across reloads.
- Add unit tests for `src/utils/schedule.js` (include Day 0 and Monday/Wed edge cases).
- Add an optional full-screen "presentation" mode that hides the sidebar and centers the timer.

---

If you'd like, I can update the project-level `README.md` with a short summary of these features or add unit tests for the schedule builder; tell me which you'd like next and I'll add it to the todo list and implement it.
