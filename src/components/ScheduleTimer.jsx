import React, { useEffect, useState, useRef } from "react";
import { buildDaySchedule, formatTime } from "../utils/schedule";

export default function ScheduleTimer({
  day = 1,
  mode = "standard",
  onPeriodEnd,
  syncToClock = true,
  classMap = {},
  showList = true,
  lunchMode = "lunch2",
}) {
  const [periods, setPeriods] = useState([]);
  const [now, setNow] = useState(new Date());
  const [activeIndex, setActiveIndex] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [inSession, setInSession] = useState(true);
  const [showPreOverride, setShowPreOverride] = useState(false);
  const [specialManualType, setSpecialManualType] = useState(null); // 'before' | 'after' | null

  const countdownRef = useRef(null);
  const nowRef = useRef(null);
  const prevDayRef = useRef(day);
  const lastNotifiedRef = useRef(null);

  // build schedule when day or mode changes
  useEffect(() => {
    const p = buildDaySchedule(day, mode, lunchMode);
    setPeriods(p);
    setActiveIndex(0);
    lastNotifiedRef.current = null;
  }, [day, mode, lunchMode]);

  // live clock tick
  useEffect(() => {
    nowRef.current = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(nowRef.current);
  }, []);

  // auto-start first period when day changes ONLY if not synced to clock
  useEffect(() => {
    if (prevDayRef.current !== day) {
      if (!syncToClock && periods.length) {
        startCountdownForIndex(0);
      }
    }
    prevDayRef.current = day;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day, periods, syncToClock]);

  function startCountdownForIndex(index) {
    if (!periods[index]) return;
    clearCountdown();
    const dur = Math.max(
      0,
      Math.ceil((periods[index].end - periods[index].start) / 1000),
    );
    setActiveIndex(index);
    setCountdown(dur);
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearCountdown();
          const finished = periods[index];
          onPeriodEnd && onPeriodEnd(finished);
          const next = index + 1;
          if (periods[next]) {
            setTimeout(() => startCountdownForIndex(next), 400);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  function clearCountdown() {
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = null;
  }

  // cleanup on unmount
  useEffect(() => {
    return () => {
      clearCountdown();
      if (nowRef.current) clearInterval(nowRef.current);
    };
  }, []);

  // when synced to clock, derive active period from device time and detect in-session
  useEffect(() => {
    if (!syncToClock) return;
    if (countdown > 0) return;
    if (!periods.length) return;

    const firstStart = periods[0].start;
    const lastEnd = periods[periods.length - 1].end;
    // Treat the entire calendar day of the schedule as "in session"
    // so the clock can start before school (from midnight onward) and
    // extend slightly after the last block for the after-school window.
    const dayStart = new Date(firstStart);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(firstStart);
    dayEnd.setHours(15, 15, 0, 0); // 3:15 PM
    const nowInSession = now >= dayStart && now < dayEnd;
    setInSession(nowInSession);

    if (!nowInSession) {
      setActiveIndex(-1);
      return;
    }

    const idx = periods.findIndex((per) => now >= per.start && now < per.end);
    if (idx !== -1) {
      setActiveIndex(idx);
    } else {
      const up = periods.findIndex((per) => per.start > now);
      setActiveIndex(up === -1 ? periods.length - 1 : up);
    }
  }, [now, periods, countdown, syncToClock]);

  // when sync mode is toggled on, immediately stop any manual countdown and
  // jump to the correct active period/timer according to device time
  useEffect(() => {
    if (!syncToClock) return;
    if (!periods.length) return;
    // stop any manual countdown
    clearCountdown();
    setCountdown(0);
    const cur = new Date();
    setNow(cur);

    const firstStart = periods[0].start;
    const lastEnd = periods[periods.length - 1].end;
    const dayStart = new Date(firstStart);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(firstStart);
    dayEnd.setHours(15, 15, 0, 0); // 3:15 PM
    const nowInSession = cur >= dayStart && cur < dayEnd;
    setInSession(nowInSession);
    if (!nowInSession) {
      setActiveIndex(-1);
      return;
    }

    const idx = periods.findIndex((per) => cur >= per.start && cur < per.end);
    if (idx !== -1) {
      setActiveIndex(idx);
    } else {
      const up = periods.findIndex((per) => per.start > cur);
      setActiveIndex(up === -1 ? periods.length - 1 : up);
    }
    // reset any manual pre/after-school overrides when resyncing
    setShowPreOverride(false);
    setSpecialManualType(null);
  }, [syncToClock, periods]);

  // when synced to clock, notify once when a period ends
  useEffect(() => {
    if (!syncToClock) return;
    if (!periods.length) return;
    if (activeIndex === -1) return;
    const active = periods[activeIndex];
    if (!active) return;
    if (now >= active.end) {
      if (lastNotifiedRef.current !== activeIndex) {
        onPeriodEnd && onPeriodEnd(active);
        lastNotifiedRef.current = activeIndex;
      }
    }
  }, [now, syncToClock, periods, activeIndex, onPeriodEnd]);

  function jumpTo(index) {
    if (!periods[index]) return;
    setShowPreOverride(false);
    setSpecialManualType(null);
    if (syncToClock) {
      // in sync mode, just select the period (don't start manual countdown)
      setActiveIndex(index);
    } else {
      startCountdownForIndex(index);
    }
  }

  // Manual "Before School" countdown: when clicked, count down from the
  // current time to 8:25 AM for the same calendar day as the schedule's
  // first block start. This only applies when not synced to the clock.
  function startBeforeSchoolCountdown() {
    if (!periods.length) return;
    if (syncToClock) {
      // In synced mode, don't start a manual countdown; just force the
      // view into the Before School pre window.
      setShowPreOverride(true);
      return;
    }
    clearCountdown();
    const firstStart = periods[0].start;
    const start = new Date(firstStart);
    // Manual Before School countdown always runs from 12:01 AM to 8:25 AM
    start.setHours(0, 1, 0, 0);
    const target = new Date(firstStart);
    target.setHours(8, 25, 0, 0);
    const dur = Math.max(0, Math.ceil((target - start) / 1000));
    setActiveIndex(-1);
    setSpecialManualType("before");
    setCountdown(dur);
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearCountdown();
          setSpecialManualType(null);
          onPeriodEnd &&
            onPeriodEnd({
              type: "pre",
              name: "Before School",
              start,
              end: target,
            });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  // Manual "After School" countdown: when clicked (in manual mode),
  // count down from 2:55 PM to 3:15 PM (20 minutes) based on the end
  // of the last scheduled period for the day.
  function startAfterSchoolCountdown() {
    if (!periods.length) return;
    if (syncToClock) return;
    clearCountdown();
    const lastEnd = periods[periods.length - 1].end;
    const start = new Date(lastEnd);
    const target = new Date(start);
    target.setMinutes(target.getMinutes() + 20);
    const dur = Math.max(0, Math.ceil((target - start) / 1000));
    setActiveIndex(-1);
    setSpecialManualType("after");
    setCountdown(dur);
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearCountdown();
          setSpecialManualType(null);
          onPeriodEnd &&
            onPeriodEnd({
              type: "post",
              name: "After School",
              start,
              end: target,
            });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  function formatSeconds(sec) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60)
      .toString()
      .padStart(2, "0");
    const s = (sec % 60).toString().padStart(2, "0");
    if (h > 0) {
      const hh = h.toString().padStart(2, "0");
      return `${hh}:${m}:${s}`;
    }
    return `${m}:${s}`;
  }

  const active = periods[activeIndex];
  let remaining = 0;
  if (countdown > 0) {
    remaining = countdown;
  } else if (active) {
    // Before the first period starts, count down to the start time;
    // once a period is in progress, count down to its end.
    const target = now < active.start ? active.start : active.end;
    remaining = Math.max(0, Math.ceil((target - now) / 1000));
  }

  // Derive special pre-school and pre-first-block windows when synced
  // to the device clock. From midnight until 8:25 we show a
  // "Before School" countdown targeting 8:25. From 8:25–8:30 we show a
  // dedicated Passing period before the first block at 8:30.
  let displayLabel = active ? displayName(active) : "";
  let displayType = active ? active.type : "";
  let displayStart = active ? active.start : null;
  let displayEnd = active ? active.end : null;

  // In manual mode, if the special "Before School" countdown is running
  // (triggered via the dedicated button), represent it with the same
  // label and time range in the header.
  if (
    !syncToClock &&
    periods.length &&
    specialManualType === "before" &&
    countdown > 0
  ) {
    const firstStart = periods[0].start;
    const dayStart = new Date(firstStart);
    // Manual Before School view: 12:01 AM as the start time.
    dayStart.setHours(0, 1, 0, 0);
    const beforeSchoolEnd = new Date(firstStart);
    beforeSchoolEnd.setHours(8, 25, 0, 0);
    displayLabel = "Before School";
    displayType = "pre";
    displayStart = dayStart;
    displayEnd = beforeSchoolEnd;
  }

  // In manual mode, if the special "After School" countdown is running,
  // show the dedicated After School window from 2:55–3:15 PM.
  if (
    !syncToClock &&
    periods.length &&
    specialManualType === "after" &&
    countdown > 0
  ) {
    const lastEnd = periods[periods.length - 1].end;
    const afterStart = new Date(lastEnd);
    const afterEnd = new Date(afterStart);
    afterEnd.setMinutes(afterEnd.getMinutes() + 20);
    displayLabel = "After School";
    displayType = "post";
    displayStart = afterStart;
    displayEnd = afterEnd;
  }

  if (syncToClock && periods.length) {
    const firstStart = periods[0].start;
    const dayStart = new Date(firstStart);
    // Synced pre-school view: 12:01 AM to 8:25 AM
    dayStart.setHours(0, 1, 0, 0);
    const beforeSchoolEnd = new Date(firstStart);
    beforeSchoolEnd.setHours(8, 25, 0, 0);
    const passingStart = new Date(firstStart);
    passingStart.setHours(8, 25, 0, 0);
    const passingEnd = new Date(firstStart);
    passingEnd.setHours(8, 30, 0, 0);

    const lastEnd = periods[periods.length - 1].end;
    const afterStart = new Date(lastEnd);
    const afterEnd = new Date(afterStart);
    afterEnd.setMinutes(afterEnd.getMinutes() + 20);

    if (now >= dayStart && now < beforeSchoolEnd) {
      displayLabel = "Before School";
      displayType = "pre";
      displayStart = dayStart;
      displayEnd = beforeSchoolEnd;
      remaining = Math.max(0, Math.ceil((beforeSchoolEnd - now) / 1000));
    } else if (now >= passingStart && now < passingEnd) {
      displayLabel = "Passing";
      displayType = "passing";
      displayStart = passingStart;
      displayEnd = passingEnd;
      remaining = Math.max(0, Math.ceil((passingEnd - now) / 1000));
    } else if (now >= afterStart && now < afterEnd) {
      displayLabel = "After School";
      displayType = "post";
      displayStart = afterStart;
      displayEnd = afterEnd;
      remaining = Math.max(0, Math.ceil((afterEnd - now) / 1000));
    } else if (active) {
      // For all other in-session times, recompute remaining using
      // the active period's natural start/end.
      const target = now < active.start ? active.start : active.end;
      remaining = Math.max(0, Math.ceil((target - now) / 1000));
    }
  }
  // If the user explicitly chose "Before School" while synced, always
  // show that view regardless of the current clock time.
  if (showPreOverride && periods.length) {
    const firstStart = periods[0].start;
    const dayStart = new Date(firstStart);
    dayStart.setHours(0, 1, 0, 0);
    const beforeSchoolEnd = new Date(firstStart);
    beforeSchoolEnd.setHours(8, 25, 0, 0);
    displayLabel = "Before School";
    displayType = "pre";
    displayStart = dayStart;
    displayEnd = beforeSchoolEnd;
    remaining = Math.max(0, Math.ceil((beforeSchoolEnd - now) / 1000));
  }
  const weekdayLabel = now
    .toLocaleDateString(undefined, { weekday: "long" })
    .toUpperCase();
  function displayName(p) {
    // if it's a lettered block and we have a mapping for it, show 'A - Class Name'
    if (p && p.type === "block") {
      const base = p.name;
      // only apply mapping for single-letter names (A-H)
      if (/^[A-H]$/.test(base) && classMap && classMap[base]) {
        return `${base} - ${classMap[base]}`;
      }
    }
    return p ? p.name : "";
  }

  // Show the main timer panel whenever we have a label to display
  // (active period, pre-school, passing, or after-school window).
  const hasDisplayTimer = !!displayLabel;

  return (
    <div>
      <div className="panel">
        <div className="muted">
          Schedule for Day {day} ({mode})
        </div>
        <div className="muted" style={{ marginTop: 4 }}>
          {weekdayLabel}
        </div>

        {syncToClock && !inSession ? (
          <div style={{ padding: 12 }}>
            <div className="muted">School is not in session</div>
            <div className="muted">
              School hours:{" "}
              {periods.length ? formatTime(periods[0].start) : "8:30"} -{" "}
              {periods.length
                ? formatTime(periods[periods.length - 1].end)
                : "2:55"}
            </div>
            <div style={{ marginTop: 8 }} className="muted">
              Current time: {new Date().toLocaleTimeString()}
            </div>
          </div>
        ) : hasDisplayTimer ? (
          <>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>
                  {displayLabel} <span className="muted">({displayType})</span>
                </div>
                <div className="muted">
                  {displayStart ? formatTime(displayStart) : ""} -{" "}
                  {displayEnd ? formatTime(displayEnd) : ""}
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                }}
              >
                <div className="timer">{formatSeconds(remaining)}</div>
                <div className="clock-value" style={{ marginTop: 6 }}>
                  {now.toLocaleTimeString()}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="muted">No active period right now</div>
        )}
      </div>

      {showList && (
        <div className="list">
          <div
            className={
              "block" +
              ((specialManualType === "before" && countdown > 0) ||
              showPreOverride
                ? " active"
                : "")
            }
            onClick={startBeforeSchoolCountdown}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              <div style={{ fontWeight: 700 }}>
                Before School <span className="muted">(pre)</span>
              </div>
              <div className="muted">12:01 AM - 8:25 AM</div>
            </div>
          </div>
          {periods.map((p, idx) => {
            // hide passing periods from the visible list but keep them in the schedule
            if (p.type === "passing") return null;
            return (
              <div
                key={idx}
                className={"block" + (idx === activeIndex ? " active" : "")}
                onClick={() => jumpTo(idx)}
              >
                {/* two-line layout: first line = name + type, second line = times */}
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 6 }}
                >
                  <div style={{ fontWeight: 700 }}>
                    {displayName(p)} <span className="muted">({p.type})</span>
                  </div>
                  <div className="muted">
                    {formatTime(p.start)} - {formatTime(p.end)}
                  </div>
                </div>
              </div>
            );
          })}
          <div
            className={
              "block" +
              (specialManualType === "after" && countdown > 0 ? " active" : "")
            }
            onClick={startAfterSchoolCountdown}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              <div style={{ fontWeight: 700 }}>
                After School <span className="muted">(post)</span>
              </div>
              <div className="muted">2:55 PM - 3:15 PM</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
