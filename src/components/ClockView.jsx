import React, { useEffect, useState } from "react";

export default function ClockView() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 500);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="panel">
      <div className="muted">Current Time</div>
      <div className="clock-value" style={{ marginTop: 6 }}>
        {now.toLocaleTimeString()}
      </div>
      <div className="muted">{now.toLocaleDateString()}</div>
    </div>
  );
}
