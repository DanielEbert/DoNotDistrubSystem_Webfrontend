// Daniel Ebert (65926)

import { useHistory } from "react-router-dom";

// LogoutButton is the same as SidebarLink, except we call reset_state() so that
// any relevant state (i.e. the privateKey, userID, ...) is reset.
// Resetting the userID to null specifies that no user is currently logged in.
export function LogoutButton({ Icon, text, href, reset_state }) {
  let history = useHistory();

  return (
    <button
      className="flex items-center justify-start bg-gray-500 bg-opacity-10 
                 transition hover:bg-opacity-20 rounded-lg px-6 py-2 text-2xl 
                 space-x-2 shadow"
      onClick={() => {
        reset_state();
        history.push(href);
      }}>
      <Icon className="w-7 mx-1 my-0" />
      <div>{text}</div>
    </button>
  );
}
