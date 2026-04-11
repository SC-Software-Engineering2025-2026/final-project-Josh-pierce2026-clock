// schedule utilities: build periods with start/end times for a given day and mode

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60000);
}

// block rotations per day (A-H)
const rotations = {
  1: ["A", "B", "C", "D", "E", "F"],
  2: ["G", "H", "A", "B", "C", "D"],
  3: ["E", "F", "G", "H", "A", "B"],
  4: ["C", "D", "E", "F", "G", "H"],
  5: ["B", "A", "D", "C", "F", "E"],
  6: ["H", "G", "B", "A", "D", "C"],
  7: ["F", "E", "H", "G", "B", "A"],
  8: ["D", "C", "F", "E", "H", "G"],
};

// Build schedule: returns array of periods {type: 'block'|'passing'|'lab'|'lunch', name, start, end}
// mode: 'standard' | 'monday' | 'wednesday'
// lunchMode: 'lunch1' | 'lunch2' (default). Lunch 2 matches the original
// behavior (lunch after 4th block). Lunch 1 moves lunch to follow block 3
// on standard days with a fixed 11:30–12:10 window and a passing period
// until 12:15.
export function buildDaySchedule(
  dayNumber,
  mode = "standard",
  lunchMode = "lunch2",
) {
  let blocks;
  if (dayNumber === 0) {
    // Day 0: numbered periods instead of lettered blocks
    blocks = [
      "Period 1",
      "Period 2",
      "Period 3",
      "Period 4",
      "Period 5",
      "Period 6",
    ];
  } else {
    blocks = rotations[dayNumber] || rotations[1];
  }
  // start at 8:30
  const start = new Date();
  start.setHours(8, 30, 0, 0);

  let cursor = new Date(start);
  const periods = [];

  // helper to push block
  function pushBlock(name, durationMin) {
    const s = new Date(cursor);
    const e = addMinutes(s, durationMin);
    periods.push({ type: "block", name, start: s, end: e });
    cursor = new Date(e);
  }

  // helper to push passing
  function pushPassing(min = 5) {
    const s = new Date(cursor);
    const e = addMinutes(s, min);
    periods.push({ type: "passing", name: "Passing", start: s, end: e });
    cursor = new Date(e);
  }

  // decide durations based on mode
  let blockDur = 50;
  // Standard lab should end at 10:35 when starting at 10:15,
  // so its duration is 20 minutes by default. Mode overrides
  // below adjust this for Monday/Wednesday.
  let labDur = 20;
  let labName = "Lab";
  let passingMin = 5;

  if (mode === "monday") {
    // Morning Meeting should end at 10:40 on Monday; with
    // a 10:15 start this is a 25 minute duration.
    labDur = 25;
    labName = "Morning Meeting";
    passingMin = 5;
  }
  if (mode === "wednesday") {
    // blocks are 45, lab 45 and has passing on both ends
    blockDur = 45;
    labDur = 45;
    labName = "Morning Meeting";
    // keep standard passing
    passingMin = 5;
  }

  // Special-case: Monday schedule with Lunch 1 variant. We follow the
  // normal Monday structure up through block 3, then insert:
  //  - Lunch 11:35–12:15 (40 minutes)
  //  - Passing 12:15–12:20
  //  - Block 4: 12:20–1:10 (50 minutes)
  //  - Passing 1:10–1:15
  //  - Block 5: 1:15–2:05 (50 minutes)
  //  - Passing 2:05–2:10
  //  - Block 6: 2:10–2:55 (45 minutes)
  if (mode === "monday" && lunchMode === "lunch1") {
    cursor = new Date(start);

    // Block 1: 8:30–9:20, then passing 9:20–9:25
    pushBlock(blocks[0], blockDur);
    pushPassing(passingMin);

    // Block 2: 9:25–10:15
    pushBlock(blocks[1], blockDur);

    // Morning Meeting (lab): 10:15–10:40, then passing 10:40–10:45
    const labStart = new Date(cursor);
    const labEnd = addMinutes(labStart, labDur);
    periods.push({ type: "lab", name: labName, start: labStart, end: labEnd });
    cursor = new Date(labEnd);
    pushPassing(passingMin);

    // Block 3: 10:45–11:35
    pushBlock(blocks[2], blockDur);

    // Lunch 1: 11:35–12:15 (40 minutes)
    const lunchStart = new Date(cursor);
    const lunchEnd = addMinutes(lunchStart, 40);
    periods.push({
      type: "lunch",
      name: "Lunch",
      start: lunchStart,
      end: lunchEnd,
    });
    cursor = new Date(lunchEnd);

    // Passing: 12:15–12:20
    pushPassing(passingMin);

    // Block 4: 12:20–1:10
    pushBlock(blocks[3], blockDur);
    // Passing: 1:10–1:15
    pushPassing(passingMin);

    // Block 5: 1:15–2:05
    pushBlock(blocks[4], blockDur);
    // Passing: 2:05–2:10
    pushPassing(passingMin);

    // Block 6 (shortened Monday block): 2:10–2:55
    pushBlock(blocks[5], 45);

    return periods;
  }

  // Special-case: Wednesday schedule with Lunch 1 variant. Based on a
  // start time of 8:30 and 45-minute blocks/lab, we construct:
  //  - Block 1: 8:30–9:15, Passing 9:15–9:20
  //  - Block 2: 9:20–10:05
  //  - Passing 10:05–10:10, Lab 10:10–10:55, Passing 10:55–11:00
  //  - Block 3: 11:00–11:45
  //  - Lunch 1: 11:45–12:25 (40 minutes)
  //  - Passing 12:25–12:30
  //  - Block 4: 12:30–1:15
  //  - Passing 1:15–1:20
  //  - Block 5: 1:20–2:05
  //  - Passing 2:05–2:10
  //  - Block 6: 2:10–2:55
  if (mode === "wednesday" && lunchMode === "lunch1") {
    cursor = new Date(start);

    // Block 1: 8:30–9:15, then passing 9:15–9:20
    pushBlock(blocks[0], blockDur);
    pushPassing(passingMin);

    // Block 2: 9:20–10:05
    pushBlock(blocks[1], blockDur);

    // Morning Meeting (lab): 10:10–10:55 with passing before and after
    pushPassing(passingMin); // 10:05–10:10
    const wLabStart = new Date(cursor);
    const wLabEnd = addMinutes(wLabStart, labDur);
    periods.push({
      type: "lab",
      name: labName,
      start: wLabStart,
      end: wLabEnd,
    });
    cursor = new Date(wLabEnd);
    pushPassing(passingMin); // 10:55–11:00

    // Block 3: 11:00–11:45
    pushBlock(blocks[2], blockDur);

    // Lunch 1: 11:45–12:25 (40 minutes)
    const wLunchStart = new Date(cursor);
    const wLunchEnd = addMinutes(wLunchStart, 40);
    periods.push({
      type: "lunch",
      name: "Lunch",
      start: wLunchStart,
      end: wLunchEnd,
    });
    cursor = new Date(wLunchEnd);

    // Passing: 12:25–12:30
    pushPassing(passingMin);

    // Block 4: 12:30–1:15
    pushBlock(blocks[3], blockDur);
    // Passing: 1:15–1:20
    pushPassing(passingMin);

    // Block 5: 1:20–2:05
    pushBlock(blocks[4], blockDur);
    // Passing: 2:05–2:10
    pushPassing(passingMin);

    // Block 6: 2:10–2:55
    pushBlock(blocks[5], blockDur);

    return periods;
  }

  // Build day: 6 blocks with lab after 2nd, lunch after 4th (Lunch 2), or
  // lunch after 3rd for the Lunch 1 variant on standard days.
  for (let i = 0; i < blocks.length; i++) {
    // push block i
    // for last block on monday, make it 45 (shorter by 5)
    let dur = blockDur;
    if (mode === "monday" && i === blocks.length - 1) {
      dur = 45;
    }
    pushBlock(blocks[i], dur);

    // Lunch 1 variant (standard days only): after block 3 (index 2),
    // insert Lunch from 11:30–12:10 and a 5-minute passing until 12:15.
    if (mode === "standard" && lunchMode === "lunch1" && i === 2) {
      const sLunch = new Date(cursor);
      const eLunch = addMinutes(sLunch, 40); // 40 minutes: 11:30–12:10
      periods.push({
        type: "lunch",
        name: "Lunch",
        start: sLunch,
        end: eLunch,
      });
      cursor = new Date(eLunch);
      // Passing from 12:10–12:15 before the next block begins.
      pushPassing(passingMin);
      // Skip default lab/lunch/pass handling for this iteration; the
      // remainder of the loop only adds passing after blocks.
      continue;
    }

    // after block 2 (index 1) push lab
    if (i === 1) {
      if (mode === "wednesday") {
        // wednesday: passing before and after lab
        pushPassing(passingMin);
        const s = new Date(cursor);
        const e = addMinutes(s, labDur);
        periods.push({ type: "lab", name: labName, start: s, end: e });
        cursor = new Date(e);
        pushPassing(passingMin);
      } else if (mode === "monday") {
        // monday: lab (Morning Meeting) with a passing period after
        const s = new Date(cursor);
        const e = addMinutes(s, labDur);
        periods.push({ type: "lab", name: labName, start: s, end: e });
        cursor = new Date(e);
        // 5-minute passing after Morning Meeting before the next class
        pushPassing(passingMin);
      } else {
        // standard: lab with a passing period after
        const s = new Date(cursor);
        const e = addMinutes(s, labDur);
        periods.push({ type: "lab", name: labName, start: s, end: e });
        cursor = new Date(e);
        // 5-minute passing after Lab before the next class
        pushPassing(passingMin);
      }
    } else if (i === 3 && lunchMode !== "lunch1") {
      // Lunch 2: lunch after 4th block. For the standard
      // schedule, lunch is 40 minutes (ending at 1:05 PM)
      // followed by a 5-minute passing period so period 5
      // begins at 1:10 PM. Other modes keep the original
      // 45-minute lunch with no extra passing here.
      const s = new Date(cursor);
      const lunchMinutes = mode === "standard" ? 40 : 45;
      const e = addMinutes(s, lunchMinutes);
      periods.push({ type: "lunch", name: "Lunch", start: s, end: e });
      cursor = new Date(e);
      // Only standard-mode Lunch 2 gets a passing period
      // after lunch (period 5 starts after this passing).
      if (mode === "standard" && i !== blocks.length - 1) {
        pushPassing(passingMin);
      }
    }

    // after each block except after lab and lunch endpoints, add passing
    if (i !== blocks.length - 1) {
      // but if lab or lunch was added immediately after, we don't add
      // an extra passing here (lab/lunch branches above already handled it)
      if (i === 1 || i === 3) {
        // already handled
      } else {
        pushPassing(passingMin);
      }
    }
  }

  return periods;
}

// helper to format time hh:mm
export function formatTime(date) {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
