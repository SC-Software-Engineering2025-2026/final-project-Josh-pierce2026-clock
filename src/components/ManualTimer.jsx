import React, { useEffect, useState, useRef } from "react";

export default function ManualTimer({ onFinish }) {
  const [input, setInput] = useState("00:01:00");
  const [remaining, setRemaining] = useState(0);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef(null);
  const [now, setNow] = useState(new Date());

  function parseInput(str) {
    // accept HH:MM:SS or MM:SS or minutes number
    if (str.includes(":")) {
      const parts = str.split(":").map(Number).reverse();
      let sec = 0;
      if (parts[0]) sec += parts[0];
      if (parts[1]) sec += parts[1] * 60;
      if (parts[2]) sec += parts[2] * 3600;
      return sec;
    }
    const n = Number(str);
    if (Number.isFinite(n)) return Math.floor(n * 60);
    return 0;
  }

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setRemaining((r) => {
          if (r <= 1) {
            clearInterval(intervalRef.current);
            setRunning(false);
            // notify parent that manual timer finished
            try {
              onFinish && onFinish({ name: "Manual Timer" });
            } catch (e) {
              // swallow errors from caller
            }
            return 0;
          }
          return r - 1;
        });
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [running]);

  // live clock for showing current time under the big countdown
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  function start() {
    const sec = parseInput(input);
    setRemaining(sec);
    setRunning(true);
  }

  function formatSeconds(sec) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0)
      return `${h.toString().padStart(2, "0")}:${m
        .toString()
        .padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }

  return (
    <div>
      <div className="panel">
        <div className="muted">Manual Timer</div>
        <div
          style={{
            display: "flex",
            gap: 8,
            marginTop: 8,
            alignItems: "center",
          }}
        >
          {/* editable dropdown via datalist: shows presets but allows typing numbers */}
          <input
            list="presetTimes"
            aria-label="Manual timer input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            style={{
              padding: 8,
              borderRadius: 6,
              background: "#071029",
              color: "#e6eef7",
              border: "1px solid #123",
              minWidth: 160,
            }}
            placeholder="MM:SS or HH:MM:SS or minutes"
          />
          <datalist id="presetTimes">
            <option value="00:00:10">10 seconds</option>
            <option value="00:00:30">30 seconds</option>
            <option value="00:01:00">1 minute</option>
            <option value="00:05:00">5 minutes</option>
            <option value="00:10:00">10 minutes</option>
            <option value="00:15:00">15 minutes</option>
            <option value="00:30:00">30 minutes</option>
            <option value="01:00:00">1 hour</option>
          </datalist>
          <button className="mode-btn" onClick={start}>
            Start
          </button>
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
        {remaining === 0 && !running && (
          <div className="muted">Time is up!</div>
        )}
      </div>
    </div>
  );
}
