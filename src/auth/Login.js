// Daniel Ebert (65926)

import { useHistory } from "react-router-dom";
import { useState, useContext } from "react";
import { SettingsContext } from "../App";

// Login form to authenticate a user.
export function Login({ set_user_ID, set_private_key }) {
  // Endpoint for the REST API from the backend.
  const login_endpoint = "/user/login";

  // 'name' and 'password' store the HTML form data.
  const [name, set_name] = useState("");
  const [password, set_password] = useState("");

  // login_failure_text is 'null' if the login did not fail (yet).
  const [login_failure_text, set_login_failure_text] = useState(null);

  // 'settings' stores the backend URI.
  const settings = useContext(SettingsContext);

  // useHistory() from the third-party react-router-dom library is used to
  // redirect to other pages of this webapp.
  let history = useHistory();

  // Called when the user presses the 'Login' Button.
  // Exchange the username and password pair for a private key and userID via
  // the backend.
  // The user enters the username and password in the form.
  const on_submit = () => {
    login(name, password);
  };

  const login = (name, password) => {
    // Full path to the REST API from the backend for the login endpoint
    const login_uri = settings["backend_URI"] + login_endpoint;

    fetch(login_uri, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        Username: name,
        Password: password,
      }),
    })
      .then((response) => {
        // Login failed due to e.g. invalid username/password pair
        if (!response.ok) {
          // status code is not in the 200-299 range
          return Promise.reject(response);
        }
        // Login successful
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
        // Store received userID and privateKey.
        set_user_ID(data["userID"].toString());
        set_private_key(data["privateKey"]);

        set_login_failure_text(null);

        // Redirect to path '/'
        history.push("/");
      })
      .catch((error_reponse) => {
        error_reponse.text().then((text) => {
          console.error("Login failed due to ", text);
          set_login_failure_text("Login failed due to " + text);
        });
      })
      .catch((error) => {
        console.log("Login failed due to unknown error.");
        set_login_failure_text("Login failed due to unknown error.");
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
        Login
      </h1>
      {
        // Print login_failure_text if a login failed.
        login_failure_text && (
          <div className="text-center text-4xl text-red-600 px-10 py-5">
            {login_failure_text}
          </div>
        )
      }
      <div className="flex px-4 py-3 flex-col">
        <label className="text-xl pt-4 pb-2" htmlFor="name">
          Username
        </label>
        <input
          id="name"
          className="border border-gray-300 rounded-lg bg-white 
                       focus:outline-none focus:ring-2  focus:ring-blue-500
                       text-xl px-2 pt-2 pb-2"
          onChange={(e) => set_name(e.target.value)}></input>
        <label className="text-xl pt-6 pb-2" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          type="password"
          className="border border-gray-300 rounded-lg bg-white 
                       focus:outline-none focus:ring-2  focus:ring-blue-500
                       text-xl px-2 pt-2 pb-2"
          onChange={(e) => set_password(e.target.value)}></input>
        <button
          className="mt-12 h-12 rounded-full bg-blue-500 bg-opacity-50 text-xl 
                     font-bold hover:bg-opacity-80 transition shadow"
          onClick={on_submit}>
          Submit
        </button>
      </div>
    </div>
  );
}
