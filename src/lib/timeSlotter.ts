import { SubTask } from "../types";

export interface SlotResult {
  subtasks: SubTask[];
  totalPlannedMinutes: number;
  windowMinutes: number;
  overflowMinutes: number;
}

/**
 * Slots the given subtasks consecutively inside the specified start and end time window.
 * If the sum of subtask durations exceeds the window length, their slotted durations
 * are compressed proportionally to fit within the window perfectly.
 */
export function slotSubtasksInWindow(
  subtasks: SubTask[],
  startTimeStr: string,
  endTimeStr: string
): SlotResult {
  if (!startTimeStr || !endTimeStr) {
    return {
      subtasks,
      totalPlannedMinutes: subtasks.reduce((sum, st) => sum + st.durationMinutes, 0),
      windowMinutes: 0,
      overflowMinutes: 0
    };
  }

  const start = new Date(startTimeStr);
  const end = new Date(endTimeStr);

  const windowMinutes = Math.max(
    0,
    Math.floor((end.getTime() - start.getTime()) / (1000 * 60))
  );

  const totalPlannedMinutes = subtasks.reduce(
    (sum, st) => sum + st.durationMinutes,
    0
  );

  const overflowMinutes = Math.max(0, totalPlannedMinutes - windowMinutes);

  // Determine if compression is needed
  const needsCompression = totalPlannedMinutes > windowMinutes && windowMinutes > 0;
  const scaleFactor = needsCompression ? windowMinutes / totalPlannedMinutes : 1;

  let currentStart = new Date(start);

  const slottedSubtasks = subtasks.map((st) => {
    const duration = needsCompression
      ? st.durationMinutes * scaleFactor
      : st.durationMinutes;

    const subtaskStart = new Date(currentStart);
    const subtaskEnd = new Date(currentStart.getTime() + duration * 60 * 1000);

    // Update currentStart for the next subtask
    currentStart = subtaskEnd;

    return {
      ...st,
      startTime: subtaskStart.toISOString(),
      endTime: subtaskEnd.toISOString()
    };
  });

  return {
    subtasks: slottedSubtasks,
    totalPlannedMinutes,
    windowMinutes,
    overflowMinutes
  };
}
