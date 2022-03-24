# Contributing

## Using the local peer server

By default, you can use the signaling server of peerjs (no need to deploy your own).

For some reason, you may want to run your code against a local signaling server. You can launch a signaling server with the following command in a tab:

```sh
npm run peer-server
```

Then on an other tab, set the env var `VITE_USE_LOCAL_PEER_SERVER=true`

```sh
VITE_USE_LOCAL_PEER_SERVER=true npm run dev # also works with npm run build
```
