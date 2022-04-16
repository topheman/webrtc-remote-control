# webrtc-remote-control

[![ci](https://github.com/topheman/webrtc-remote-control/actions/workflows/ci.yml/badge.svg)](https://github.com/topheman/webrtc-remote-control/actions/workflows/ci.yml)
[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-yellow.svg)](https://www.conventionalcommits.org)
[![Demo](https://img.shields.io/badge/demo-online-blue.svg)](http://webrtc-remote-control.vercel.app/)

Implementations

| Package                                                 | Version                                                                                                                                    |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| [@webrtc-remote-control/core](./packages/core#readme)   | [![npm](https://img.shields.io/npm/v/@webrtc-remote-control/core?color=blue)](https://www.npmjs.com/package/@webrtc-remote-control/core)   |
| [@webrtc-remote-control/react](./packages/react#readme) | [![npm](https://img.shields.io/npm/v/@webrtc-remote-control/react?color=blue)](https://www.npmjs.com/package/@webrtc-remote-control/react) |
| [@webrtc-remote-control/vue](./packages/vue#readme)     | [![npm](https://img.shields.io/npm/v/@webrtc-remote-control/vue?color=blue)](https://www.npmjs.com/package/@webrtc-remote-control/vue)     |

- [Demo](./demo#readme)
- [CONTRIBUTING](CONTRIBUTING.md)

## The problem

[PeerJS](https://peerjs.com) is a great layer of abstraction above WebRTC with a simple API, though, you still need to:

- track your connections
- handle reconnects of peers when your page reloads

You don't want to think about this kind of networking problems, you want to focus on your app logic.

**webrtc-remote-control** handles all of that.

## The use case

**webrtc-remote-control** was made to handle star topology network:

<p style="text-align:center"><img src="./public/star-network-topology.png" width=200></p>

You have:

- One "master" page connected to
- Multiple "remote" pages

What you can do (through data-channel):

- From "master" page, you can send data to any or all "remote" pages
- From one "remote" page, you can send data to the master page

When "master" page drops connection (the page closes or reloads), the "remote" pages are notified (and remote automatically reconnect when master retrieves connection).

When a "remote" page drops connection (the page closes or reloads), the "master" page gets notified (and the remote reconnects to master as soon as it reloads).

## Genesis

A few years ago I made [topheman/webrtc-experiments](https://github.com/topheman/webrtc-experiments), as a proof of concept for WebRTC data-channels relying on PeerJS.
