# Errors during installation 
## pnpm: not found: node
  - For this error, Node was not properly installed
  - Install Newest Node version
  ```
  # Install nvm
  $ curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
  # Install node
  $ nvm install 20
  # Check Node version, should be > 18.12
  $ node -v
  ```

## ERR_SOCKET_TIMEOUT
  - Full example error: 
  
```
WARN  GET https://registry.npmjs.org/@codemirror/language/-/language-6.10.2.tgz error (ERR_SOCKET_TIMEOUT). Will retry in 10 seconds. 2 retries left.
```

  - One solution is to disable IPv6
  ```
  # 1. Open and Edit the sysctl configuration file:
    $ sudo nano /etc/sysctl.conf
  
  # 2. Add the following lines to the end of the file:
  	net.ipv6.conf.all.disable_ipv6 = 1
		net.ipv6.conf.default.disable_ipv6 = 1
		net.ipv6.conf.lo.disable_ipv6 = 1
  # 3. Press Ctrl-x to save the file

  # 4. Apply the changes:
    $ sudo sysctl -p
  
  # 5. Try pnpm install again
    $ pnpm install
  ```

## Unauthorized - 401
  - Example error message:
  ```
  ERR_PNPM_FETCH_401  GET https://npm.pkg.github.com/download/@ucla-irl/ndnts-aux/3.0.3/0a1a5f599ca4e133e338b1a2e9c6d776360a48bf: Unauthorized - 401
  ```

- To solve this problem:
1. Follow this guide to create a personal access token, remember to save your password, you will use it later https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens
2. Run this command  ```pnpm login --scope=@ucla-irl --auth-type=legacy --registry=https://npm.pkg.github.com``` (source: https://github.com/UCLA-IRL/ndnts-aux)
    - Enter your github username and the personal access token password you took note above.
3. Try pnpm install again
      
## Package name mismatch found
  - Full error:
  ```
  WARN  Package name mismatch found while reading {"tarball":"https://ndnts-nightly.ndn.today/autoconfig.tgz"} from the store.
  ERR_PNPM_UNEXPECTED_PKG_CONTENT_IN_STORE  The lockfile is broken! Resolution step will be performed to fix it.
  WARN  Package name mismatch found while reading {"tarball":"https://ndnts-nightly.ndn.today/fw.tgz"} from the store.
  ERR_PNPM_UNEXPECTED_PKG_CONTENT_IN_STORE  The lockfile is broken! A full installation will be performed in an attempt to fix it.
  ERR_PNPM_UNEXPECTED_PKG_CONTENT_IN_STORE  Package name mismatch found while reading {"tarball":"https://ndnts-nightly.ndn.today/endpoint.tgz"} from the store.
  ```
  - To solve this, create or open the file ~/.npmrc
  ```
  $ sudo nano ~/.npmrc
  ```
  - Copy and paste this line to the end of file:
  ```strict-store-pkg-content-check=false```

  - Try pnpm install again
