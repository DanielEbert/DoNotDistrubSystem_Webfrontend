// Daniel Ebert (65926)

import clsx from "clsx";
import { useHistory } from "react-router";

// The StatusHistory component displays when the do not disturb status of the
// logged in user was changed since this user logged in to the webapp.
export function StatusHistory({ userID, status_history }) {
  const history = useHistory();

  // Redirect to login page if the user is not logged in.
  if (userID === null) {
    history.push("/login");
  }

  return (
    <div className="flex flex-col mx-auto my-16 space-y-16">
      <h1 className="text-5xl font-bold text-center text-gray-800">
        Do Not Disturb Status History
      </h1>
      {status_history.length === 0 && (
        <div className="text-3xl text-gray-800">
          No changes to the Do Not Disturb Status since you logged in.
        </div>
      )}
      <div className="space-y-10">
        {status_history.map((status, index) => {
          return (
            <div
              key={index}
              className="text-gray-800 text-center text-3xl space-y-6">
              <div className="text-left">Do Not Disturb was set to:</div>
              <div
                className={clsx(
                  "text-5xl font-bold text-center",
                  status["status"] ? "text-red-500" : "text-green-400"
                )}>
                {status["status"] ? "True" : "False"}
              </div>
              <div className="text-right">{status["timestamp"]}</div>
              <br />
            </div>
          );
        })}
      </div>
    </div>
  );
}
