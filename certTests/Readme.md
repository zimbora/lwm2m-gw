# CoAP + DTLS (ECDSA)

## Steps to generate CA, cert and keys..

### Generate CA private key

openssl ecparam -name prime256v1 -genkey -noout -out ca-key.pem

### Create CA certificate (self-signed, valid for 10 years)

openssl req -x509 -new -nodes -key ca-key.pem -sha256 -days 3650 \
 -subj "/CN=TestCA" \
 -out ca-cert.pem

### Generate server private key

openssl ecparam -name prime256v1 -genkey -noout -out server-key.pem

### Create server certificate signing request (CSR)

openssl req -new -key server-key.pem -subj "/CN=server" -out server-csr.pem

### Sign the server CSR with the CA

openssl x509 -req -in server-csr.pem -CA ca-cert.pem -CAkey ca-key.pem -CAcreateserial \
 -out server-cert.pem -days 365 -sha256

### Generate client private key

openssl ecparam -name prime256v1 -genkey -noout -out client-key.pem

### Create client CSR

openssl req -new -key client-key.pem -subj "/CN=client" -out client-csr.pem

### Sign client CSR with CA

openssl x509 -req -in client-csr.pem -CA ca-cert.pem -CAkey ca-key.pem -CAcreateserial \
 -out client-cert.pem -days 365 -sha256

## Debug - Inspect certs and keys

### Inspect keys

> > openssl pkey -in server-key.pem -text -noout
> > openssl pkey -in client-key.pem -text -noout

### Inspect certificates

> > openssl x509 -in server-cert.pem -text -noout
> > openssl x509 -in client-cert.pem -text -noout

## Launch server

coap-server -v9 -p 5684 -c server-cert.pem -j server-key.pem -R ca-cert.pem

## Launch client

coap-client -v9 -m GET -j client-key.pem -c client-cert.pem -R ca-cert.pem coaps://localhost:5685/.well-known/core

Args:
-j keyfile PEM file or PKCS11 URI for the private key for the
certificate in '-c certfile' if the parameter is
different from certfile in '-c certfile'

-c certfile PEM file or PKCS11 URI for the certificate. The private
key can also be in the PEM file, or has the same PKCS11
URI. If not, the private key is defined by '-j keyfile'
If both the '-c certfile' and '-k key' options are not
provided, but the protocol is using encryption (e.g.
coaps), then the client logic will use internally
generated certificates (as do web browsers) but will
check the server certificate based on the trust store
(or the '-R trust_casfile' option) unless the '-n'
option is specified

-C cafile PEM file or PKCS11 URI for the CA certificate and any
intermediate CAs that was
used to sign the server certfile. Ideally the client
certificate should be signed by the same CA so that
mutual authentication can take place. The contents of
cafile are added to the trusted store of root CAs.
Using the -C or -R options will trigger the
validation of the server certificate unless overridden
by the -n option

-R trust_casfile
PEM file containing the set of trusted root CAs
that are to be used to validate the server certificate.
Alternatively, this can point to a directory containing
a set of CA PEM files.
Using '-R trust_casfile' disables common CA mutual
authentication which can only be done by using
'-C cafile'.
Using the -C or -R options will trigger the
validation of the server certificate unless overridden
by the -n option

-n Disable remote peer certificate checking

## Output from server

Aug 06 15:17:54.935 1 DEBG **_[::ffff:127.0.0.1]:5685 <-> [::ffff:127.0.0.1]:38064 (if1) DTLS: session 0x618635a75270: new incoming session
Aug 06 15:17:54.935 1 DEBG _**EVENT: COAP_EVENT_SERVER_SESSION_NEW
Aug 06 15:17:54.935 1 DEBG _ [::ffff:127.0.0.1]:5685 <-> [::ffff:127.0.0.1]:38064 (if1) DTLS: netif: recv 279 bytes
Aug 06 15:17:54.935 1 DEBG _ [::ffff:127.0.0.1]:5685 <-> [::ffff:127.0.0.1]:38064 (if1) DTLS: netif: sent 60 bytes
Aug 06 15:17:54.935 1 DEBG _ [::ffff:127.0.0.1]:5685 <-> [::ffff:127.0.0.1]:38064 (if1) DTLS: netif: recv 311 bytes
Aug 06 15:17:54.937 1 DEBG [::ffff:127.0.0.1]:5685 <-> [::ffff:127.0.0.1]:38064 (if1) DTLS: Using PKI ciphers
Aug 06 15:17:54.937 1 DEBG _ [::ffff:127.0.0.1]:5685 <-> [::ffff:127.0.0.1]:38064 (if1) DTLS: netif: sent 1024 bytes
Aug 06 15:17:54.940 1 DEBG _ [::ffff:127.0.0.1]:5685 <-> [::ffff:127.0.0.1]:38064 (if1) DTLS: netif: recv 936 bytes
Aug 06 15:17:54.941 1 INFO [::ffff:127.0.0.1]:5685 <-> [::ffff:127.0.0.1]:38064 (if1) DTLS: unable to get certificate CRL: overridden: 'client' depth=0
Aug 06 15:17:54.941 1 INFO CN 'TestCA' presented by client (CA)
Aug 06 15:17:54.941 1 INFO CN 'client' presented by client (Certificate)
Aug 06 15:17:54.942 1 DEBG _ [::ffff:127.0.0.1]:5685 <-> [::ffff:127.0.0.1]:38064 (if1) DTLS: netif: sent 570 bytes
Aug 06 15:17:54.943 1 DEBG **_EVENT: COAP_EVENT_DTLS_CONNECTED
Aug 06 15:17:54.943 1 DEBG _**[::ffff:127.0.0.1]:5685 <-> [::ffff:127.0.0.1]:38064 (if1) DTLS: session connected

## Output from client

Aug 06 15:17:54.934 1 DEBG **_127.0.0.1:38064 <-> 127.0.0.1:5685 DTLS: new outgoing session
Aug 06 15:17:54.934 1 DEBG _ 127.0.0.1:38064 <-> 127.0.0.1:5685 DTLS: netif: sent 279 bytes
Aug 06 15:17:54.935 1 DEBG timeout is set to 90 seconds
Aug 06 15:17:54.935 1 DEBG sending CoAP request:
Aug 06 15:17:54.935 1 DEBG ** 127.0.0.1:38064 <-> 127.0.0.1:5685 DTLS: mid=0x6f99: delayed
Aug 06 15:17:54.935 1 DEBG _ 127.0.0.1:38064 <-> 127.0.0.1:5685 DTLS: netif: recv 60 bytes
Aug 06 15:17:54.935 1 DEBG _ 127.0.0.1:38064 <-> 127.0.0.1:5685 DTLS: netif: sent 311 bytes
Aug 06 15:17:54.937 1 DEBG _ 127.0.0.1:38064 <-> 127.0.0.1:5685 DTLS: netif: recv 1024 bytes
Aug 06 15:17:54.938 1 INFO 127.0.0.1:38064 <-> 127.0.0.1:5685 DTLS: unable to get certificate CRL: overridden: 'localhost' depth=0
Aug 06 15:17:54.938 1 INFO CN 'TestCA' presented by server (CA)
Aug 06 15:17:54.939 1 INFO CN 'localhost' presented by server (Certificate)
Aug 06 15:17:54.940 1 DEBG _ 127.0.0.1:38064 <-> 127.0.0.1:5685 DTLS: netif: sent 936 bytes
Aug 06 15:17:54.943 1 DEBG \* 127.0.0.1:38064 <-> 127.0.0.1:5685 DTLS: netif: recv 570 bytes
Aug 06 15:17:54.943 1 DEBG \*\*\*EVENT: COAP_EVENT_DTLS_CONNECTED

# CoAP + DTLS (PSK)

## Define your identity and shared key

IDENTITY="my_identity"
KEY="secretPSK123" # Must be in hex or ASCII (see notes below)

## Launch Coap Server

coap-server -v9 -p 5684 \
 -k "$KEY" \
  -h "$IDENTITY"

## Launch Coap Client

coap-client -v9 -m GET \
 -u "$IDENTITY" \
  -k "$KEY" \
 coaps://localhost:5684/.well-known/core

## Example

### Server

coap-server -v9 -p 5684 -k 736563726574 -h my_identity

### Client

coap-client -v9 -m GET -u my_identity -k 736563726574 coaps://localhost:5685/.well-known/core
