export function getPeerjsConfig() {
  return import.meta.env.VITE_USE_LOCAL_PEER_SERVER
    ? {
        host: "localhost",
        port: 9000,
        path: "/myapp",
      }
    : undefined;
}
