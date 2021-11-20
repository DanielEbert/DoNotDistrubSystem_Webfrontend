// Daniel Ebert (65926)

import { useState } from "react";
import { generate_signature, signature_timestamp } from "../auth/signature";
import { timestamp } from "../util";
import { useHistory } from "react-router-dom";
import { type_of_device_to_task } from "./util";

// AddDevice displays a form to enter a device type (i.e. either AALeC, Shelly,
// or Alexa), a device ID, and optionally a description. If the user submits
// this form, the device with the submitted deviceID is registered under the
// logged in user.
export function AddDevice({ userID, private_key, mqtt_publish_message }) {
  // 'deviceID', 'type_of_device', and 'description' store the values that the
  // user enters into the HTML form.
  const [deviceID, set_device_ID] = useState("");
  const [type_of_device, set_type_of_device] = useState("LED");
  const [description, set_description] = useState("");

  // failure_text stores the error text if the form validation fails, for
  // example because of an invalid deviceID.
  const [failure_text, set_failure_text] = useState(null);
  const history = useHistory();

  const on_submit = () => {
    // Validate form fields. Note that even if this validation succeeds,
    // adding the device may still fail because e.g. a device with this
    // 'deviceID' is already registered. This validation does not catch all
    // mistakes.
    let id = deviceID.trim();
    if (id.length === 0) {
      set_failure_text("Device ID Field must not be empty.");
      return;
    }

    if (type_of_device === "Alexa" && id.length !== 6) {
      set_failure_text("The Alexa Code must have a length of 6 digits.");
      return;
    }

    // The 'type_of_device' is called 'task' in the backend. In addition, the
    // backend uses different strings to specify device types.
    // Convert the 'type_of_device' string to what the backend expects in
    // 'task'.
    let task = type_of_device_to_task(type_of_device);
    if (task === null) {
      set_failure_text("Unknown Type of Device", type_of_device);
      return;
    }

    // The '<description>' field of the MQTT message that is sent to the backend
    // is a serialized JSON dictionary. This dictionary has two keys, for
    // example:
    // {
    //    userDescription: "Device in living room.",
    //    registrationTimestamp: "Sunday, Aug 1, 2021, 06:44 PM"
    // }
    const device_description = {
      userDescription: description,
      registrationTimestamp: timestamp(),
    };
    const device_description_string = JSON.stringify(device_description);

    const sig_timestamp = signature_timestamp();

    // MQTT messages to register a device must include a signature so that the
    // backend server can ensure that only the user (who is in possession of
    // the private key 'private_key') can register devices for his user. In
    // other words, the signature ensures that user A cannot register a device
    // for user B. The timestamp that is included in the message and
    // signature computation ensures that the message is idempotent and cannot
    // be replayed later.
    // The signature is computed over the message_concatenated string.
    let message_concatenated = null;

    if (task === "alexa") {
      // message_concatenated does not include 'task' if task is 'alexa'
      message_concatenated =
        userID.trim() +
        deviceID.trim() +
        device_description_string +
        sig_timestamp;
    } else {
      // otherwise, also include 'task'.
      message_concatenated =
        userID.trim() +
        deviceID.trim() +
        task +
        device_description_string +
        sig_timestamp;
    }
    const signature = generate_signature(message_concatenated, private_key);

    let mqtt_message = null;
    if (task === "alexa") {
      // for alexas, the 'key' for deviceId is 'code'
      mqtt_message = {
        body: {
          userID: userID.trim(),
          code: deviceID.trim(),
          task: task,
          description: device_description_string,
          timestamp: sig_timestamp,
        },
        signature: signature,
      };
    } else {
      mqtt_message = {
        body: {
          userID: userID.trim(),
          deviceID: deviceID.trim(),
          task: task,
          description: device_description_string,
          timestamp: sig_timestamp,
        },
        signature: signature,
      };
    }

    // If the task is 'alexa', the backend expects the register message
    // via the topic 'webfrontend/alexa/register'.
    const topic =
      task === "alexa"
        ? "webfrontend/alexa/register"
        : "webfrontend/device/register";

    mqtt_publish_message(topic, JSON.stringify(mqtt_message));

    set_failure_text(null);

    // Redirect to the Devices List.
    history.push("/devices");
  };

  // Redirect to login page if the user is not logged in.
  if (userID === null) {
    history.push("/login");
  }

  return (
    <div
      className="m-auto flex flex-col bg-gray-400 bg-opacity-10 border 
               border-gray-600 border-opacity-80 rounded-3xl p-4 pt-8 w-1/2 
                 shadow">
      <h1
        className="text-5xl font-extrabold text-center pb-4 mb-4 border-b-2
                     text-gray-800">
        Add Device
      </h1>
      {
        // Print failure_text if the form validation for adding a device failed.
        failure_text && (
          <div className="text-center text-4xl text-red-600 px-10 py-5">
            {failure_text}
          </div>
        )
      }
      <div className="flex px-4 py-3 flex-col">
        <label className="text-3xl pt-4 pb-2" htmlFor="type_of_device">
          Type of Device
        </label>
        <select
          value={type_of_device}
          onChange={(e) => set_type_of_device(e.target.value)}
          className="border border-gray-300 rounded-lg bg-white 
                       focus:outline-none focus:ring-2  focus:ring-blue-500
                       text-3xl px-2 pt-2">
          <option value="LED">LED</option>
          <option value="Button">Button</option>
          <option value="Button and LED">Button and LED</option>
          <option value="Shelly">Shelly</option>
          <option value="Alexa">Alexa</option>
        </select>

        <label className="text-3xl pt-10 pb-2" htmlFor="password">
          {type_of_device === "Alexa" ? "Alexa Code" : "Device ID"}
        </label>
        <input
          id="type_of_device"
          type="text"
          className="border border-gray-300 rounded-lg bg-white 
                       focus:outline-none focus:ring-2  focus:ring-blue-500
                       text-3xl px-2 pt-2 pb-2"
          onChange={(e) => set_device_ID(e.target.value)}></input>

        <label className="text-3xl pt-10" htmlFor="password">
          Description (Optional)
        </label>
        <label className="text-xl pt-1 pb-2" htmlFor="password">
          You can optionally add a short description for this device so that you
          can later distinguish between the individual devices. <br />
          Example: Device in living room.
        </label>
        <textarea
          value={description}
          onChange={(e) => set_description(e.target.value)}></textarea>

        <button
          className="mt-12 h-12 rounded-full bg-blue-500 bg-opacity-50 
                     text-3xl font-bold hover:bg-opacity-80 transition shadow"
          onClick={on_submit}>
          Submit
        </button>
      </div>
    </div>
  );
}
