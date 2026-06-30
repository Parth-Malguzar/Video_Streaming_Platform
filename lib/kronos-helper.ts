/**
 * Kronos Helper - Time & Scheduling utilities for DTube
 */

/**
 * Returns a relative time string (e.g., "3 hours ago", "just now")
 */
export function getRelativeTime(dateInput: Date | string | number): string {
  const date = new Date(dateInput);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 0) {
    return "in the future";
  }
  if (seconds < 10) {
    return "just now";
  }

  const intervals = [
    { label: "year", seconds: 31536000 },
    { label: "month", seconds: 2592000 },
    { label: "day", seconds: 864000 },
    { label: "hour", seconds: 3600 },
    { label: "minute", seconds: 60 },
  ];

  for (const interval of intervals) {
    const count = Math.floor(seconds / interval.seconds);
    if (count >= 1) {
      return `${count} ${interval.label}${count > 1 ? "s" : ""} ago`;
    }
  }

  return `${seconds} second${seconds > 1 ? "s" : ""} ago`;
}

/**
 * Formats seconds into a video duration string (e.g., "3:05", "1:23:45")
 */
export function formatDuration(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return "0:00";

  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const formattedMins = hrs > 0 ? String(mins).padStart(2, "0") : String(mins);
  const formattedSecs = String(secs).padStart(2, "0");

  if (hrs > 0) {
    return `${hrs}:${formattedMins}:${formattedSecs}`;
  }
  return `${formattedMins}:${formattedSecs}`;
}

/**
 * Checks if a scheduled premiere is active (meaning current time is past or equal to the schedule time)
 */
export function isPremiereActive(scheduledFor: Date | string | null): boolean {
  if (!scheduledFor) return false;
  const scheduleDate = new Date(scheduledFor);
  const now = new Date();
  return now.getTime() >= scheduleDate.getTime();
}

/**
 * Formats a scheduled date into a readable string for display (e.g., "June 30, 2026 at 2:30 PM")
 */
export function formatScheduleDate(dateInput: Date | string): string {
  const date = new Date(dateInput);
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}
