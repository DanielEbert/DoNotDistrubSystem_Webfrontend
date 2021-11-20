// Daniel Ebert (65926)

// Returns a string that displays the current time and date.
// Example return value: "Sunday, Aug 1, 2021, 06:44 PM"
export function timestamp() {
  const date = new Date();
  const options = {
    weekday: "long",
    month: "short",
    year: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  };

  return date.toLocaleTimeString("en", options);
}

// Returns the epoch time, i.e. the number of seconds since 1.1.1970.
// Return type is number.
export function epoch_time() {
  const time = new Date();
  // 'time' is in milliseconds.
  return Math.round(time.getTime() / 1000);
}
