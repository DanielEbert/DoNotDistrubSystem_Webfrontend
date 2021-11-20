// Daniel Ebert (65926)

import { useHistory } from "react-router-dom";
import { useState, useContext } from "react";
import { SettingsContext } from "../App";

// Register form to register a user.
export function Register({
  set_user_ID,
  set_private_key,
  set_add_webapp_device,
}) {
  // Endpoint for the REST API from the backend.
  const register_endpoint = "/user/register";

  // 'name' and 'password' store the HTML form data.
  const [name, set_name] = useState("");
  const [password, set_password] = useState("");

  // register_failure_text is 'null' if register did not fail (yet)
  const [register_failure_text, set_register_failure_text] = useState(null);

  // 'settings' stores the backend URI.
  const settings = useContext(SettingsContext);

  let history = useHistory();

  // Called when the user presses the 'Register' Button
  // Exchange the username and password pair for a private key and userID via
  // the backend.
  // The user enters the username and password in the form.
  const on_submit = () => {
    register(name, password);
  };

  const register = (name, password) => {
    // Full path to the REST API from the backend for the register endpoint.
    const register_uri = settings["backend_URI"] + register_endpoint;

    // Backend provides a REST API to register a user.
    fetch(register_uri, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        Username: name,
        Password: password,
        "E-Mail": name,
      }),
    })
      .then((response) => {
        // Register failed due to e.g. username exists already.
        if (!response.ok) {
          // status code is not in the 200-299 range
          return Promise.reject(response);
        }
        // register successful
        return response.json();
      })
      .then((data) => {
        // Validate that the json object from the server contains the
        // keys that we expect.
        if (!("userID" in data)) {
          throw Error(
            "Invalid recv_json message format. The returned " +
              "Json Object did not include the key 'userID'."
          );
        }
        if (!("privateKey" in data)) {
          throw Error(
            "Invalid recv_json message format. The returned " +
              "Json Object did not include the key 'privateKey'."
          );
        }

        set_user_ID(data["userID"].toString());
        set_private_key(data["privateKey"]);

        // The user can set the 'do not disturb' status via the webapp. The
        // 'do not distrub' status is set via sending a MQTT message with the
        // topic 'device/<deviceID>/update'. To be able to send such a message,
        // we need a device and this device must be registered under the
        // user that is logged in. For this reason, when a user registers,
        // we add a 'dummy' device for this user and the deviceID of this
        // dummy device is used in the 'device/<deviceID>/update' MQTT messages
        // that are sent from the webapp.
        // Setting 'add_webapp_device' to true specifies that, as soon as
        // a connection to the MQTT broker is established, a dummy device
        // is added for the registered user.
        set_add_webapp_device(true);

        set_register_failure_text(null);

        // Redirect to path '/'
        history.push("/");
      })
      .catch((error_reponse) => {
        error_reponse.text().then((text) => {
          console.error("Register failed due to ", text);
          set_register_failure_text("Register failed due to " + text);
        });
      })
      .catch((error) => {
        console.log("Register failed due to unknown error.");
        set_register_failure_text("Register failed due to unknown error.");
      });
  };

  return (
    <div
      className="m-auto flex flex-col bg-gray-400 bg-opacity-10 border 
               border-gray-600 border-opacity-80 rounded-3xl p-4 pt-8 w-2/5 
                 shadow">
      <h1
        className="text-5xl font-extrabold text-center pb-4 mb-4 border-b-2
                     text-gray-800">
        Register
      </h1>
      {
        // Print register_failure_text if the register failed.
        register_failure_text && (
          <div className="text-center text-4xl text-red-600 px-10 py-5">
            {register_failure_text}
          </div>
        )
      }
      <div className="flex px-4 py-3 flex-col">
        <label className="text-xl pt-4 pb-2" htmlFor="name">
          Username
        </label>
        <input
          id="register_name_input"
          className="border border-gray-300 rounded-lg bg-white 
                       focus:outline-none focus:ring-2  focus:ring-blue-500
                       text-xl px-2 pt-2 pb-2"
          onChange={(e) => set_name(e.target.value)}></input>
        <label className="text-xl pt-6 pb-2" htmlFor="password">
          Password
        </label>
        <input
          id="register_password_input"
          type="password"
          className="border border-gray-300 rounded-lg bg-white 
                     focus:outline-none focus:ring-2  focus:ring-blue-500
                     text-xl px-2 pt-2 pb-2"
          onChange={(e) => set_password(e.target.value)}></input>
        <button
          id="register_submit_button"
          className="mt-12 h-12 rounded-full bg-blue-500 bg-opacity-50 text-xl 
                     font-bold hover:bg-opacity-80 transition shadow"
          onClick={on_submit}>
          Submit
        </button>
      </div>
    </div>
  );
}
