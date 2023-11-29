/**
 * SyncUpdateManager manages updates transported by SyncAgent.
 * It receives and emits updates, encodes and loads local state as updates.
 */
interface SyncUpdateManager {

  /** 
   * Save the current status into a local snapshot.
   * This snapshot includes everyone's update and is not supposed to be published.
   * Public snapshots use a different mechanism.
   */
  saveLocalSnapshot(): Promise<void>

  /**
   * Load from a local snapshot.
   * @returns a SVS vector that can be used as a start point for `replayUpdates`.
   */
  loadLocalSnapshot(): Promise<void>

}
