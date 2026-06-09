// secureStorage.js
// Safe storage for both Browser and Electron

let electronStore = null;

// Check if running inside Electron renderer
const isElectron = () => {
  return typeof window !== "undefined" &&
         typeof window.process !== "undefined" &&
         window.process.type === "renderer";
};

// Safe base64 encode/decode
const encodeToken = (token) => {
  try {
    return btoa(token);
  } catch {
    return token;
  }
};

const decodeToken = (token) => {
  try {
    return atob(token);
  } catch {
    return token;
  }
};

// IMPORTANT:
// No direct import('electron-store')
// because Vite still tries to bundle it

const getElectronStore = async () => {
  if (electronStore) return electronStore;

  if (!isElectron()) return null;

  try {
    // only works if preload exposes require
    const Store =
      window.require?.("electron-store") ||
      window.electron?.require?.("electron-store");

    if (!Store) {
      console.warn("electron-store unavailable");
      return null;
    }

    electronStore = new Store({
      name: "auth",
      cwd: "anyvoice-app"
    });

    return electronStore;
  } catch (error) {
    console.error("Electron Store error:", error);
    return null;
  }
};

// Save token
export const setSecureToken = async (token) => {
  if (!token) return false;

  const store = await getElectronStore();

  try {
    if (store) {
      store.set("authToken", token);
      store.set("tokenTimestamp", Date.now());
    } else {
      localStorage.setItem("AuthToken", token);
      localStorage.setItem("token_timestamp", String(Date.now()));
    }

    return true;
  } catch (error) {
    console.error("Token save error:", error);
    return false;
  }
};

// Get token
export const getSecureToken = async () => {
  const store = await getElectronStore();

  try {
    if (store) {
      return store.get("authToken") || null;
    }

    return localStorage.getItem("AuthToken");
  } catch (error) {
    console.error("Token read error:", error);
    return null;
  }
};

// Remove token
export const removeSecureToken = async () => {
  const store = await getElectronStore();

  try {
    if (store) {
      store.delete("authToken");
      store.delete("tokenTimestamp");
    }

    localStorage.removeItem("AuthToken");
    localStorage.removeItem("token_timestamp");

    return true;
  } catch (error) {
    console.error("Token remove error:", error);
    return false;
  }
};

// Check token exists
export const hasSecureToken = async () => {
  const token = await getSecureToken();
  return !!token;
};