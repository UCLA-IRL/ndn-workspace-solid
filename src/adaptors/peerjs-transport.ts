import { Peer, DataConnection, BufferedConnection, PeerError, PeerOptions } from "peerjs";
import EventIterator from "event-iterator";
import { L3Face, rxFromPacketIterable, Transport } from "@ndn/l3face";
import { FwFace } from "@ndn/fw";


/** PeerJS transport over WebRTC for browser. */
// TODO: (IMPORTANT) Current NDNts Forwarder cannot handle Interest surpression
export class PeerJsTransport extends Transport {
  public override readonly rx: Transport.Rx;
  private readonly highWaterMark: number;
  private readonly lowWaterMark: number;

  constructor(private readonly sock: BufferedConnection, private readonly opts: PeerJsTransport.Options) {
    super({ describe: `PeerJs(${sock.peer},${sock.connectionId})` });
    this.rx = rxFromPacketIterable(new EventIterator<Uint8Array>(({ push, stop }) => {
      const handleMessage = (data: unknown) => {
        if (data instanceof ArrayBuffer) {
          const pkt = new Uint8Array(data);
          push(pkt);
        }
      };
      sock.on("data", handleMessage);
      sock.on("close", stop);
      return () => {
        sock.removeListener("data", handleMessage);
        sock.removeListener("close", stop);
      };
    }));

    this.highWaterMark = opts.highWaterMark ?? 1024 * 1024;
    this.lowWaterMark = opts.lowWaterMark ?? 16 * 1024;
  }

  public close() {
    this.sock.close();
  }

  public override get mtu() { return Infinity; }

  public override readonly tx = async (iterable: AsyncIterable<Uint8Array>): Promise<void> => {
    try {
      for await (const pkt of iterable) {
        if (!this.sock.open) {
          throw new Error(`unexpected PeerJS DataConnection is not open`);
        }
        this.sock.send(pkt);

        if (this.sock.bufferSize > this.highWaterMark) {
          await this.waitForTxBuffer();
        }
      }
    } finally {
      this.close();
    }
  };

  private waitForTxBuffer(): Promise<void> {
    return new Promise((resolve) => {
      const timer = setInterval(() => {
        if (this.sock.bufferSize <= this.lowWaterMark || !this.sock.open) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  }

  public override reopen() {
    return PeerJsTransport.connect(this.sock.provider, this.sock.peer, this.opts);
  }
}

export namespace PeerJsTransport {
  export interface Options {
    /** Connect timeout (in milliseconds). */
    connectTimeout?: number;

    /** AbortSignal that allows canceling connection attempt via AbortController. */
    signal?: AbortSignal;

    /** Buffer amount (in bytes) to start TX throttling. */
    highWaterMark?: number;

    /** Buffer amount (in bytes) to stop TX throttling. */
    lowWaterMark?: number;
  }

  /**
   * Create a transport and connect to remote endpoint.
   * @param peer the Peer object.
   * @param peerId the peer ID of the listener peer to connect.
   * @param opts other options.
   */
  export function connect(peer: Peer, peerId: string, opts: PeerJsTransport.Options = {}): Promise<PeerJsTransport> {
    const {
      connectTimeout = 10000,
      signal,
    } = opts;

    return new Promise<PeerJsTransport>((resolve, reject) => {
      const sock = peer.connect(peerId, { serialization: "binary", reliable: false }) as BufferedConnection;

      let timeout: NodeJS.Timeout | undefined; // eslint-disable-line prefer-const
      const fail = (err?: Error) => {
        clearTimeout(timeout);
        sock.close();
        reject(err);
      };
      timeout = setTimeout(() => fail(new Error("connectTimeout")), connectTimeout);

      const onabort = () => fail(new Error("abort"));
      signal?.addEventListener("abort", onabort);

      const onerror = (err: PeerError<string>) => {
        sock.close();
        reject(new Error(err.message));
      };
      sock.on("error", onerror);

      sock.on("open", () => {
        clearTimeout(timeout);
        sock.removeListener("error", onerror);
        signal?.removeEventListener("abort", onabort);
        resolve(new PeerJsTransport(sock, opts));
      });
    });
  }

  /** Create a transport and add to forwarder. */
  export const createFace = L3Face.makeCreateFace(connect);
}

/** PeerJsListener listens to incoming PeerJS connection and creates faces. */
export class PeerJsListener {
  private _faces: FwFace[] = [];

  private makeFace = L3Face.makeCreateFace(
    async (conn: DataConnection | BufferedConnection, opts: PeerJsTransport.Options = {}) => {
      const sock = conn as BufferedConnection;
      return new PeerJsTransport(sock, opts);
    });

  constructor(private readonly peer: Peer, private readonly opts: PeerJsListener.Options) {
    console.debug(`This peer's peerId = ${this.peer.id}`);
    this.peer.on("connection", (conn: DataConnection) => {
      console.debug(`Connected from ${conn.peer}`);
      this.makeFace({}, conn, {}).then((face) => {
        this._faces.push(face);
      });
    });
  }

  public get ready(): boolean {
    return this.peer.open;
  }

  public get faces(): FwFace[] {
    return this._faces;
  }

  public get peerId(): string {
    return this.peer.id;
  }

  public closeAll() {
    this.peer.disconnect();
    for (const connId in this._faces) {
      const face = this._faces[connId];
      face.close();
    }
    this._faces = [];
  }

  public reopen() {
    return PeerJsListener.listen(this.opts);
  }

  public async connect(peerId: string) {
    console.debug(`[PeerjsListener] Trying to connect to ${peerId}`);
    const face = await PeerJsTransport.createFace({}, this.peer, peerId, {});
    this._faces.push(face);
  }

  public async connectToKnownPeers() {
    const response = await fetch(`http://${this.opts.host}:${this.opts.port}${this.opts.path}/${this.opts.key}/peers`);
    const peers = await response.json() as string[];
    for await (const peerId of peers) {
      if (peerId == this.peer.id) {
        continue;
      }
      await this.connect(peerId);
    }
  }
}

export namespace PeerJsListener {
  export interface Options {
    /** Server host. */
    host: string;

    /** Server port number. */
    port: number;

    /** Connection key for server API calls. Defaults to `peerjs`. */
    key?: string;

    /** The path where your self-hosted PeerServer is running. Defaults to `'/'`. */
    path?: string;

    /** Optional ID of this peer provided by the user. */
    peerId?: string;

    /** Connect timeout (in milliseconds). */
    connectTimeout?: number;

    /** AbortSignal that allows canceling connection attempt via AbortController. */
    signal?: AbortSignal;
  }

  export function listen(opts: PeerJsListener.Options): Promise<PeerJsListener> {
    const {
      connectTimeout = 10000,
      signal,
      peerId,
    } = opts;
    opts.key = opts.key ?? "peerjs";
    opts.path = opts.path ?? "peerjs";
    const peerJsOpts: PeerOptions = {
      host: opts.host,
      port: opts.port,
      key: opts.key,
      path: opts.path,
    }

    return new Promise<PeerJsListener>((resolve, reject) => {
      const peer: Peer = peerId ? new Peer(peerId, peerJsOpts) : new Peer(peerJsOpts);

      let timeout: NodeJS.Timeout | undefined; // eslint-disable-line prefer-const
      const fail = (err?: Error) => {
        clearTimeout(timeout);
        peer.disconnect();
        reject(err);
      };
      timeout = setTimeout(() => fail(new Error("connectTimeout")), connectTimeout);

      const onabort = () => fail(new Error("abort"));
      signal?.addEventListener("abort", onabort);

      const onerror = (err: PeerError<string>) => {
        peer.disconnect();
        reject(new Error(err.message));
      };
      peer.on("error", onerror);

      peer.on("open", () => {
        clearTimeout(timeout);
        peer.removeListener("error", onerror);
        signal?.removeEventListener("abort", onabort);
        resolve(new PeerJsListener(peer, opts));
      });
    });
  }
}