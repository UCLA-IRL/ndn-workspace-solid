import { connections } from '../models'
import { FwFace } from '@ndn/fw'
import { WsTransport } from '@ndn/ws-transport'
import { WebBluetoothTransport } from '@ndn/web-bluetooth-transport'
import { connectToNetwork } from '@ndn/autoconfig'
import * as nfdmgmt from '@ndn/nfdmgmt'
import { Decoder } from '@ndn/tlv'
import { Data, Name, Signer, digestSigning } from '@ndn/packet'
import { Certificate, ECDSA, createSigner } from '@ndn/keychain'
import { base64ToBytes } from '../../utils'
import { PeerJsListener } from '../../adaptors/peerjs-transport'

export let UseAutoAnnouncement = false

export const setUseAutoAnnouncement = (value: boolean) => (UseAutoAnnouncement = value)

export interface Connection extends AsyncDisposable {
  get face(): FwFace | undefined
  get nfdCert(): Certificate | undefined
  get cmdSigner(): Signer | undefined
  get config(): connections.Config
  connect(): Promise<void>
  disconnect(): Promise<void>
}

export class BaseConnection implements Connection {
  protected _face: FwFace | undefined
  protected _nfdCert: Certificate | undefined
  protected _cmdSigner: Signer | undefined
  protected _commandPrefix: Name = nfdmgmt.localhopPrefix

  public get face() {
    return this._face
  }

  public get nfdCert() {
    return this._nfdCert
  }

  public get cmdSigner() {
    return this._cmdSigner
  }

  public get commandPrefix() {
    return this._commandPrefix
  }

  protected async parseCredentials() {
    if (this.config.kind !== 'nfdWs' && this.config.kind !== 'testbed') {
      throw new Error(`Connection type ${this.config.kind} does not have credentials to use.`)
    }
    if (this.config.prvKeyB64 === '') {
      this._cmdSigner = digestSigning
      return
    }
    try {
      const prvKeyBits = base64ToBytes(this.config.prvKeyB64)
      const certBytes = base64ToBytes(this.config.ownCertificateB64)
      this._nfdCert = Certificate.fromData(Decoder.decode(certBytes, Data))
      const keyPair = await ECDSA.cryptoGenerate(
        {
          importPkcs8: [prvKeyBits, this._nfdCert.publicKeySpki],
        },
        true,
      )
      this._cmdSigner = createSigner(
        this._nfdCert.name.getPrefix(this._nfdCert.name.length - 2),
        ECDSA,
        keyPair,
      ).withKeyLocator(this._nfdCert.name)
    } catch (err) {
      throw new Error(`Failed to connect: unable to parse credentials: ${err}`)
    }
  }

  constructor(public readonly config: connections.Config) {}

  public async connect() {
    throw new Error('Not implemented')
  }

  public async disconnect() {
    throw new Error('Not implemented')
  }

  async [Symbol.asyncDispose](): Promise<void> {
    return await this.disconnect()
  }
}

export class NfdWsConn extends BaseConnection {
  constructor(public readonly config: connections.NfdWs) {
    super(config)
  }

  public override async connect() {
    if (this._face !== undefined) {
      throw new Error('Already connected.')
    }
    await this.parseCredentials()

    // Force ndnts to register the prefix correctly using localhost
    // SA: https://redmine.named-data.net/projects/nfd/wiki/ScopeControl#local-face
    this._face = await WsTransport.createFace({ l3: { local: this.config.isLocal } }, this.config.uri)
    // The automatic announcement is turned off by default to gain a finer control.
    // See checkPrefixRegistration for details.
    if (UseAutoAnnouncement) {
      nfdmgmt.enableNfdPrefixReg(this._face, {
        signer: this._cmdSigner,
        // TODO: Do I need to set `preloadCertName`?
      })
    }
    this._commandPrefix = nfdmgmt.getPrefix(this.config.isLocal)
    // await checkPrefixRegistration(false)
  }

  public override async disconnect() {
    // await checkPrefixRegistration(true)
    this._face?.close()
    this._face = undefined
  }
}

export class PeerJsConn extends BaseConnection {
  protected _listener: PeerJsListener | undefined = undefined

  get listener() {
    return this._listener
  }

  constructor(public readonly config: connections.PeerJs) {
    super(config)
  }

  public override async connect() {
    if (this._listener === undefined) {
      this._listener = await PeerJsListener.listen(this.config)
      // if (discovery) {
      //   await this._listener.connectToKnownPeers()
      // }
      await this._listener.connectToKnownPeers()
    } else {
      throw new Error('Already connected.')
    }
  }

  public override async disconnect() {
    this._listener?.closeAll()
    this._listener = undefined
  }
}

export class BleConn extends BaseConnection {
  constructor(public readonly config: connections.Ble) {
    super(config)
  }

  public override async connect() {
    if (this._face !== undefined) {
      throw new Error('Already connected.')
    }
    await this.parseCredentials()

    this._face = await WebBluetoothTransport.createFace({
      lp: { mtu: 512 },
    })
    // The automatic announcement is turned off by default to gain a finer control.
    // See checkPrefixRegistration for details.
    if (UseAutoAnnouncement) {
      nfdmgmt.enableNfdPrefixReg(this._face, {
        signer: this._cmdSigner,
        // TODO: Do I need to set `preloadCertName`?
      })
    }
    this._commandPrefix = nfdmgmt.getPrefix(false)
    // await checkPrefixRegistration(false)
  }

  public override async disconnect() {
    // await checkPrefixRegistration(true)
    this._face?.close()
    this._face = undefined
  }
}

export class TestbedConn extends BaseConnection {
  constructor(public readonly config: connections.Testbed) {
    super(config)
  }

  public override async connect() {
    if (this._face !== undefined) {
      throw new Error('Already connected.')
    }
    await this.parseCredentials()

    const faces = await connectToNetwork()
    if (faces.length === 0) {
      throw new Error('Cannot connect to the testbed')
    }

    this._face = faces[0]
    // The automatic announcement is turned off by default to gain a finer control.
    // See checkPrefixRegistration for details.
    if (UseAutoAnnouncement) {
      nfdmgmt.enableNfdPrefixReg(this._face, {
        signer: this._cmdSigner,
        // TODO: Do I need to set `preloadCertName`?
      })
    }
    this._commandPrefix = nfdmgmt.getPrefix(false)
    // await checkPrefixRegistration(false)
  }

  public override async disconnect() {
    // await checkPrefixRegistration(true)
    this._face?.close()
    this._face = undefined
  }
}
