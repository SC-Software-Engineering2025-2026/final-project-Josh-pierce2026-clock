import React, { useState, useEffect } from "react";
import ScheduleTimer from "./components/ScheduleTimer";
import ManualTimer from "./components/ManualTimer";
import { buildDaySchedule } from "./utils/schedule";
import ClassEditor from "./components/ClassEditor";

export default function App() {
  const [modeView, setModeView] = useState("schedule"); // schedule | manual
  const [selectedDay, setSelectedDay] = useState(1);
  const [scheduleMode, setScheduleMode] = useState("standard"); // standard | monday | wednesday
  const [lunchMode, setLunchMode] = useState("lunch2"); // lunch1 | lunch2
  const [syncToClock, setSyncToClock] = useState(true);
  const [now, setNow] = useState(new Date());
  const [inSession, setInSession] = useState(true);
  const [classMap, setClassMap] = useState({});
  const [showClassEditor, setShowClassEditor] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [scheduleCollapsed, setScheduleCollapsed] = useState(false);
  const [scheduleSound, setScheduleSound] = useState("chime");
  const [manualSound, setManualSound] = useState("beep");
  const [toast, setToast] = useState({ message: "", visible: false });
  const [notification, setNotification] = useState({
    title: "",
    subtitle: "",
    visible: false,
  });

  function handlePeriodEnd(period) {
    // simple alert or console - show Time is up!
    console.log("Period ended", period);
    // show a large in-app notification instead of a blocking alert
    const title = "Time is up!";
    const subtitle = period && period.name ? period.name : "";
    setNotification({ title, subtitle, visible: true });
    // play schedule sound
    playSound(scheduleSound);
    // auto-hide after 6 seconds
    setTimeout(() => setNotification((n) => ({ ...n, visible: false })), 6000);
  }

  function handleManualFinish(label = "Manual timer") {
    const title = "Time is up!";
    const subtitle = label;
    setNotification({ title, subtitle, visible: true });
    playSound(manualSound);
    setTimeout(() => setNotification((n) => ({ ...n, visible: false })), 6000);
  }

  // simple WebAudio-based player (no external assets). Creates tones/envelopes per id.
  let audioCtx = null;
  function getAudioCtx() {
    if (!audioCtx) {
      try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) {
        audioCtx = null;
      }
    }
    return audioCtx;
  }

  function playSound(id) {
    if (!id || id === "none") return;
    const ctx = getAudioCtx();
    if (!ctx) return;
    const t0 = ctx.currentTime;
    if (id === "beep") {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = 880;
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(0.8, t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.6);
      o.connect(g);
      g.connect(ctx.destination);
      o.start(t0);
      o.stop(t0 + 0.65);
    } else if (id === "chime") {
      // arpeggiated chime
      const freqs = [880, 1320, 1760];
      freqs.forEach((f, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "sine";
        o.frequency.value = f;
        const s = t0 + i * 0.08;
        g.gain.setValueAtTime(0, s);
        g.gain.linearRampToValueAtTime(0.7, s + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, s + 1.2);
        o.connect(g);
        g.connect(ctx.destination);
        o.start(s);
        o.stop(s + 1.25);
      });
    } else if (id === "bell") {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "triangle";
      o.frequency.setValueAtTime(600, t0);
      o.frequency.exponentialRampToValueAtTime(220, t0 + 2.0);
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(0.9, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + 2.2);
      o.connect(g);
      g.connect(ctx.destination);
      o.start(t0);
      o.stop(t0 + 2.25);
    } else if (id === "gong") {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sawtooth";
      o.frequency.setValueAtTime(200, t0);
      o.frequency.exponentialRampToValueAtTime(60, t0 + 3.0);
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(0.9, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 4.2);
      o.connect(g);
      g.connect(ctx.destination);
      o.start(t0);
      o.stop(t0 + 4.5);
    }
  }

  // keep a live clock to re-evaluate whether it's school hours
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // load class map from localStorage once
  useEffect(() => {
    try {
      const raw = localStorage.getItem("sierra_classes");
      if (raw) setClassMap(JSON.parse(raw));
    } catch (e) {
      // ignore
    }
  }, []);

  // load saved sound preferences
  useEffect(() => {
    try {
      const s = localStorage.getItem("sierra_schedule_sound");
      const m = localStorage.getItem("sierra_manual_sound");
      if (s) setScheduleSound(s);
      if (m) setManualSound(m);
    } catch (e) {}
  }, []);

  // persist sound preferences
  useEffect(() => {
    try {
      localStorage.setItem("sierra_schedule_sound", scheduleSound);
      localStorage.setItem("sierra_manual_sound", manualSound);
    } catch (e) {}
  }, [scheduleSound, manualSound]);

  // compute whether current time falls into the day's schedule window
  useEffect(() => {
    const periods = buildDaySchedule(selectedDay, scheduleMode, lunchMode);
    if (!periods || periods.length === 0) {
      setInSession(false);
      setSyncToClock(false);
      return;
    }
    const firstStart = periods[0].start;
    const lastEnd = periods[periods.length - 1].end;
    // Treat the entire calendar day of the schedule as "in session"
    // so the clock can start before school (from midnight onward) and
    // extend slightly after the last block for the after-school window.
    const dayStart = new Date(firstStart);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(firstStart);
    dayEnd.setHours(15, 15, 0, 0); // 3:15 PM
    const nowIn = now >= dayStart && now < dayEnd;
    setInSession(nowIn);
    // don't allow enabling sync outside of school hours; if outside, force it off
    if (!nowIn && syncToClock) setSyncToClock(false);
  }, [now, selectedDay, scheduleMode, lunchMode]);

  // when synced to device time, auto-select monday/wednesday/standard based on weekday
  useEffect(() => {
    if (!syncToClock) return;
    const today = new Date(now);
    const dow = today.getDay(); // 0 = Sunday, 1 = Monday, ...
    if (dow === 1) setScheduleMode("monday");
    else if (dow === 3) setScheduleMode("wednesday");
    else setScheduleMode("standard");
  }, [syncToClock, now]);

  // auto-hide toast after a short time
  useEffect(() => {
    if (!toast.visible) return;
    const t = setTimeout(
      () => setToast((s) => ({ ...s, visible: false })),
      2800,
    );
    return () => clearTimeout(t);
  }, [toast.visible]);

  return (
    <div className="app">
      <div className="top-controls">
        <button
          className="sidebar-toggle"
          onClick={() => setSidebarCollapsed((s) => !s)}
          aria-label={sidebarCollapsed ? "Open settings" : "Close settings"}
        >
          {sidebarCollapsed ? "Open settings" : "Close settings"}
        </button>
        <button
          className="schedule-toggle"
          onClick={() => setScheduleCollapsed((s) => !s)}
          aria-label={scheduleCollapsed ? "Show schedule" : "Hide schedule"}
        >
          {scheduleCollapsed ? "Show schedule" : "Hide schedule"}
        </button>
      </div>

      <div className="main">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 8,
          }}
        >
          <h2 style={{ margin: 0 }}>
            Day {selectedDay} • {scheduleMode}
          </h2>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div className="muted">
              Choose a day or a block to jump; manual timer accepts MM:SS or
              HH:MM:SS
            </div>
          </div>
        </div>

        <div className="content">
          <div style={{ width: "100%" }}>
            {modeView === "schedule" && (
              <ScheduleTimer
                day={selectedDay}
                mode={scheduleMode}
                syncToClock={syncToClock}
                onPeriodEnd={handlePeriodEnd}
                classMap={classMap}
                lunchMode={lunchMode}
                showList={!scheduleCollapsed}
              />
            )}
            {modeView === "manual" && (
              <ManualTimer
                onFinish={() => handleManualFinish("Manual Timer")}
              />
            )}
          </div>

          {/* settings panel shown below the schedule when open */}
          {!sidebarCollapsed && (
            <div className="settings-panel" style={{ marginTop: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div className="muted">Settings</div>
              </div>

              <div style={{ marginTop: 8 }}>
                <div className="muted">Mode</div>
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    marginTop: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    className={
                      "mode-btn" + (modeView === "schedule" ? " active" : "")
                    }
                    onClick={() => setModeView("schedule")}
                  >
                    Schedule
                  </button>
                  <button
                    className={
                      "mode-btn" + (modeView === "manual" ? " active" : "")
                    }
                    onClick={() => setModeView("manual")}
                  >
                    Manual
                  </button>
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                <div className="muted">Schedule Sync</div>
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                    marginTop: 8,
                  }}
                >
                  <label
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <input
                      type="checkbox"
                      checked={syncToClock}
                      disabled={!inSession}
                      onChange={(e) =>
                        inSession && setSyncToClock(e.target.checked)
                      }
                    />
                    <span className="muted">Sync to device time</span>
                  </label>
                  {!inSession && (
                    <div className="muted" style={{ fontSize: 12 }}>
                      Sync disabled: outside school hours
                    </div>
                  )}
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                <div className="muted">Monday / Wednesday</div>
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    marginTop: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    className={
                      "mode-btn" +
                      (scheduleMode === "standard" ? " active" : "")
                    }
                    onClick={() => setScheduleMode("standard")}
                  >
                    Standard
                  </button>
                  <button
                    className={
                      "mode-btn" + (scheduleMode === "monday" ? " active" : "")
                    }
                    onClick={() => setScheduleMode("monday")}
                  >
                    Monday
                  </button>
                  <button
                    className={
                      "mode-btn" +
                      (scheduleMode === "wednesday" ? " active" : "")
                    }
                    onClick={() => setScheduleMode("wednesday")}
                  >
                    Wednesday
                  </button>
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                <div className="muted">Lunch</div>
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    marginTop: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    className={
                      "mode-btn" + (lunchMode === "lunch1" ? " active" : "")
                    }
                    onClick={() => setLunchMode("lunch1")}
                  >
                    Lunch 1
                  </button>
                  <button
                    className={
                      "mode-btn" + (lunchMode === "lunch2" ? " active" : "")
                    }
                    onClick={() => setLunchMode("lunch2")}
                  >
                    Lunch 2
                  </button>
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div className="muted">Classes</div>
                  <button
                    className="mode-btn"
                    onClick={() => setShowClassEditor((s) => !s)}
                  >
                    {showClassEditor ? "Done" : "Edit classes"}
                  </button>
                </div>
                {showClassEditor && (
                  <ClassEditor
                    initialMap={classMap}
                    onSave={(m) => {
                      setClassMap(m);
                      setShowClassEditor(false);
                      setToast({ message: "Class names saved", visible: true });
                    }}
                    onCancel={() => setShowClassEditor(false)}
                  />
                )}
              </div>

              <div style={{ marginTop: 12 }}>
                <div className="muted">Sounds</div>
                <div
                  style={{
                    display: "flex",
                    gap: 12,
                    marginTop: 8,
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <label
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      minWidth: 180,
                    }}
                  >
                    <span className="muted">Schedule sound</span>
                    <select
                      value={scheduleSound}
                      onChange={(e) => setScheduleSound(e.target.value)}
                      className="mode-btn"
                    >
                      <option value="none">None</option>
                      <option value="beep">Beep</option>
                      <option value="chime">Chime</option>
                      <option value="bell">Bell</option>
                      <option value="gong">Gong</option>
                    </select>
                  </label>

                  <label
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      minWidth: 180,
                    }}
                  >
                    <span className="muted">Manual timer sound</span>
                    <select
                      value={manualSound}
                      onChange={(e) => setManualSound(e.target.value)}
                      className="mode-btn"
                    >
                      <option value="none">None</option>
                      <option value="beep">Beep</option>
                      <option value="chime">Chime</option>
                      <option value="bell">Bell</option>
                      <option value="gong">Gong</option>
                    </select>
                  </label>
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                <div className="muted">Days</div>
                <div style={{ marginTop: 8 }}>
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((d) => (
                    <button
                      key={d}
                      onClick={() => {
                        setSelectedDay(d);
                        setModeView("schedule");
                      }}
                      className={
                        "day-btn" + (selectedDay === d ? " active" : "")
                      }
                    >
                      Day {d}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* large overlay notification when timers end */}
      {notification.visible && (
        <div
          className="overlay"
          onClick={() => setNotification((n) => ({ ...n, visible: false }))}
        >
          <div className="overlay-content" role="dialog" aria-live="assertive">
            <div className="overlay-title">{notification.title}</div>
            {notification.subtitle && (
              <div className="overlay-subtitle">{notification.subtitle}</div>
            )}
            <button
              className="overlay-close"
              onClick={(e) => {
                e.stopPropagation();
                setNotification((n) => ({ ...n, visible: false }));
              }}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
      {/* small toast */}
      {toast.visible && (
        <div className="toast" role="status" aria-live="polite">
          {toast.message}
        </div>
      )}
    </div>
  );
}
