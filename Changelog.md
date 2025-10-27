
# Changelog

## 0.1.3
	supports client behind NAT

	* Uses dgram to open sock. Reuses open socket to make requests

	* Adds MessageStore
	Uses token to identify request from message received
	UI lwm2m is not displaying response!!
	Full duplex channel was functionality was lost - recover it !!
	Add same concept to DTLS lib

	* client/registration: Open local server with local port used while registering on server
	Before registration close local server if is open

	* fix: coapClient doesn't have callback right now
	sends token on stop observation
	passes token in string format
	Adds msgId and observe to stored messages
	Adds methods to register and deregister observations on parseResponse

	* fix: Uri-Path
	token can now be passed as arg

	* server/resourceCLient: catches errors on coapPacket.parse

## 0.1.2
	Implement LwM2M client timeout functionality with offline detection and lifetime management (#43)
	add emit startObservation and stopObservation
	Observation changes
	 - index: export observationRegistry
	 - server/obsevationRegistry: removes format from registerObservation
	 
## 0.1.1
	mqttRequestHandler: adds discovery request
	Update examples to use index.js imports instead of direct module requires (#36)

## 0.1.0
	1st draft version