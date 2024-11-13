# Bootstrapping for Testing

This document describes the `ndnsec` commands to bootstrap a workspace for test using without NDN Cert.
If you do not want to generate your own certificates for test, skip steps (1)-(3).
You can directly use the result provided in the document to execute step (4).

## (1) Setup trust anchor

```text
$ ndnsec key-gen /ndn-workspace/test

Bv0BPgc0CA1uZG4td29ya3NwYWNlCAR0ZXN0CANLRVkICBRdAtiCAmT9CARzZWxm
NggAAAGTI30x/BQJGAECGQQANu6AFVswWTATBgcqhkjOPQIBBggqhkjOPQMBBwNC
AATaieiDsFxdLSi/WSDI6/ip0jpZJ0xwMAPo/WotQCETa2oBle2coLwsheuT7NP+
Oc9dwIJ8F4e7eBEV3Rz55XGGFlUbAQMcJgckCA1uZG4td29ya3NwYWNlCAR0ZXN0
CANLRVkICBRdAtiCAmT9/QD9Jv0A/g8yMDI0MTExM1QwMzA3MDf9AP8PMjA0NDEx
MDhUMDMwNzA3F0cwRQIhAOMnC+I3Mgo0kPgEv2LjDG0PEoiJbGlfuUAKhxQox/qO
AiA+9Fyba7u6k2lwsDBEhCJSs5a+rVUqhO9uD65Veh5LwA==

$ ndnsec list -vv
pib-sqlite3:
└─* /ndn-workspace/test
    └─* /ndn-workspace/test/KEY/%14%5D%02%D8%82%02d%FD
        └─* /ndn-workspace/test/KEY/%14%5D%02%D8%82%02d%FD/self/v=1731467227644

$ ndnsec cert-dump /ndn-workspace/test/KEY/%14%5D%02%D8%82%02d%FD/self/v=1731467227644
<SNIP>
```

## (2) Create certificate for node 1

Note that each node can only be used in one tab for this implementation.

```text
$ ndnsec key-gen /ndn-workspace/test/node-1
<SNIP>

$ ndnsec sign-req /ndn-workspace/test/node-1 | ndnsec cert-gen -s /ndn-workspace/test -i root

<SNIP>

$ ndnsec cert-install -

<COPY and PASTE the above>
<Alternatively: $ echo <PASTE output of cert-gen here as 1 line> | ndnsec cert-install - >
OK: certificate with name [/ndn-workspace/test/node-1/KEY/%9D%DA%9BA%DA%BC5%C9/root/v=1731467428502] has been successfully installed

$ ndnsec export -c /ndn-workspace/test/node-1/KEY/%9D%DA%9BA%DA%BC5%C9/root/v=1731467428502
Passphrase for the private key: 123456
Confirm: 123456
gP0CSgb9AVUHPAgNbmRuLXdvcmtzcGFjZQgEdGVzdAgGbm9kZS0xCANLRVkICJ3a
m0HavDXJCARyb290NggAAAGTI4BClhQJGAECGQQANu6AFVswWTATBgcqhkjOPQIB
BggqhkjOPQMBBwNCAASJDFOuIbq1SJrpMzKK+rSO/jGplsaMt/s5TSd8qEBGnUkC
+Wbh/Dw63QGMCrXTJZMFIdFjzH7If5R3grwbaHdXFmUbAQMcNgc0CA1uZG4td29y
a3NwYWNlCAR0ZXN0CANLRVkICBRdAtiCAmT9CARzZWxmNggAAAGTI30x/P0A/Sb9
AP4PMjAyNDExMTNUMDMxMDI5/QD/DzIwMjUxMTEzVDAzMTAyOBdGMEQCIHzVpQKy
6uYsxxkjTsJv2NVhAItSiPovWgBNttaG8LeiAiAbaTgd1SOSpKEnKcGaLoSkuvRv
+dbTN/RALdaNTL905YHvMIHsMFcGCSqGSIb3DQEFDTBKMCkGCSqGSIb3DQEFDDAc
BAjblNRsPNnzBAICCAAwDAYIKoZIhvcNAgkFADAdBglghkgBZQMEASoEECsIO5ke
EJNouYU54Z3Z5EQEgZAEpBKYsic9p+it9v53MPG/ivoNltv+DjGbQC+ilmaTd8ZH
K73XSk4FNxNCyTzbDOhEBKsEn8CFxc+r2gQvwsLX4wwfTnbARhInq9aGqvUoA82S
c/LV6+sNTVADsGKPY1bIV3w3wRC2Rd3TyT04azalkLkhGhNoDyb1mi3ySP9fUlYI
s6euH1O+UczI98EVsDY=
```

## (3) Create certificate for node 2

```text
$ ndnsec key-gen /ndn-workspace/test/node-2
<SNIP>

$ ndnsec sign-req /ndn-workspace/test/node-2 | ndnsec cert-gen -s /ndn-workspace/test -i root

<SNIP>

$ ndnsec cert-install -

<COPY and PASTE the above>
<Alternatively: $ echo <PASTE output of cert-gen here as 1 line> | ndnsec cert-install - >
OK: certificate with name [/ndn-workspace/test/node-2/KEY/%9C%01%EC%0E%0A%DD%9C%B2/root/v=1731468527960] has been successfully installed

$ ndnsec export -c /ndn-workspace/test/node-2/KEY/%9C%01%EC%0E%0A%DD%9C%B2/root/v=1731468527960
Passphrase for the private key: 123456
Confirm: 123456
gP0CTAb9AVcHPAgNbmRuLXdvcmtzcGFjZQgEdGVzdAgGbm9kZS0yCANLRVkICJwB
7A4K3ZyyCARyb290NggAAAGTI5EJWBQJGAECGQQANu6AFVswWTATBgcqhkjOPQIB
BggqhkjOPQMBBwNCAAQYw9dUbB3GtlzstrFcbEPrJ9NoFz1ijCQPBkUWJpjQ7gql
kCK8TjYZRjMcA7iLN+xJW7zeevgHW9Sq84TV1GnsFmUbAQMcNgc0CA1uZG4td29y
a3NwYWNlCAR0ZXN0CANLRVkICBRdAtiCAmT9CARzZWxmNggAAAGTI30x/P0A/Sb9
AP4PMjAyNDExMTNUMDMyODQ4/QD/DzIwMjUxMTEzVDAzMjg0NxdIMEYCIQDjA3XS
lVqIlOewCmHCXcKQ8lKBhqGsAroAn/cMIfKXSwIhAN5RuiW/jogJkQiwwl4P6uNr
6k1mUnSldNitkRpIvtKGge8wgewwVwYJKoZIhvcNAQUNMEowKQYJKoZIhvcNAQUM
MBwECKf8glOZszNtAgIIADAMBggqhkiG9w0CCQUAMB0GCWCGSAFlAwQBKgQQDxXO
bEV03vo9LJ/jn5KJygSBkEpnZPC80nVw1jTlsMFXxMl3j5CN5E4xM27JOwrQEqJB
k/In7EAxH8WetK67kcybrqAlxZOOb5HFfYhiMmF3iCjrF8vguJ4HGe1+JFmYnSeV
8f8eyRiiaOOVY+cLWixaVITSjbb2rZKNnrRacT1jjsGtCubEb4fOSJa7aUO6qpQJ
hf+IJPkG3kTLW9FLv2kISA==
```

## (4) Bootstrap in the webpage

- Initialize the workspace
  - Open one page and enter the `Workspace` tab
  - Paste the trust anchor
  - Paste the SafeBag of one node
  - Click `CREATE`
  - Setup Connection if not yet
- Join the workspace
  - Open one page and enter the `Workspace` tab
  - Paste the trust anchor
  - Paste the SafeBag of the other node
  - Click `JOIN`
  - Setup Connection if not yet

NOTE:

- Make sure exactly one node clicks the `CREATE` button
- Make sure safebags are not reused
- The order of bootstrapping and connection setup does not matter.
  However, if you bootstrap first and forget to setup the connection,
  other pages (LaTeX and A-Frame) will be running in offline mode without telling you so.
