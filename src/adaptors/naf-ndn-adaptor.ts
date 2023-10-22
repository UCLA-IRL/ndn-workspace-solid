/* eslint-disable @typescript-eslint/no-unused-vars */
// OBSOLETE
// Copied from networked-aframe/src/adapters
type Occupants = { [id: string]: JSONObject }

type EntityData = {
  networkId: string,
  owner: string,
  lastOwnerTime: number,
  persistent: boolean,
  parent: string | null,
  template: string,
  components: { [id: number]: unknown }
}

type ConnectStatus = "IS_CONNECTED" | "CONNECTING" | "NOT_CONNECTED"
type JSONObject = object

interface NafInterface {

  /* Pre-Connect setup methods - Call before `connect` */

  setServerUrl(url: string): void
  setApp(appName: string): void
  setRoom(roomName: string): void
  setWebRtcOptions(options: { datachannel: boolean, audio: boolean, video: boolean }): void

  setServerConnectListeners(
    successListener: (clientId: string) => void,
    failureListener: (errorCode: string, message: string) => void,
  ): void

  setRoomOccupantListener(occupantListener: (occupants: Occupants) => void): void

  setDataChannelListeners(
    openListener: (cliendId: string) => void,
    closedListener: (cliendId: string) => void,
    messageListener: (fromCliendId: string, dataType: string, data: JSONObject, source: string) => void
  ): void

  connect(): void

  shouldStartConnectionTo(client: Occupants['id']): boolean
  startStreamConnection(clientId: string): void
  closeStreamConnection(clientId: string): void
  getConnectStatus(clientId: string): ConnectStatus

  getMediaStream(clientId: string): Promise<unknown>

  getServerTime(): number

  sendData(clientId: string, dataType: string, data: JSONObject): void
  sendDataGuaranteed(clientId: string, dataType: string, data: JSONObject): void
  broadcastData(dataType: string, data: JSONObject): void
  broadcastDataGuaranteed(dataType: string, data: JSONObject): void

  disconnect(): void
}

export default class NafNdnAdaptor implements NafInterface {
  appId: string = ''
  roomName: string = ''
  connectSuccess?: (clientId: string) => void
  connectFailure?: (errorCode: string, message: string) => void
  occupantListener?: (occupants: Occupants) => void
  openListener?: (cliendId: string) => void
  closedListener?: (cliendId: string) => void
  peerListener?: (fromCliendId: string, dataType: string, data: object, source: string) => void

  setServerUrl(url: string) {
    // Handled in config
  }

  setApp(appId: string) {
    this.appId = appId
  }

  setRoom(roomName: string): void {
    this.roomName = roomName
  }

  setWebRtcOptions(options: { datachannel: boolean; audio: boolean; video: boolean }): void {
    // No WebRTC support
    if (options.datachannel === false)
      console.warn(
        "NafNdnAdaptor.setWebRtcOptions: datachannel must be true."
      );
    if (options.audio === true)
      console.warn("NafNdnAdaptor does not support audio yet.");
    if (options.video === true)
      console.warn("NafNdnAdaptor does not support video yet.");
  }

  setServerConnectListeners(
    successListener: (clientId: string) => void,
    failureListener: (errorCode: string, message: string) => void
  ): void {
    this.connectSuccess = successListener
    this.connectFailure = failureListener
  }

  setRoomOccupantListener(occupantListener: (occupants: Occupants) => void): void {
    this.occupantListener = occupantListener
  }

  setDataChannelListeners(
    openListener: (cliendId: string) => void,
    closedListener: (cliendId: string) => void,
    messageListener: (fromCliendId: string, dataType: string, data: object, source: string) => void
  ): void {
    this.openListener = openListener
    this.closedListener = closedListener
    this.peerListener = messageListener
  }

  async getMediaStream(clientId: string): Promise<unknown> {
    return Promise.reject('Do not support WebRTC')
  }

  startStreamConnection(clientId: string): void {
    // No need to handle
  }

  closeStreamConnection(clientId: string): void {
    // No need to handle
  }

  /////////// TODO: Need status channel ///////////////////
  //  UPDATE: naf does not give a good programming interface, abandoned for now.
  // ref: https://github.com/networked-aframe/naf-firebase-adapter/blob/master/src/index.js
  // We may use average peer time as offset
  updateTimeOffset() {
  }

  connect(): void {
    throw new Error("Method not implemented.")
  }
  shouldStartConnectionTo(client: Occupants['id']): boolean {
    throw new Error("Method not implemented.")
  }
  
  getConnectStatus(clientId: string): ConnectStatus {
    throw new Error("Method not implemented.")
  }
  getServerTime(): number {
    throw new Error("Method not implemented.")
  }
  sendData(clientId: string, dataType: string, data: object): void {
    throw new Error("Method not implemented.")
  }
  sendDataGuaranteed(clientId: string, dataType: string, data: object): void {
    throw new Error("Method not implemented.")
  }
  broadcastData(dataType: string, data: object): void {
    throw new Error("Method not implemented.")
  }
  broadcastDataGuaranteed(dataType: string, data: object): void {
    throw new Error("Method not implemented.")
  }
  disconnect(): void {
    throw new Error("Method not implemented.")
  }
}
