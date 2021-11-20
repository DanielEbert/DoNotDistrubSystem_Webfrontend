// Daniel Ebert (65926)

import { useHistory } from "react-router-dom";

// A wrapper around a button. If the button is clicked, the user is
// redirected to the 'href' path.
// 'href' is for example '/login'.
export function SidebarLink({ Icon, text, href }) {
  let history = useHistory();

  return (
    <button
      className="flex items-center justify-start bg-gray-500 bg-opacity-10 
                 transition hover:bg-opacity-20 rounded-lg px-6 py-2 text-2xl 
                 space-x-3"
      onClick={() => history.push(href)}>
      <Icon className="w-7 mx-1 my-0" />
      <div>{text}</div>
    </button>
  );
}
