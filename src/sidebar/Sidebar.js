// Daniel Ebert (65926)

import { SidebarLink } from "./SidebarLink";
import { LogoutButton } from "./LogoutButton";
import {
  UserCircleIcon,
  UserAddIcon,
  CogIcon,
  AdjustmentsIcon,
  LogoutIcon,
  MenuIcon,
  PlusIcon,
  WifiIcon,
  FastForwardIcon,
} from "@heroicons/react/outline";

// Sidebar with buttons (i.e. SidebarLink elements) that redirect to the
// pages. If the user is not logged in, there are two buttons/pages: Login and
// Register.
// If the user is logged in, there are four pages/buttons: Status, History,
// Add Device, and List Devices.
export function Sidebar({ authorized, reset_state }) {
  return (
    <div className="px-2">
      <h1
        className="py-10 px-12 text-4xl font-extrabold text-gray-800 
                   text-center">
        Do Not Disturb System
      </h1>
      <div className="space-y-3 flex flex-col">
        {/* 
        'authorized' specifies whether the user is logged in or not.
        */}
        {authorized ? (
          <>
            <SidebarLink Icon={WifiIcon} text="Status" href="/status" />
            <SidebarLink
              Icon={FastForwardIcon}
              text="History"
              href="/history"
            />
            <SidebarLink Icon={PlusIcon} text="Add Device" href="/add_device" />
            <SidebarLink Icon={MenuIcon} text="List Devices" href="/devices" />
          </>
        ) : (
          <>
            <SidebarLink Icon={UserCircleIcon} text="Login" href="/login" />
            <SidebarLink Icon={UserAddIcon} text="Register" href="/register" />
          </>
        )}
      </div>
      <br />
      <div className="absolute bottom-0 py-4 px-2 group space-y-4">
        <div className="opacity-0 transition group-hover:opacity-100 space-y-4">
          <SidebarLink
            Icon={AdjustmentsIcon}
            text="Settings"
            href="/settings"
          />
          <LogoutButton
            Icon={LogoutIcon}
            text="Logout"
            href="/login"
            reset_state={reset_state}
          />
        </div>
        <CogIcon className="group-hover:opacity-100 h-10" />
      </div>
    </div>
  );
}
