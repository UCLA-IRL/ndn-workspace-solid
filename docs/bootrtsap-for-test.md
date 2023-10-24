# Bootstrapping for Testing

This document describes the `ndnsec` commands to bootstrap a workspace for test using without NDN Cert.

## (1) Setup trust anchor

```text
$ ndnsec key-gen /ndn-workspace/test

Bv0BPQc0CA1uZG4td29ya3NwYWNlCAR0ZXN0CANLRVkICFJS7LZ8gfUFCARzZWxm
NggAAAGLZIrN/xQJGAECGQQANu6AFVswWTATBgcqhkjOPQIBBggqhkjOPQMBBwNC
AATxuBAe/TYwLQ9e8Zt4cEXW1NPYAW3uooS+ZXTWeqLaXWF8Rlj4CzVzX8SPYiV8
peenggFj5b3qEuMiBPlDQblvFlUbAQMcJgckCA1uZG4td29ya3NwYWNlCAR0ZXN0
CANLRVkICFJS7LZ8gfUF/QD9Jv0A/g8yMDIzMTAyNVQwMTU1MDD9AP8PMjA0MzEw
MjBUMDE1NTAwF0YwRAIgRWW2rafR0vHSsA7uAeb78nSFUPxO0gAwl9KKMzJwuJgC
IEi9gc1gaM3/GYatfQUytQhvOnFxEEnWx+q4MxK7+Knh

$ ndnsec list -vv
pib-sqlite3:
└─* /ndn-workspace/test
    └─* /ndn-workspace/test/KEY/RR%EC%B6%7C%81%F5%05
        └─* /ndn-workspace/test/KEY/RR%EC%B6%7C%81%F5%05/self/v=1698198900223

$ ndnsec cert-dump /ndn-workspace/test/KEY/RR%EC%B6%7C%81%F5%05/self/v=1698198900223
<SNIP>
```

## (2) Create certificate for node 1

Note that each node can only be used in one tab for this implementation.

```text
$ ndnsec key-gen /ndn-workspace/test/node-1
<SNIP>

$ ndnsec sign-req /ndn-workspace/test/node-1 | ndnsec cert-gen -s /ndn-workspace/test -i root

Bv0BVwc8CA1uZG4td29ya3NwYWNlCAR0ZXN0CAZub2RlLTEIA0tFWQgIHmk8dlF2
4jgIBHJvb3Q2CAAAAYtkmD+SFAkYAQIZBAA27oAVWzBZMBMGByqGSM49AgEGCCqG
SM49AwEHA0IABKT2IPBrfjE/oBWH5OrWncM6b6+cquTU2FBWojTG7YN8wL6JV5p3
AVUBEB3IrSpsvSOCW9p8Aq4icDvbhtqHiIEWZRsBAxw2BzQIDW5kbi13b3Jrc3Bh
Y2UIBHRlc3QIA0tFWQgIUlLstnyB9QUIBHNlbGY2CAAAAYtkis3//QD9Jv0A/g8y
MDIzMTAyNVQwMjA5NDL9AP8PMjAyNDEwMjRUMDIwOTQxF0gwRgIhAMQGRFY1pNj9
lcxPGJqo4PFCB2qyvh66T76nkd7amh7VAiEAuwhDmUxp7OiF0rboXpcoRuxTjLiD
OaMqd2paBUr5W1I=

$ ndnsec cert-install -

<COPY and PASTE the above>
OK: certificate with name [/ndn-workspace/test/node-1/KEY/%1Ei%3CvQv%E28/root/v=1698199781266] has been successfully installed

$ ndnsec export -c /ndn-workspace/test/node-1/KEY/%1Ei%3CvQv%E28/root/v=1698199781266
Passphrase for the private key: 123456
Confirm: 123456
gP0CTAb9AVcHPAgNbmRuLXdvcmtzcGFjZQgEdGVzdAgGbm9kZS0xCANLRVkICB5p
PHZRduI4CARyb290NggAAAGLZJg/khQJGAECGQQANu6AFVswWTATBgcqhkjOPQIB
BggqhkjOPQMBBwNCAASk9iDwa34xP6AVh+Tq1p3DOm+vnKrk1NhQVqI0xu2DfMC+
iVeadwFVARAdyK0qbL0jglvafAKuInA724bah4iBFmUbAQMcNgc0CA1uZG4td29y
a3NwYWNlCAR0ZXN0CANLRVkICFJS7LZ8gfUFCARzZWxmNggAAAGLZIrN//0A/Sb9
AP4PMjAyMzEwMjVUMDIwOTQy/QD/DzIwMjQxMDI0VDAyMDk0MRdIMEYCIQDEBkRW
NaTY/ZXMTxiaqODxQgdqsr4euk++p5He2poe1QIhALsIQ5lMaezohdK26F6XKEbs
U4y4gzmjKndqWgVK+VtSge8wgewwVwYJKoZIhvcNAQUNMEowKQYJKoZIhvcNAQUM
MBwECM1iEbeCGkEuAgIIADAMBggqhkiG9w0CCQUAMB0GCWCGSAFlAwQBKgQQNGCb
h/XjiJahRrixryuvsASBkFeDVAPuLCMhNlozQUsYOUwR3Ub9EeITN6K/sETfFKFr
FXtrkiFrM5LX2+qHa3Ki83OU69HLCDvD18lPejvZ+K1+UWWsxLinO3h1BHtUxhq9
qpNeJ/HDJ+ghmgCx9XhaFkv/itWoU6AqKWWzUHCIzeXktQ22b17Ebj9kXcqGJTGL
AqzhtnXfjep41mfBjBUuiw==
```

## (3) Create certificate for node 2


```text
$ ndnsec key-gen /ndn-workspace/test/node-2
<SNIP>

$ ndnsec sign-req /ndn-workspace/test/node-2 | ndnsec cert-gen -s /ndn-workspace/test -i root

Bv0BVgc8CA1uZG4td29ya3NwYWNlCAR0ZXN0CAZub2RlLTIIA0tFWQgIbRPaa0lk
MVYIBHJvb3Q2CAAAAYtkmjGBFAkYAQIZBAA27oAVWzBZMBMGByqGSM49AgEGCCqG
SM49AwEHA0IABO/Iz5g739FaWUGQOSv8+79MJkyIQNjofuuTCgeFTbrst0f5czge
Bq+9BxTv+RDHRIw/MWUqXVwFEeBqaLoL35cWZRsBAxw2BzQIDW5kbi13b3Jrc3Bh
Y2UIBHRlc3QIA0tFWQgIUlLstnyB9QUIBHNlbGY2CAAAAYtkis3//QD9Jv0A/g8y
MDIzMTAyNVQwMjExNDn9AP8PMjAyNDEwMjRUMDIxMTQ4F0cwRQIgLgC9fwVDX177
Tx9S8vr5RwsyG1yxtGVxf9UDhv7S5HECIQCEQdjNgEEE04Ifst6VzAnXZ/5qa2AG
9dpNICOZYDgJaw==

$ ndnsec cert-install -

<COPY and PASTE the above>
OK: certificate with name [/ndn-workspace/test/node-2/KEY/m%13%DAkId1V/root/v=1698199908737] has been successfully installed

$ ndnsec export -c /ndn-workspace/test/node-2/KEY/m%13%DAkId1V/root/v=1698199908737
Passphrase for the private key: 123456
Confirm: 123456
gP0CSwb9AVYHPAgNbmRuLXdvcmtzcGFjZQgEdGVzdAgGbm9kZS0yCANLRVkICG0T
2mtJZDFWCARyb290NggAAAGLZJoxgRQJGAECGQQANu6AFVswWTATBgcqhkjOPQIB
BggqhkjOPQMBBwNCAATvyM+YO9/RWllBkDkr/Pu/TCZMiEDY6H7rkwoHhU267LdH
+XM4HgavvQcU7/kQx0SMPzFlKl1cBRHgami6C9+XFmUbAQMcNgc0CA1uZG4td29y
a3NwYWNlCAR0ZXN0CANLRVkICFJS7LZ8gfUFCARzZWxmNggAAAGLZIrN//0A/Sb9
AP4PMjAyMzEwMjVUMDIxMTQ5/QD/DzIwMjQxMDI0VDAyMTE0OBdHMEUCIC4AvX8F
Q19e+08fUvL6+UcLMhtcsbRlcX/VA4b+0uRxAiEAhEHYzYBBBNOCH7LelcwJ12f+
amtgBvXaTSAjmWA4CWuB7zCB7DBXBgkqhkiG9w0BBQ0wSjApBgkqhkiG9w0BBQww
HAQIfAcyXQiSbSgCAggAMAwGCCqGSIb3DQIJBQAwHQYJYIZIAWUDBAEqBBAeVjub
zfiRo/JfPmnW0bS9BIGQ183XD0RmcyNdxMzJtXKiNY12ST1G2Em5DfYHtWueywdI
xIr0U+no8kchpCABShtoz9aqFb5TgEmbevYavyFbF5P3byqK36jELjuAvVaJAQRl
fnI+BXFXipCPj8vqDswoovUHn/rBMXsoaUHjNqZ2/4nIBlc5PWNcDhZywF4e/Wvz
wTeeVxSVnsyT6d8V2bTA
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
