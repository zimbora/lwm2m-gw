
# Lwm2m Node.js Library

## Demo

### Launch server

>> node server/server.js | npx pino-pretty

### Launch client

>> node client/client.js

with pino prety - nice output logs
>> node client/client.js | npx pino-pretty

## Tests

### Global
>> npm test

### File
>> npx jest test/client/resourceServer.test.js

This project implements a Lightweight Machine to Machine (LwM2M) client and server in Node.js using CoAP.

---

## ✅ LwM2M Node.js Capabilities Overview

| Feature                              | 🌐 Client                         | 🖥️ Server                           | ✅ Tests        |
|--------------------------------------|-----------------------------------|-------------------------------------|-----------------|
| **Bootstrap Server**                 |                                   |                                     |                 |
| LwM2M Registration (`/rd`)           | 🕐 Planned                        | 🕐 Planned                          | 🛑 Not Covered  |

| **Server**                           |                                   |                                     |                 |
| LwM2M Registration (`/rd`)           | ✅ Sends registration             | ✅ Handles registration             | 🟡 Server	   |
| Registration Update (`/rd/{id}`)     | ✅ Supports                       | ✅ Handles update                   | 🛑 Not Covered  |
| Deregistration                       | ✅ Sends                          | ✅ Handles deregistration           | 🛑 Not Covered  |
| Error Detection / Retry              | ✅ Logs failures                  | ✅ Detects connection loss          | 🛑 Not Covered  |
| Event-Driven Responses               | 🕐 Planned                        | ✅ Emits payload per request        | 🛑 Not Covered  |

| **Object Model / Discovery**         |                                   |                                     |                 |
| Built-in Objects (0–6 + 3303)        | ✅ Fully implemented              | 🕐 Used via client introspection    | 🛑 Not Covered  |
| Well-Known Core Discovery            | ✅ Responds with `</x/y/z>;attr`  | ✅ Parses and lists resources       | 🛑 Not Covered  |
| Resource Metadata (R/W/X/Obs/Units)  | ✅ Defined per object             | ✅ Discoverable via `/core`         | 🛑 Not Covered  |
| Multiple Instances                   | 🕐 Planned                        | 🕐 Planned                          | 🛑 Not Covered  |

| **Resource Access**                  |                                   |                                     |                 |
| Resource Read                        | ✅ Responds with value            | ✅ Sends GET request                | 🛑 Not Covered  |
| Resource Write                       | ✅ Accepts PUT                    | ✅ Sends PUT                        | 🛑 Not Covered  |
| Resource Execute                     | ✅ Handles function call          | ✅ Sends POST                       | 🛑 Not Covered  |
| Resource Observation                 | ✅ Manages and sends notifications| ✅ Sends GET with Observe=0         | 🛑 Not Covered  |
| Resource Write attribute             | 🟡 Partially                      | 🛑 Not yet                          | 🛑 Not Covered  |
| Object,InstanceId Create             | 🟡 Partially                      | 🛑 Not yet                          | 🛑 Not Covered  |
| Object,InstaceId Delete              | 🟡 Partially                      | 🛑 Not yet                          | 🛑 Not Covered  |
| Manual Notification Push             | ✅ Interval-based observe         | ✅ Receives notifications           | 🛑 Not Covered  |

| **Data Formats**                     |                                   |                                     |                 |
| Text Format (`Content-Format: 0`)    | ✅ Default/fallback               | ✅ Default/fallback                 | 🛑 Not Covered  |
| CBOR Support (`Content-Format: 60`)  | ✅ Encode/decode (⚠️ untested)    | ✅ Encode/decode (⚠️ untested)      | ✅ Covered      |
| TLV Support (`Content-Format: 11542`)| ✅ Encode/decode (⚠️ untested)    | ✅ Encode/decode (⚠️ untested)      | ✅ Covered      |

| **Transport Layers**                 |                                   |                                     |                 |
| COAP                                 | ✅ Default                        | ✅ Default                          | 🛑 Not Covered  |
| MQTT                                 | ⚠️ untested                       | ⚠️ untested                         | 🛑 Not Covered  |
| Bridge COAP/MQTT                     | 🕐 Planned                        | 🕐 Planned                          | 🛑 Not Covered  |

| **Fota**                             |                                   |                                     |                 |
| UDP                                  | 🕐 Planned                        | 🕐 Planned                          | 🛑 Not Covered  |
| HTTP                                 | 🛑 Not yet                        | 🛑 Not yet                          | 🛑 Not Covered  |

| **Extra Features**                   |                                   |                                     |                 |
| Object 3303 Temperature (Simulated)  | ✅ Periodic updates               | ✅ Observes value                   | 🛑 Not Covered  |
| Security: DTLS, OSCORE               | 🛑 Not yet                        | 🛑 Not yet                          | 🛑 Not Covered  |
| Persistant Storage                   | 🛑 Not yet                        | 🛑 Not yet                          | 🛑 Not Covered  |


---

## Usage

- Start the client to simulate a device with observable resources.
- Run the server to manage registrations, handle resource operations, and observe notifications.
- Explore `.well-known/core` for resource discovery.
- Utilize CBOR or TLV encoding/decoding for efficient payload exchange.

---

## TODO

- Implement OSCORE encryption for secure communication.
- Add DTLS support.
- Integrate serial hardware interfaces.
- Enhance error handling and retry mechanisms.
- Fully test CBOR and TLV encoding/decoding.

---

## Contributing

Feel free to open issues or submit pull requests to improve this library!

---

*Made with ❤️ for LwM2M enthusiasts.*

