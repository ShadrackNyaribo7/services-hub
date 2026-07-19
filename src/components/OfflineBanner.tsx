"use client";
import { useSyncExternalStore } from "react";

const subscribeToNetworkStatus = (callback: () => void) => {
  window.addEventListener("offline", callback);
  window.addEventListener("online", callback);

  return () => {
    window.removeEventListener("offline", callback);
    window.removeEventListener("online", callback);
  };
};

const getNetworkSnapshot = () => !navigator.onLine;
const getServerSnapshot = () => false;

export default function OfflineBanner() {
  const isOffline = useSyncExternalStore(
    subscribeToNetworkStatus,
    getNetworkSnapshot,
    getServerSnapshot,
  );
  
  if (!isOffline) return null;
  
  return (
    <div className="bg-yellow-500 text-white p-2 text-center text-sm font-medium">
      You are offline. Some features may be limited.
    </div>
  );
}
