// Daniel Ebert (65926)

import { useState, useEffect } from "react";
import { CubeIcon } from "@heroicons/react/outline";
import clsx from "clsx";
import { useHistory } from "react-router";
import { task_to_type_of_device } from "./util";
import { generate_signature, signature_timestamp } from "../auth/signature";
import shelly from "../img/shelly.png";
import alexa from "../img/alexa.png";
import aalec from "../img/aalec.png";
import { epoch_time } from "../util";

// Lists all devices (aalecs, shellies, alexas) that are registed under the
// logged in user (i.e. the user with user ID 'userID').
// Via this Devices component, the user can also unregister devices.
export function Devices({
  devices,
  shellies_status,
  shellies_power,
  userID,
  private_key,
  mqtt_publish_message,
}) {
  // Index into the 'devices' list that specifies which element in the
  // 'devices' list is currently selected. selected_device is 'null' if no
  //  element in devices is currently selected.
  const [selected_device, set_selected_device] = useState(null);

  let history = useHistory();

  // Return the image that displays the 'task'.
  // The returned image may be used in <img> elements.
  const task_to_image = (task) => {
    let img = null;
    switch (task) {
      case "both":
      case "button":
      case "led":
        img = aalec;
        break;
      case "shelly":
        img = shelly;
        break;
      case "alexa":
        img = alexa;
        break;
      default:
        console.error(
          "Unknown device task",
          task,
          "in",
          devices[selected_device]
        );
        break;
    }
    return img;
  };

  // Send a MQTT message with the topic webfrontend/device/unregister	to the
  // MQTT broker. The message body specifies the device that the user has
  // currently selected.
  // Called when the 'Unregister Device' button is pressed.
  const on_unregister = () => {
    const device = devices[selected_device];
    const timestamp = signature_timestamp();

    // MQTT messages to unregister a device must include a signature so that the
    // backend server can ensure that only the user (who is in possession of
    // the private key 'private_key') can unregister devices for his user. In
    // other words, the signature ensures that user A cannot unregister a
    // device for user B. The timestamp that is included in the message and
    // signature computation ensures that the message is idempotent and cannot
    // be replayed later.
    // The signature is computed over the message_concatenated string.
    let message_concatenated =
      userID.trim() + device["deviceID"].toString() + device["task"].trim();
    const signature = generate_signature(message_concatenated, private_key);

    const mqtt_message = {
      body: {
        userID: userID.trim(),
        deviceID: device["deviceID"].toString(),
        task: device["task"].trim(),
        timestamp: timestamp,
      },
      signature: signature,
    };

    const topic = "webfrontend/device/unregister";
    mqtt_publish_message(topic, JSON.stringify(mqtt_message));

    set_selected_device(null);
  };

  // If the currently selected shelly is turned on, return its power
  // consumption.
  // Shellies send their power consumption via the MQTT message with topic
  // shellies/<shellyID>/relay/0/power. This information is stored in the
  // shellies_power dictionary.
  // This information may not be up to date**. The shelly might have been:
  // (1) turned off via the MQTT topic shellies/<shellyID>/relay/0 or
  // (2) the shelly could've been unplugged by the user.
  // For (1), we track shellies/<shellyID>/relay/0 messages via the
  // shellies_status dictionary.
  // For (2), we track when shellies/<shellyID>/relay/0/power have arrived. If
  // for a given shelly no new shellies/<shellyID>/relay/0/power has arrived
  // in the last 120 seconds, we assume that this shelly is unplugged (i.e.
  // turned off).
  // ** Because the shelly sends power updates only every minute or so, the
  //    power status is always out of date. In this case we mean the information
  //    is older than 120 seconds.
  const shelly_power_consumption_text = () => {
    // 'id' is the shellyID.
    const id = devices[selected_device]["deviceID"];
    if (!(id in shellies_power)) {
      return "Shelly Offline.";
    }

    if (id in shellies_status && shellies_status[id] !== "on") {
      return "Shelly Offline..";
    }

    const [power, message_timestamp] = shellies_power[id];
    const max_allowed_age = 120;
    if (message_timestamp + max_allowed_age < epoch_time()) {
      return "Shelly Offline...";
    }

    return power + " Watt";
  };

  // Rerender this component every 10 seconds to update the
  // shelly_power_consumption_text to check whether a shelly power message
  // is now older than 120 seconds (i.e. max_allowed_age).
  const [i, rerender] = useState(0); // eslint-disable-line no-unused-vars
  useEffect(() => {
    const interval = setInterval(() => {
      // ReactJS rerenders a component whenever this component's state changes.
      // We increment the counter i every 10 seconds so that ReactJS rerenders
      // this component.
      rerender((i) => {
        return i + 1;
      });
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // Redirect to login page if the user is not logged in.
  if (userID === null) {
    history.push("/login");
  }

  return (
    <div className="w-full pl-8 flex flex-row">
      <div className="flex flex-col w-1/5">
        <h1
          className="pt-28 pb-3 text-3xl font-extrabold text-gray-800 
                   text-left">
          Devices:
        </h1>
        <div className="space-y-3 flex flex-col">
          {devices.map((device, index) => {
            // Do not list dummy devices.
            if (!("is_dummy" in device["description"])) {
              return (
                <button
                  key={device["deviceID"]}
                  className={clsx(
                    "flex bg-gray-500 text-left transition hover:bg-opacity-20",
                    "rounded-lg px-6 py-2 text-2xl",
                    selected_device === index
                      ? "bg-opacity-20 border border-gray-600 border-opacity-80"
                      : "bg-opacity-10 border border-opacity-0"
                  )}
                  onClick={() => {
                    set_selected_device(index);
                  }}>
                  <div className="flex flex-col w-full my-1 space-y-1">
                    <div className="text-left">ID: {device["deviceID"]}</div>
                    <div className="text-right">
                      {task_to_type_of_device(device["task"])}
                    </div>
                  </div>
                </button>
              );
            } else {
              return <div key={index}></div>;
            }
          })}
        </div>
      </div>
      {selected_device === null && (
        <div className="flex flex-col mx-auto self-center items-center text-4xl">
          <CubeIcon className="w-1/3 pb-3" />
          No Device selected.
        </div>
      )}
      {selected_device !== null && selected_device < devices.length && (
        <div
          className="m-auto flex flex-col bg-gray-400 bg-opacity-10 border 
               border-gray-600 border-opacity-80 rounded-3xl p-4 pt-8 w-3/5
                 shadow space-y-10">
          <h1
            className="text-5xl font-extrabold text-left pl-4 pb-10 
                       text-gray-800">
            Device Information
          </h1>
          <img
            className="absolute self-end w-1/5 pt-10"
            src={task_to_image(devices[selected_device]["task"])}
            alt="Device"
          />
          <div>
            <div className="text-3xl text-gray-500">Device ID</div>
            <div className="text-3xl text-gray-900">
              {devices[selected_device]["deviceID"]}
            </div>
          </div>
          <div>
            <div className="text-3xl text-gray-500">Device Type</div>
            <div className="text-3xl text-gray-900">
              {task_to_type_of_device(devices[selected_device]["task"])}
            </div>
          </div>
          {devices[selected_device]["task"] === "shelly" && (
            <div>
              <div className="text-3xl text-gray-500">
                Current Power Consumption
              </div>
              <div className="text-3xl text-gray-900">
                {shelly_power_consumption_text()}
              </div>
            </div>
          )}
          <div>
            <div className="text-3xl text-gray-500">Registered on</div>
            <div className="text-3xl text-gray-900">
              {devices[selected_device]["description"]["registrationTimestamp"]}
            </div>
          </div>
          <div>
            <div className="text-3xl text-gray-500">Description</div>
            <div className="text-3xl text-gray-900">
              {devices[selected_device]["description"]["userDescription"] !== ""
                ? devices[selected_device]["description"]["userDescription"]
                : "No Description"}
            </div>
          </div>
          <div className="flex justify-end">
            <button
              className="h-12 w-1/3 rounded-full bg-red-500 bg-opacity-50 text-xl 
                         font-bold hover:bg-opacity-80 transition shadow"
              onClick={on_unregister}>
              Unregister Device
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
