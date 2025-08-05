
# Lwm2m Node.js Library

## Demo

### Launch Bootstrap Server

>> node server/bootstrapServer.js | npx pino-pretty

### Launch Main LwM2M Server

>> node server/server.js | npx pino-pretty

### Launch Bootstrap Client

>> node client/bootstrapClient.js | npx pino-pretty

### Launch Standard Client

>> node client/client.js | npx pino-pretty

The bootstrap client will automatically:
1. Connect to bootstrap server (port 5684)
2. Receive security and server configuration 
3. Register to main LwM2M server (port 5683)
4. Begin normal LwM2M operations

This project implements a Lightweight Machine to Machine (LwM2M) client and server in Node.js using CoAP.

---

## ✅ LwM2M Node.js Capabilities Overview

| Feature                              | 🌐 Client                         | 🖥️ Server                           | ✅ Auto Tests   |
|--------------------------------------|-----------------------------------|-------------------------------------|-----------------|
| **Bootstrap Server**                 |                                   |                                     |                 |
| Bootstrap Request Handling           | ✅ Supports bootstrap requests   | ✅ Handles `/bs` endpoint           | ✅ Covered      |
| Security Object Provisioning        | ✅ Receives provisioned config   | ✅ Creates security instances       | ✅ Covered      |
| Server Object Provisioning          | ✅ Receives provisioned config   | ✅ Creates server instances         | ✅ Covered      |
| Bootstrap Finish                     | ✅ Sends finish notification     | ✅ Handles `/bs-finish` endpoint    | ✅ Covered      |
| Configuration Management             | 🕐 Planned                        | ✅ Per-endpoint configuration       | 🟡 Partial      |
|                                      |                                   |                                     |                 |
| **Server**                           |                                   |                                     |                 |
| LwM2M Registration (`/rd`)           | ✅ Sends registration             | ✅ Handles registration             | ✅ Covered	   |
| Registration Update (`/rd/{id}`)     | ✅ Supports                       | ✅ Handles update                   | ✅ Covered      |
| Deregistration                       | ✅ Sends                          | ✅ Handles deregistration           | ✅ Covered      |
| Error Detection / Retry              | ✅ Logs failures                  | ✅ Detects connection loss          | 🛑 Not Covered  |
| Event-Driven Responses               | 🕐 Planned                        | ✅ Emits payload per request        | 🟡 server       |
|                                      |                                   |                                     |                 |
| **Object Model / Discovery**         |                                   |                                     |                 |
| Built-in Objects (0–6 + 3303)        | ✅ Fully implemented              | 🕐 Used via client introspection    | 🛑 Not Covered  |
| Well-Known Core Discovery            | ✅ Responds with `</x/y/z>;attr`  | ✅ Parses and lists resources       | 🟡 server       |
| Resource Metadata (R/W/X/Obs/Units)  | ✅ Defined per object             | ✅ Discoverable via `/core`         | 🛑 Not Covered  |
| Multiple Instances                   | 🕐 Planned                        | 🕐 Planned                          | 🛑 Not Covered  |
|                                      |                                   |                                     |                 |
| **Resource Access**                  |                                   |                                     |                 |
| Resource Read                        | ✅ Responds with value            | ✅ Sends GET request                | ✅ Covered      |
| Resource Write                       | ✅ Accepts PUT                    | ✅ Sends PUT                        | ✅ Covered      |
| Resource Execute                     | ✅ Handles function call          | ✅ Sends POST                       | ✅ Covered      |
| Resource Observation                 | ✅ Manages and sends notifications| ✅ Sends GET with Observe=0         | ✅ Covered      |
| Resource Write attribute             | 🟡 Partially                      | 🛑 Not yet                          | 🛑 Not Covered  |
| Object,InstanceId Create             | 🟡 Partially                      | 🛑 Not yet                          | 🛑 Not Covered  |
| Object,InstaceId Delete              | 🟡 Partially                      | 🛑 Not yet                          | 🛑 Not Covered  |
| Manual Notification Push             | ✅ Interval-based observe         | ✅ Receives notifications           | 🛑 Not Covered  |
|                                      |                                   |                                     |                 |
| **Data Formats**                     |                                   |                                     |                 |
| Text Format (`Content-Format: 0`)    | ✅ Default/fallback               | ✅ Default/fallback                 | ✅ Covered      |
| Link Format (`Content-Format: 40`)   | ✅ Encode/decode (⚠️ untested)    | ✅ Encode/decode 			         | ✅ Covered      |
| JSON Format (`Content-Format: 50`)   | ✅ Encode/decode (⚠️ untested)    | ✅ Encode/decode 			         | ✅ Covered      |
| TLV LwM2M (`Content-Format: 60`)     | ✅ Encode/decode (⚠️ untested)    | ✅ Encode/decode                    | ✅ Covered      |
| JSON LwM2M (`Content-Format: 61`)    | ✅ Encode/decode (⚠️ untested)    | ✅ Encode/decode                    | ✅ Covered      |
| CBOR LwM2M (`Content-Format: 62`)    | ✅ Encode/decode (⚠️ untested)    | ✅ Encode/decode 			         | ✅ Covered      |
|                                      |                                   |                                     |                 |
| **Transport Layers**                 |                                   |                                     |                 |
| COAP                                 | ✅ Default                        | ✅ Default                          | 🛑 Not Covered  |
| MQTT                                 | ⚠️ untested                       | ⚠️ untested                         | 🛑 Not Covered  |
| Bridge COAP/MQTT                     | 🕐 Planned                        | 🕐 Planned                          | 🛑 Not Covered  |
|                                      |                                   |                                     |                 |
| **Fota**                             |                                   |                                     |                 |
| UDP                                  | 🕐 Planned                        | 🕐 Planned                          | 🛑 Not Covered  |
| HTTP                                 | 🛑 Not yet                        | 🛑 Not yet                          | 🛑 Not Covered  |
|                                      |                                   |                                     |                 |
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
- Enhance error handling and retry mechanisms.

---

## Contributing

Feel free to open issues or submit pull requests to improve this library!

---

*Made with ❤️ for LwM2M enthusiasts.*

