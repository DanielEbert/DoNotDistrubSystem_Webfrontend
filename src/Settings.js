// Daniel Ebert (65926)

import { useContext, useState } from "react";
import { useHistory } from "react-router";
import { SettingsContext } from "./App";

// Displays input fields so that the user can change the Backend URI and the
// MQTT Broker URI. If the user is logged in, this component also displays
// buttons to change the password and to unregister the logged in user account.
export function Settings({
  userID,
  private_key,
  set_user_ID,
  set_private_key,
  reset_state,
}) {
  const { backend_URI, set_backend_URI, mqtt_broker_URI, set_mqtt_broker_URI } =
    useContext(SettingsContext);

  // Dispay the 'Confirm Unregister' button if the use has pressed the
  // 'Unregister' button.
  const [show_confirm_unregister, set_show_confirm_unregister] =
    useState(false);
  // Display the input fields for 'current password' and 'new password' if the
  // user pressed the 'Change Password' button.
  const [show_change_password_fields, set_show_change_password_fields] =
    useState(false);
  // 'new_password' stores the HTML form data.
  const [new_password, set_new_password] = useState("");

  // login_failure_text is 'null' if the unregister or password change did not
  // fail (yet).
  const [failure_text, set_failure_text] = useState(null);

  const history = useHistory();

  const on_unregister = () => {
    set_show_confirm_unregister(true);
  };

  const on_confirm_unregister = () => {
    // Endpoint for the REST API from the backend.
    const unregister_endpoint = "/user/unregister";
    // Full path to the REST API from the backend for the unregister endpoint.
    const unregister_uri = backend_URI + unregister_endpoint;

    // Backend provides a REST API to unregister a user.
    fetch(unregister_uri, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userID: userID,
        privateKey: private_key,
      }),
    })
      .then((response) => {
        // Unregister failed.
        if (!response.ok) {
          // status code is not in the 200-299 range
          return Promise.reject(response);
        }
        // Unregister was successful.
        set_failure_text(null);
        // Log current (now non-existent) user out.
        reset_state();

        history.push("/register");
        return;
      })
      .catch((error_reponse) => {
        error_reponse.text().then((text) => {
          console.error("Unregister failed due to ", text);
          set_failure_text("Unregister failed due to " + text);
        });
      })
      .catch((error) => {
        console.log("Unregister failed due to unknown error.");
        set_failure_text("Unregister failed due to unknown error.");
      });
  };

  const on_change_password = () => {
    set_show_change_password_fields(true);
  };

  const on_confirm_change_password = () => {
    // Endpoint for the REST API from the backend.
    const change_password_endpoint = "/user/changePassword";
    // Full path to the REST API from the backend for the change password
    // endpoint.
    const change_password_uri = backend_URI + change_password_endpoint;

    // Backend provides a REST API to change the password of the currently
    // logged in user.
    fetch(change_password_uri, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userID: userID,
        privateKey: private_key,
        Password: new_password,
      }),
    })
      .then((response) => {
        // Change password failed.
        if (!response.ok) {
          // status code is not in the 200-299 range
          return Promise.reject(response);
        }
        // Change password was successful.
        set_failure_text(null);
        return;
      })
      .catch((error_reponse) => {
        error_reponse.text().then((text) => {
          console.error("Change password failed due to ", text);
          set_failure_text("Change password failed due to " + text);
        });
      })
      .catch((error) => {
        console.log("Request failed due to unknown error.");
        set_failure_text("Request failed due to unknown error.");
      });
  };

  return (
    <div className="flex flex-col space-y-5 p-10 w-full">
      <h1 className="text-5xl text-gray-800 font-extrabold">URI Settings</h1>
      <div className="flex flex-row space-x-5">
        <p>Backend URI</p>
        <input
          className="ring-2"
          value={backend_URI}
          onChange={(e) => set_backend_URI(e.target.value)}></input>
      </div>
      <div className="flex flex-row space-x-5">
        <p>MQTT Broker URI</p>
        <input
          className="ring-2"
          value={mqtt_broker_URI}
          onChange={(e) => set_mqtt_broker_URI(e.target.value)}></input>
      </div>
      {/* Display the 'Account Settings' if a user is currently logged in. */}
      {userID && (
        <div className="flex flex-col space-y-5 w-full">
          <h1 className="pt-10 text-5xl text-gray-800 font-extrabold">
            Account Settings
          </h1>
          {
            // Print login_failure_text if a REST API operation failed.
            failure_text && (
              <div className="text-center text-4xl text-red-600 px-10 py-5">
                {failure_text}
              </div>
            )
          }
          <div className="w-2/5 p-auto flex flex-row space-x-5">
            <button
              className="h-12 w-1/2 rounded-full bg-red-500 bg-opacity-50 
                         text-xl font-bold hover:bg-opacity-80 transition 
                         shadow"
              onClick={on_unregister}>
              Unregister
            </button>
            {/* Dispays the 'Confirm Unregister' button if the use has pressed the
            'Unregister' button */}
            {show_confirm_unregister && (
              <button
                className="h-12 w-1/2 rounded-full bg-red-500 bg-opacity-50 
                           text-xl font-bold hover:bg-opacity-80 transition 
                           shadow"
                onClick={on_confirm_unregister}>
                Confirm Unregister
              </button>
            )}
          </div>
          <button
            className="h-12 w-1/5 rounded-full bg-red-500 bg-opacity-50 
                       text-xl font-bold hover:bg-opacity-80 transition shadow"
            onClick={on_change_password}>
            Change Password
          </button>
          {/* Displays the input fields for 'current password' and 'new 
                password' if the user pressed the 'Change Password' button */}
          {show_change_password_fields && (
            <div className="space-y-5">
              <div className="flex flex-row space-x-5">
                <p>New Password</p>
                <input
                  className="ring-2"
                  value={new_password}
                  onChange={(e) => set_new_password(e.target.value)}></input>
              </div>
              <button
                className="h-12 w-1/4 rounded-full bg-red-500 bg-opacity-50 
                           text-xl font-bold hover:bg-opacity-80 transition 
                           shadow"
                onClick={on_confirm_change_password}>
                Confirm Change Password
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
