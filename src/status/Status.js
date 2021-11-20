// Daniel Ebert (65926)

import clsx from "clsx";
import { useEffect, useState } from "react";
import { useHistory } from "react-router";

// The Status component displays the do not disturb status of the logged in user
// and a button to change this status.
export function Status({ userID, status, devices, mqtt_publish_message }) {
  // DeviceID of the dummy device that is registed under the logged in user.
  const [dummy_deviceID, set_dummy_deviceID] = useState(null);

  const history = useHistory();

  // In the list of devices that are registed under the logged in user, find
  // the deviceID of the dummy device.
  useEffect(() => {
    devices.forEach((device) => {
      // Dummy devices have a 'is_dummy' key in the device['description']
      // dictionary.
      if ("is_dummy" in device["description"]) {
        set_dummy_deviceID(device["deviceID"].toString());
      }
    });
  }, [devices]);

  // Toggle the do not disturb status.
  const on_switch_status = () => {
    const topic = "device/" + dummy_deviceID + "/update";
    mqtt_publish_message(topic, "");
  };

  // Redirect to login page if the user is not logged in.
  if (userID === null) {
    history.push("/login");
  }

  return (
    <div className="flex flex-col m-auto space-y-10">
      <h1 className="text-4xl font-bold text-center text-gray-800">
        Do Not Disturb is currently set to
      </h1>
      <h1
        className={clsx(
          "text-8xl font-bold text-center pb-6",
          status ? "text-red-500" : "text-green-400"
        )}>
        {status ? "True" : "False"}
      </h1>
      <button
        className="h-12 rounded-full bg-blue-500 bg-opacity-50 text-xl 
                   font-bold hover:bg-opacity-80 transition shadow
                   text-gray-900 active:bg-opacity-100 w-4/5 self-center"
        onClick={on_switch_status}>
        Switch Status
      </button>
    </div>
  );
}
