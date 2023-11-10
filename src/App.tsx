import { Typography } from "@suid/material"

function App() {
  return (
    <>
      <Typography variant='h3'>NDN Workspace Prototype</Typography>
      <Typography variant='h4'>Quick Start</Typography>
      <Typography variant='body1'>
        1. Click <span style={{ "font-family": "'Roboto Mono'" }}>Workspace</span> on the left panel.
      </Typography>
      <Typography variant='body1'>
        2. Copy the following configuration. (You may need an extra window to memo the text.)<br />
        <br />
      </Typography>
      <Typography variant='body1' color='primary'>
        The Workspace -- Trust Anchor
      </Typography>
      <Typography variant='body2' style={{ "font-family": "'Roboto Mono'" }}>
        Bv0BPQc0CA1uZG4td29ya3NwYWNlCAR0ZXN0CANLRVkICFJS7LZ8gfUFCARzZWxm<br />
        NggAAAGLZIrN/xQJGAECGQQANu6AFVswWTATBgcqhkjOPQIBBggqhkjOPQMBBwNC<br />
        AATxuBAe/TYwLQ9e8Zt4cEXW1NPYAW3uooS+ZXTWeqLaXWF8Rlj4CzVzX8SPYiV8<br />
        peenggFj5b3qEuMiBPlDQblvFlUbAQMcJgckCA1uZG4td29ya3NwYWNlCAR0ZXN0<br />
        CANLRVkICFJS7LZ8gfUF/QD9Jv0A/g8yMDIzMTAyNVQwMTU1MDD9AP8PMjA0MzEw<br />
        MjBUMDE1NTAwF0YwRAIgRWW2rafR0vHSsA7uAeb78nSFUPxO0gAwl9KKMzJwuJgC<br />
        IEi9gc1gaM3/GYatfQUytQhvOnFxEEnWx+q4MxK7+Knh<br />
        <br />
      </Typography>
      <Typography variant='body1' color='primary'>
        Myself -- SafeBag
      </Typography>
      <Typography variant='body2' style={{ "font-family": "'Roboto Mono'" }}>
        gP0CTAb9AVcHPAgNbmRuLXdvcmtzcGFjZQgEdGVzdAgGbm9kZS0xCANLRVkICB5p<br />
        PHZRduI4CARyb290NggAAAGLZJg/khQJGAECGQQANu6AFVswWTATBgcqhkjOPQIB<br />
        BggqhkjOPQMBBwNCAASk9iDwa34xP6AVh+Tq1p3DOm+vnKrk1NhQVqI0xu2DfMC+<br />
        iVeadwFVARAdyK0qbL0jglvafAKuInA724bah4iBFmUbAQMcNgc0CA1uZG4td29y<br />
        a3NwYWNlCAR0ZXN0CANLRVkICFJS7LZ8gfUFCARzZWxmNggAAAGLZIrN//0A/Sb9<br />
        AP4PMjAyMzEwMjVUMDIwOTQy/QD/DzIwMjQxMDI0VDAyMDk0MRdIMEYCIQDEBkRW<br />
        NaTY/ZXMTxiaqODxQgdqsr4euk++p5He2poe1QIhALsIQ5lMaezohdK26F6XKEbs<br />
        U4y4gzmjKndqWgVK+VtSge8wgewwVwYJKoZIhvcNAQUNMEowKQYJKoZIhvcNAQUM<br />
        MBwECM1iEbeCGkEuAgIIADAMBggqhkiG9w0CCQUAMB0GCWCGSAFlAwQBKgQQNGCb<br />
        h/XjiJahRrixryuvsASBkFeDVAPuLCMhNlozQUsYOUwR3Ub9EeITN6K/sETfFKFr<br />
        FXtrkiFrM5LX2+qHa3Ki83OU69HLCDvD18lPejvZ+K1+UWWsxLinO3h1BHtUxhq9<br />
        qpNeJ/HDJ+ghmgCx9XhaFkv/itWoU6AqKWWzUHCIzeXktQ22b17Ebj9kXcqGJTGL<br />
        AqzhtnXfjep41mfBjBUuiw==<br />
        <br />
      </Typography>
      <Typography variant='body1' color='primary'>
        Myself -- Passphrase
      </Typography>
      <Typography variant='body2' style={{ "font-family": "'Roboto Mono'" }}>
        123456<br />
        <br />
      </Typography>
      <Typography variant='body1'>
        3. Click "CREATE" on the bottom of the page.
      </Typography>
      <Typography variant='body1'>
        4. Start a local NFD instance.
      </Typography>
      <Typography variant='body1'>
        5. Click <span style={{ "font-family": "'Roboto Mono'" }}>Connection</span> on the left,
        and then "CONNECT" in the WebSocket section. The default setting is the NFD on localhost.
      </Typography>
      <Typography variant='body1'>
        6. Then you will be able to use the LaTeX and A-Frame. You can disconnect and reconnect at any time.
      </Typography>
      <Typography variant='body1'>
        7. To start a second App instance, open a new window and repeat these steps.
        However, you need to use a different SafeBag at step 2 and click "JOIN" at step 3. <br />
        <br />
      </Typography>
      <Typography variant='body1' color='primary'>
        Myself -- SafeBag (node 2)
      </Typography>
      <Typography variant='body2' style={{ "font-family": "'Roboto Mono'" }}>
        gP0CSwb9AVYHPAgNbmRuLXdvcmtzcGFjZQgEdGVzdAgGbm9kZS0yCANLRVkICG0T<br />
        2mtJZDFWCARyb290NggAAAGLZJoxgRQJGAECGQQANu6AFVswWTATBgcqhkjOPQIB<br />
        BggqhkjOPQMBBwNCAATvyM+YO9/RWllBkDkr/Pu/TCZMiEDY6H7rkwoHhU267LdH<br />
        +XM4HgavvQcU7/kQx0SMPzFlKl1cBRHgami6C9+XFmUbAQMcNgc0CA1uZG4td29y<br />
        a3NwYWNlCAR0ZXN0CANLRVkICFJS7LZ8gfUFCARzZWxmNggAAAGLZIrN//0A/Sb9<br />
        AP4PMjAyMzEwMjVUMDIxMTQ5/QD/DzIwMjQxMDI0VDAyMTE0OBdHMEUCIC4AvX8F<br />
        Q19e+08fUvL6+UcLMhtcsbRlcX/VA4b+0uRxAiEAhEHYzYBBBNOCH7LelcwJ12f+<br />
        amtgBvXaTSAjmWA4CWuB7zCB7DBXBgkqhkiG9w0BBQ0wSjApBgkqhkiG9w0BBQww<br />
        HAQIfAcyXQiSbSgCAggAMAwGCCqGSIb3DQIJBQAwHQYJYIZIAWUDBAEqBBAeVjub<br />
        zfiRo/JfPmnW0bS9BIGQ183XD0RmcyNdxMzJtXKiNY12ST1G2Em5DfYHtWueywdI<br />
        xIr0U+no8kchpCABShtoz9aqFb5TgEmbevYavyFbF5P3byqK36jELjuAvVaJAQRl<br />
        fnI+BXFXipCPj8vqDswoovUHn/rBMXsoaUHjNqZ2/4nIBlc5PWNcDhZywF4e/Wvz<br />
        wTeeVxSVnsyT6d8V2bTA<br />
        <br />
      </Typography>
      <Typography variant='body1'>
        Make sure you click "JOIN" this time.
      </Typography>
    </>
  )
}

export default App
