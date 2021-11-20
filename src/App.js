// Daniel Ebert (65926)

import React, { createContext, useEffect, useRef, useState } from "react";
import mqtt from "mqtt";
import { BrowserRouter as Router, Route, Switch } from "react-router-dom";
import { Sidebar } from "./sidebar/Sidebar";
import { Login } from "./auth/Login";
import { Register } from "./auth/Register";
import { Settings } from "./Settings";
import { Status } from "./status/Status";
import { StatusHistory } from "./status/StatusHistory";
import { AddDevice } from "./device/AddDevice";
import { Devices } from "./device/Devices";
import {
  uint8array_to_string,
  signature_timestamp,
  generate_signature,
} from "./auth/signature";
import { timestamp, epoch_time } from "./util";

// Regular expressions for pattern matching on the topics of received MQTT
// messages.
// matches device/<deviceID>/status
const status_regex = new RegExp("^device/(.+)/status$");
// matches <userID>/listDevices
const list_devices_regex = new RegExp("^(.+)/listDevices$");
// matches shellies/<deviceID>/relay/0
const shelly_status_regex = new RegExp("^shellies/(.+)/relay/0$");
// matches shellies/<deviceID>/relay/0/power
const shelly_power_regex = new RegExp("^shellies/(.+)/relay/0/power$");

// SettingsContext stores pointers to the 'set_backend_URI' and
// 'set_mqtt_broker_URI' functions.
export const SettingsContext = createContext(null);

export default function App() {
  // userID of the user that is currently logged in. If no user is currently
  // logged in, userID is null. userID uniquely identifies a user.
  const [userID, set_user_ID] = useState(null);
  // private_key is used to digitally sign messages to register and unregister
  // devices. Every user owns one private_key and these private_keys are secret.
  // Only the user that owns the private_key and the server knows that
  // private_key.
  const [private_key, set_private_key] = useState(null);

  // Stores the URIs to the backend server and to the MQTT server. A user can
  // overwrite the default URIs via the Settings Page. The Settings page is
  // accessed via the button on the bottom of the sidebar. These two values are
  // stored to localStorage when the user closes the browser tab, and are loaded
  // when the user opens this webapp.
  const [backend_URI, set_backend_URI] = useState("http://127.0.0.1:80");
  // Note that the port must be for the protocol 'websockets'.
  const [mqtt_broker_URI, set_mqtt_broker_URI] = useState(
    "http://127.0.0.1:9001"
  );

  useEffect(() => {
    if (localStorage.hasOwnProperty("backend_URI")) {
      set_backend_URI(localStorage.getItem("backend_URI"));
    }

    if (localStorage.hasOwnProperty("mqtt_broker_URI")) {
      set_mqtt_broker_URI(localStorage.getItem("mqtt_broker_URI"));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("backend_URI", backend_URI);
  }, [backend_URI]);

  useEffect(() => {
    localStorage.setItem("mqtt_broker_URI", mqtt_broker_URI);
  }, [mqtt_broker_URI]);

  // mqtt_client is the client object from the third-party library:
  // https://github.com/mqttjs/MQTT.js
  const [mqtt_client, set_mqtt_client] = useState(null);
  // mqtt_connection_status is one of:
  // 'Connected', 'Reconnecting', 'Disconnected', and 'Connection Error'
  const [mqtt_connection_status, set_mqtt_connection_status] = useState(null);

  // If add_webapp_device is 'true' and an MQTT connection to the MQTT Broker
  // is established, register a device for the logged in user. This is later
  // explained in more detail.
  const [add_webapp_device, set_add_webapp_device] = useState(false);

  // 'devices' stores the deserialized content of the last MQTT message
  // with the topic '<userID>/listDevices' where <userID> was the userID of the
  // logged in user.
  // Example value:
  // {
  //     deviceID: "123456",
  //     task: "shelly",
  //     description: {
  //       userDescription: "Device in living room.",
  //       registrationTimestamp: "Monday, Aug 2, 2021, 06:44 PM",
  //     },
  //   },
  //   {
  //     deviceID: "541564",
  //     task: "both",
  //     description: {
  //       userDescription: "",
  //       registrationTimestamp: "Monday, Aug 2, 2021, 06:44 PM",
  //     },
  //   }
  // }
  const [devices, set_devices] = useState([]);

  // 'devices_ref.current' is like a pointer to the latest version of the
  // 'devices' value (i.e. the up-to-date devices value). This value is used in
  // closures for the third-party MQTT library.
  const devices_ref = useRef();
  devices_ref.current = devices;

  // 'status' specifies the current 'do not distrub' status. 'status' is either
  // true or false.
  const [status, set_status] = useState(false);

  // 'status_history' is an array of objects with two members: status and
  // timestamp. status is the do not distrub status, timestamp is the time
  // and date when the status update was received.
  // 'status_history' stores the status changes (and when these changes
  // occured) since the user logged in.
  const [status_history, set_status_history] = useState([]);

  // 'shellies_power' is a dictionary of <deviceID, [power, timestamp]>
  // key-value pairs. The value is a list with 2 elements: power and timestamp.
  // For each pair, 'power' is the current power consumption in watt of the
  // shelly with device ID 'deviceID' and 'timestamp' is the epoch time (i.e.
  // seconds since 1.1.1970) when this 'power' MQTT message was received.
  // Note that this dictionary also includes the power status of shellies that
  // are not registered under the user that is currently logged in. This is
  // useful because a shelly can send MQTT messages before the user registers
  // that shelly and thus after registering a shelly we do not have to wait
  // until the shelly sends the next power update MQTT message until we can
  // display the power status of this shelly.
  const [shellies_power, set_shellies_power] = useState({});

  // 'shellies_status' is a dictionary of <deviceID, status> key-value pairs.
  // For each pair, 'status' specifies whether the shelly with device ID
  // 'deviceID' is 'on', 'off', or 'overpower'.
  // Similar to 'shellies_power', 'shellies_status' also includes the status of
  // shellies that are not registered under the user that is currently logged
  // in.
  const [shellies_status, set_shellies_status] = useState({});

  // Establish an MQTT connection with the MQTT Broker at 'mqtt_broker_URI'.
  useEffect(() => {
    // Do not establish a connection to the broker if the user is not
    // logged in yet.
    if (userID == null) {
      return;
    }

    // 'client' wraps a client connection to the MQTT broker at
    // 'mqtt_broker_URI'.
    const client = mqtt.connect(mqtt_broker_URI, {
      clientId: userID,
      // In case we connect to a broker over TLS and the broker uses a
      // self-signed certificate, allow the connection and do not reject it.
      rejectUnauthorized: false,
      // If a connection breaks and successfully reconnects, subscribe to the
      // same topics from the previous connection again
      resubscribe: true,
    });

    if (mqtt_client != null) {
      // Cleanup the previous MQTT client connection
      mqtt_client.end();
    }

    // Store a reference to 'client' in the mqtt_client variable.
    set_mqtt_client(client);
  }, [userID]); // eslint-disable-line react-hooks/exhaustive-deps

  // Callbacks for when MQTT events occur (e.g. a new message from the MQTT
  // broker arrived or a reconnect occured).
  useEffect(() => {
    // Return if the App did not connect to the MQTT broker yet.
    if (mqtt_client == null) return;

    // On successful (re)connect.
    mqtt_client.on("connect", () => {
      console.log("MQTT connection status: Connected.");
      set_mqtt_connection_status("Connected");

      subscribe_to_topics();
    });

    // On receiving a publish message.
    mqtt_client.on("message", (topic, message) => {
      on_message_received(topic, message);
    });

    // When a reconnection starts (and has not finish yet).
    mqtt_client.on("reconnect", () => {
      console.log("MQTT connection status: Reconnecting.");
      set_mqtt_connection_status("Reconnecting");
    });

    // On receiving a disconnect packet from the MQTT Broker (This is a
    // MQTT 5.0 feature).
    mqtt_client.on("disconnect", () => {
      console.log("MQTT connection status: Disconnected.");
      set_mqtt_connection_status("Disconnected");
    });

    // On parsing errors or when the client cannot connect to the MQTT broker.
    mqtt_client.on("error", (error) => {
      console.error("MQTT Connection error:", error);
      set_mqtt_connection_status("Connection Error");
      if (mqtt_client != null) {
        mqtt_client.end();
      }
    });
  }, [mqtt_client]); // eslint-disable-line react-hooks/exhaustive-deps

  // The user can set the 'do not disturb' status via this webapp. The
  // 'do not distrub' status is set by sending a MQTT message with the
  // topic 'device/<deviceID>/update'. To be able to send such a message,
  // we need a device, and this device must be registered under the
  // user that is logged in. For this reason, when a user registers,
  // we add a 'dummy' device for this user and the deviceID of this
  // dummy device is used in the 'device/<deviceID>/update' MQTT messages
  // that are sent by the webapp.
  // This function registers this dummy device when the connection to the
  // MQTT broker is established (i.e. 'mqtt_connection_status' is 'Connected').
  useEffect(() => {
    if (!add_webapp_device || mqtt_connection_status !== "Connected") {
      return;
    }

    // We need to make sure that the deviceID for the dummy device is unique.
    // In the backend database, the maximum size for the deviceID is 64 bit.
    // The deviceID of non-dummy devices (i.e. the deviceID of AALeCs and
    // alexas) have a maximum size of <= 32 bits and in this case the 32 most
    // significant bits are 0.
    // DeviceID in the database for non-dummy devices:
    // | 32 bits | 32 bits  |
    // | 0.....0 | deviceID |
    // By setting the 32 most significant bits of the
    // deviceID to 1 (or any number other than 0), we can distinguish between
    // dummy and non-dummy devices and the deviceIDs for dummy devices do not
    // interfere with the deviceIDs for non-dummy devices. The 32 least
    // significant bits of the dummy device ID are set to the userID. The userID
    // is unique among the userIDs, therefore the deviceID for the dummy device
    // is unique.
    // DeviceID in the database for dummy devices:
    // | 32 bits | 32 bits  |
    // | 0....01 | userID   |
    // The backend generates userIDs via a counter, i.e. the first user has
    // userID 0, the second user has userID 1 and so on. Therefore, as long
    // as our system has less than 4 billion users, the userID won't
    // 'overflow' into the 32 most significant bits.
    const userID_int = parseInt(userID);
    if (isNaN(userID)) {
      console.error(
        "Failed to add dummy device. UserID:",
        userID,
        "is not a number."
      );
      return;
    }
    const dummy_ID = (Math.pow(2, 32) + userID_int).toString();

    // MQTT messages for the topic webfrontend/device/register have the
    // the following content: <userID>,<deviceID>,<task>,<description>
    // The '<description>' field of the MQTT message that is sent to the backend
    // is a serialized JSON dictionary. This dictionary for NON-DUMMY devices
    // has two keys:
    // {
    //    userDescription: "Device in living room.",
    //    registrationTimestamp: "Sunday, Aug 1, 2021, 06:44 PM"
    // }
    // For DUMMY devices there is no 'userDescription' field.
    // For dummy devices, there is an addition field called 'is_dummy'.
    // Via 'is_dummy', the webapp can differentiate between dummy and non-dummy
    // devices. This is important on the 'List Devices' page, because
    // when we list the devices we only want to list non-dummy devices. Note
    // that we don't need the 'is_dummy' field, because we could differentiate
    // dummy and non-dummy devices via the '1' in the 32 most significant bits
    // in the deviceID. However, the 'is_dummy' field is useful because it is
    // easier to understand and work with.
    const device_description = {
      is_dummy: "",
      registrationTimestamp: timestamp(),
    };
    const device_description_string = JSON.stringify(device_description);

    const sig_timestamp = signature_timestamp();

    // Task is set to 'both' (which specifies 'LED and Button') so that:
    // 1) we receive device/<deviceID>/status messages from the API so that
    //    the '/status' page is updated.
    // 2) the user can update the status via the '/status' page.
    const task = "both";

    // MQTT messages to register a device must include a signature so that the
    // backend server can ensure that only the user (who is in possession of
    // the private key 'private_key') can register devices for his user. In
    // other words, the signature ensures that user A cannot register a device
    // for user B. The timestamp that is included in the message and
    // signature computation ensures that the message is idempotent and cannot
    // be replayed later.
    // The signature is later computed over the message_concatenated string.
    let message_concatenated =
      userID.trim() +
      dummy_ID +
      task +
      device_description_string +
      sig_timestamp;

    const signature = generate_signature(message_concatenated, private_key);

    const mqtt_message = {
      body: {
        userID: userID.trim(),
        deviceID: dummy_ID,
        task: task,
        description: device_description_string,
        timestamp: sig_timestamp,
      },
      signature: signature,
    };

    const topic = "webfrontend/device/register";
    mqtt_publish_message(topic, JSON.stringify(mqtt_message));
    set_add_webapp_device(false);
  }, [mqtt_connection_status, add_webapp_device]); // eslint-disable-line react-hooks/exhaustive-deps

  // Subscribe to all topics that we are interested in. Note that we use
  // wildcards (e..g 'device/+/status') in the topic strings so that even if
  // further devices are registered, after we have subscribed to topics, we
  // receive messages from these newly registered devices as well without
  // having to subscribe to other topics.
  const subscribe_to_topics = () => {
    // Returns a list of devices that are registered under the user user with
    // ID <userID>.
    // The topic is '<userID>/listDevices', e.g. '123456/listDevices'
    mqtt_client.subscribe("+/listDevices", { qos: 2 }, (error) => {
      if (!error) return;
      console.error("Subscribe to topic '<userID>/listDevices' error:", error);
    });

    // Returns the status (i.e. do not distrub yes or no) for the device with
    // ID <deviceID>.
    // The topic is 'device/<deviceID>/status', e.g. 'device/123456/status'.
    mqtt_client.subscribe("device/+/status", { qos: 2 }, (error) => {
      if (!error) return;
      console.error(
        "Subscribe to topic 'device/<deviceID>/status' error:",
        error
      );
    });

    // Returns the status (i.e. one of 'on', 'off', 'overpower') for the shelly
    // with ID <deviceID>.
    // The topic is 'shellies/<deviceID>/relay/0',
    // e.g. 'shellies/123456/relay/0'.
    mqtt_client.subscribe("shellies/+/relay/0", { qos: 2 }, (error) => {
      if (!error) return;
      console.error(
        "Subscribe to topic 'shellies/<deviceID>/relay' error:",
        error
      );
    });

    // Returns the power consumption (e.g. 300) of the shelly with ID
    // <deviceID>.
    // The topic is 'shellies/<deviceID>/relay/0/power',
    // e.g. 'shellies/123456/relay/0/power'.
    mqtt_client.subscribe("shellies/+/relay/0/power", { qos: 2 }, (error) => {
      if (!error) return;
      console.error(
        "Subscribe to topic 'shellies/<deviceID>/relay/0/power' error:",
        error
      );
    });
  };

  // On receiving a MQTT message from the MQTT broker, process this message
  // depending on the topic.
  const on_message_received = (topic, message_uint8) => {
    // Received 'message_uint8' messages have the type Uint8Array.
    const message = uint8array_to_string(message_uint8);

    // Use regular expressions to categorize the 'topic' and, depending on the
    // category of the topic, further process the 'message'.
    // By topic category, I mean whether the topic is '<userID>/listDevices' or
    // 'shellies/<shellyID>/relay/0/power' etc.

    let captured_groups = topic.match(list_devices_regex);
    if (captured_groups) {
      // 'topic' matches '<userID>/listDevices'.
      // 'captured_groups[1]' is the <userID> in topic <userID>/listDevices.
      const userID = captured_groups[1];
      on_list_devices_message(userID, message);
      return;
    }

    captured_groups = topic.match(status_regex);
    if (captured_groups) {
      // topic matches device/<deviceID>/status
      const deviceID = captured_groups[1];
      on_status_message(deviceID, message);
    }

    captured_groups = topic.match(shelly_status_regex);
    if (captured_groups) {
      // topic matches shellies/<deviceID>/relay/0
      const deviceID = captured_groups[1];
      let updated_value = {};
      updated_value[deviceID] = message;
      // Adds or updates key 'deviceID' in dictionary 'shellies_status'.
      set_shellies_status({ ...shellies_status, ...updated_value });
    }

    captured_groups = topic.match(shelly_power_regex);
    if (captured_groups) {
      // 'topic' matches 'shellies/<deviceID>/relay/0/power'
      let deviceID = captured_groups[1];
      let updated_value = {};
      updated_value[deviceID] = [message, epoch_time()];
      // Adds or updates key 'deviceID' in dictionary 'shellies_status'.
      set_shellies_power({ ...shellies_power, ...updated_value });
    }
  };

  // On receiving a MQTT message with topic <userID>/listDevices for the logged
  // in user, validate, deserialize, and store the message in 'devices'.
  const on_list_devices_message = (message_userID, message) => {
    if (userID !== message_userID) {
      // We are not interested in messages that specify the devices of another
      // user.
      return;
    }

    // Validate the message because the message can come from untrusted sources.
    // We expect the message to be objects (in string representation) with three
    // elements:
    // deviceID, task, and description.
    // Example JSON 'message':
    // [
    //  {
    //     deviceID: '123456',
    //     task: 'shelly',
    //     description: '{\"userDescription\":\"Device in living room.\",\"registrationTimestamp\":\"Sunday, Aug 1, 2021, 04:45 PM\"}'
    //   },
    //  {
    //     deviceID: '541564',
    //     task: 'button',
    //     description: '{\"userDescription\":\"\",\"registrationTimestamp\":\"Sunday, Aug 1, 2021, 04:48 PM\"}'
    //   }
    // ]
    try {
      var message_devices = JSON.parse(message);
      for (let i = 0; i < message_devices.length; i++) {
        let error_msg =
          "Failed to parse message " +
          message +
          " - List " +
          "element " +
          i +
          " does not include the key ";

        const required_keys = ["deviceID", "task", "description"];
        // Check if all elements in the 'message_devices' list contain all
        // 'required_keys'.
        required_keys.forEach((key) => {
          if (!(key in message_devices[i])) {
            console.error(error_msg + "deviceID");
            return;
          }
        });
        // The description value is a string. We deserialize the description
        // value as well.
        message_devices[i]["description"] = JSON.parse(
          message_devices[i]["description"]
        );

        // 'deviceID' in message_devices is of type int if the device is an
        // AALeC or alexa, and of type string if the device is a shelly.
        if (typeof message_devices[i]["deviceID"] === "number") {
          message_devices[i]["deviceID"] =
            message_devices[i]["deviceID"].toString();
        }
      }
    } catch (error) {
      console.error(
        "Failed to parse message",
        message,
        "for topic <userID>/listDevices:",
        error
      );
      return;
    }

    set_devices(message_devices);
  };

  // On receiving a MQTT message with the topic device/<deviceID>/status where
  // deviceID was registered by the logged in user, update the do not disturb
  // status that the webapp displays. If the status has changed, also update
  // the do not disturb status history page.
  const on_status_message = (deviceID, message) => {
    // device_of_user specifies whether the device with deviceID is
    // registered under the user that is currently logged in.
    let device_of_user = false;

    // Alternatively we could use a hashset for a O(1) contains check here, but
    // the number of elements in 'devices' is relatively low because 'devices'
    // only lists the devices of the user that is currently logged in and not
    // the devices of all users. Thus a O(n) contains check is fine for this use
    // case.
    devices_ref.current.forEach((device) => {
      if (device["deviceID"] === deviceID) {
        device_of_user = true;
      }
    });
    if (!device_of_user) return;

    // 'message' is '1' if do not disturb is true
    const do_not_disturb = message === "1";
    set_status(do_not_disturb);

    // If the status has changed, prepend the status with timestamp (current
    // time) to the status_history list.
    set_status_history((_status_history) => {
      if (
        _status_history.length === 0 ||
        _status_history[0]["status"] !== do_not_disturb
      ) {
        return [
          {
            status: do_not_disturb,
            timestamp: timestamp(),
          },
          ..._status_history,
        ];
      } else {
        return _status_history;
      }
    });
  };

  // Send the MQTT message with 'topic' and 'message' to the MQTT Broker
  // listenting at 'mqtt_broker_URI'.
  // This function requires that the 'mqtt_client' is initialized, which is
  // the case if a user is logged in.
  const mqtt_publish_message = (topic, message) => {
    mqtt_client.publish(topic, message, { qos: 2 }, (error) => {
      if (!error) return;
      console.error(
        "Failed to publish '" + message + "' to topic '" + topic + "'"
      );
    });
  };

  // Resets relevant state to its initial value. This funktion is called when
  // the user logs out.
  const reset_state = () => {
    set_user_ID(null);
    set_private_key(null);
    set_add_webapp_device(false);
    set_status(false);
    set_devices([]);
    set_status_history([]);
    set_shellies_power({});
    set_shellies_status({});
    if (mqtt_client != null) {
      // Close the MQTT client connection.
      mqtt_client.end();
    }
    set_mqtt_client(null);
  };

  return (
    <SettingsContext.Provider
      value={{
        backend_URI,
        set_backend_URI,
        mqtt_broker_URI,
        set_mqtt_broker_URI,
      }}>
      <Router>
        <div className="min-h-screen flex prose">
          <div className="w-1/5 min-h-screen sticky top-0 h-full">
            <Sidebar authorized={userID != null} reset_state={reset_state} />
          </div>
          <div className="w-4/5 h-screen flex">
            <Switch>
              {/*
                The displayed HTML elements depend on the URI path. 
                For example, if the URI is http://localhost:3000/login, 
                the <Login/> element is displayed.
                This routing mechanism uses the third-party library:
                https://github.com/ReactTraining/react-router
                See https://reactrouter.com/web/api/Route for more info on the
                <Route/> element.
              */}
              <Route path="/login">
                <Login
                  set_user_ID={set_user_ID}
                  set_private_key={set_private_key}
                />
              </Route>
              <Route path="/register">
                <Register
                  set_user_ID={set_user_ID}
                  set_private_key={set_private_key}
                  set_add_webapp_device={set_add_webapp_device}
                />
              </Route>
              <Route path="/status">
                <Status
                  userID={userID}
                  status={status}
                  devices={devices}
                  mqtt_publish_message={mqtt_publish_message}
                />
              </Route>
              <Route path="/history">
                <StatusHistory
                  userID={userID}
                  status_history={status_history}
                />
              </Route>
              <Route path="/add_device">
                <AddDevice
                  userID={userID}
                  private_key={private_key}
                  mqtt_publish_message={mqtt_publish_message}
                />
              </Route>
              <Route path="/devices">
                <Devices
                  devices={devices}
                  shellies_status={shellies_status}
                  shellies_power={shellies_power}
                  userID={userID}
                  private_key={private_key}
                  mqtt_publish_message={mqtt_publish_message}
                />
              </Route>
              <Route path="/settings">
                <Settings
                  userID={userID}
                  private_key={private_key}
                  set_user_ID={set_user_ID}
                  set_private_key={set_private_key}
                  reset_state={reset_state}
                />
              </Route>
              <Route path="/">
                <div></div>
              </Route>
            </Switch>
          </div>
        </div>
      </Router>
    </SettingsContext.Provider>
  );
}
