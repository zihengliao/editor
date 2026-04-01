export function formatClockTime(totalMilliseconds: number): string {
  const safeMilliseconds = Math.max(0, Math.floor(totalMilliseconds));
  const totalSeconds = Math.floor(safeMilliseconds / 1000);

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const milliseconds = safeMilliseconds % 1000;

  if (hours > 0) {
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}.${Math.floor(
      milliseconds / 10,
    )
      .toString()
      .padStart(2, "0")}`;
  }

  return `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}.${Math.floor(milliseconds / 10)
    .toString()
    .padStart(2, "0")}`;
}

export function clampNumber(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
