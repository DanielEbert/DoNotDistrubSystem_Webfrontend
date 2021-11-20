// Daniel Ebert (65926)

// The backend uses 'task' to specify a device type (e.g. shelly or alexa).
// We use 'Type of Device' to specify a device type.
// The backend uses different strings to specify device types.
// The following two functions covert between 'task' and 'Type of Device'.
// Both 'type_of_device' and the return value is a string.
// Returns null if the 'type_of_device' is unknown.
export function type_of_device_to_task(type_of_device) {
  let task = null;
  switch (type_of_device) {
    case "Button and LED":
      task = "both";
      break;
    case "LED":
      task = "led";
      break;
    case "Button":
      task = "button";
      break;
    case "Shelly":
      task = "shelly";
      break;
    case "Alexa":
      task = "alexa";
      break;
    default:
      task = null;
  }
  return task;
}

// See docs for the function 'type_of_device_to_task' above.
// Returns null if the 'task' is unknown.
export function task_to_type_of_device(task) {
  let type_of_device = null;
  switch (task) {
    case "both":
      type_of_device = "Button and LED";
      break;
    case "led":
      type_of_device = "LED";
      break;
    case "button":
      type_of_device = "Button";
      break;
    case "shelly":
      type_of_device = "Shelly";
      break;
    case "alexa":
      type_of_device = "Alexa";
      break;
    default:
      type_of_device = null;
  }
  return type_of_device;
}
