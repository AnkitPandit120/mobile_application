// Set EXPO_PUBLIC_CHAT_SERVER_URL to the server's LAN URL for a device build.
const configuredUrl = process.env.EXPO_PUBLIC_CHAT_SERVER_URL?.trim();
function readServerUrl(value) {
  if (!value) return null;

  try {
    return new URL(value);
  } catch {
    return null;
  }
}

const serverUrl = readServerUrl(configuredUrl);

export const chatServerUrl =
  serverUrl && ["http:", "https:"].includes(serverUrl.protocol)
    ? serverUrl.origin
    : null;
