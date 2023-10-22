import { Name, type Component } from "@ndn/packet"
import { Keyword as KeywordComponent } from "@ndn/naming-convention2"
import { v4 as uuidv4 } from "uuid"

let currentNamespace: SyncAgentNamespace | undefined = undefined

export type SyncAgentNamespace = {
  /**
   * Extract the node ID from the key name of the signer
   * @param signerName the signer's name used in KeyLocator. e.g. /ndn-app/alice/KEY/1
   */
  nodeIdFromSigner(signerName: Name): Name

  /**
   * Extract the application prefix from the key name of the signer
   * @param signerName the signer's name used in KeyLocator. e.g. /ndn-app/alice/KEY/1
   */
  appPrefixFromSigner(signerName: Name): Name

  /**
   * Extract the storage key name to store a packet from the packet name.
   * @param pktName the packet name of a LatestOnly delivery. e.g. /ndn-app/node/1/ndn-app/sync/late/seq=10
   */
  latestOnlyKey(pktName: Name): string

  /**
   * The base name of the SVS, i.e. `/<node-prefix>/<group-prefix>` in the Spec.
   * We have this function because the spec does not clearly say how to handle the application prefix.
   * Default is: baseName(/ndn-app/node/1, /ndn-app/sync/late) = /ndn-app/node/1/ndn-app/sync/late
   * @param nodeId the nodeID, e.g. /ndn-app/node/1
   * @param syncPrefix the sync group prefix, e.g. /ndn-app/sync/late
   */
  baseName(nodeId: Name, syncPrefix: Name): Name

  /**
   * Extract the key used in the persistent storage to store SVS state vectors.
   * Default is: syncStateKey(...) = /8=local/.../8=syncVector
   * Though the default implementation returns an NDN name's canonical form,
   * customized implementation is not required to return an NDN name.
   * @param baseName the base name of the SVS. e.g. /ndn-app/node/1/ndn-app/sync/late
   */
  syncStateKey(baseName: Name): string

  /**
   * Generate the name of a blob object when the user does not provide a name for this blob
   * Default is: genBlobName(/ndn-app) = /ndn-app/blob/${uuidv4()}
   * @param appPrefix the application prefix. e.g. /ndn-app
   */
  genBlobName(appPrefix: Name): Name

  /** Keyword component for sync delivery subnamespace after app prefix. Default is `32=sync` */
  readonly syncKeyword: Component

  /** Keyword component for at least once delivery. Default is `32=alo` */
  readonly atLeastOnceKeyword: Component

  /** Keyword component for latest only delivery. Default is `32=late` */
  readonly latestOnlyKeyword: Component
}

export function getNamespace(): SyncAgentNamespace {
  if (currentNamespace === undefined) {
    currentNamespace = createDefaultNamespace()
  }
  return currentNamespace!
}

export function setNamespace(namespace: SyncAgentNamespace) {
  currentNamespace = namespace
}

function createDefaultNamespace(): SyncAgentNamespace {
  return {
    nodeIdFromSigner(signerName: Name): Name {
      return signerName.getPrefix(signerName.length - 2)
    },
    appPrefixFromSigner(signerName: Name): Name {
      return signerName.getPrefix(signerName.length - 3)
    },
    latestOnlyKey(pktName: Name): string {
      // Remove the sequence number
      return pktName.getPrefix(pktName.length - 1).toString()
    },
    baseName(nodeId: Name, syncPrefix: Name): Name {
      // append is side-effect free
      return nodeId.append(...syncPrefix.comps)
    },
    syncStateKey(baseName: Name): string {
      return '/8=local' + baseName.toString() + '/8=syncVector'
    },
    genBlobName(appPrefix: Name): Name {
      return new Name([...appPrefix.comps, 'blob', uuidv4()])
    },
    syncKeyword: KeywordComponent.create('sync'),
    atLeastOnceKeyword: KeywordComponent.create('alo'),
    latestOnlyKeyword: KeywordComponent.create('late'),
  }
}
