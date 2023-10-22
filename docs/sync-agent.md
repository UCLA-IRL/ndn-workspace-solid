# SyncAgent

This document describes the design decision of SyncAgent, a data access layer built upon SVS

## Design Goal

- Upward multiplexing by application-defined topics
  - Different application components can subscribe and publish messages by topics
  - Note: different from partial sync, this is not related to the network, but software modularization.
- Downward multiplexing by methods of sync and storage
 - E.g., different sync prefixes, temporary and persistent storage.
- Guaranteed delivery if requested
  - This specifically means obtaining an acknowledge from the caller component.
- Reassembly and data verification

Example:

```text
+-----+    +--------+    +----------+
| Doc |    | Folder |    | Calendar |
+-----+    +--------+    +----------+
   \            |             /    (channels & topics)
+---------------------------------------+
|              Sync Agent               |
+---------------------------------------+
     /         |          \          |
+----------+   |     +----------+    |
| AtLeast  |   |     |  Latest  |    |
| Delivery |   |     | Delivery |    |
+----------+   |     +----------+    |
   /       \   |    /     |      \   |
+-----+  +----------+  +-----+   +----------+
|     |  | Persist  |  |     |   | Temp     |
| SVS |  | Storage  |  | SVS |   | Storage  |
+-----+  +----------+  +-----+   +----------+
```

## Delivery

A *Sync delivery* is a SVS instance with an independent namespace.
There are two types of delivery: At-Least-Once and Latest-Only.
(The names come from message queues but may have different meanings)
In SyncAgent, deliveries are underlying SVS pipes used by an agent.

### At Least Once

At-Least-Once Delivery guarantees every message is delivered and acknowledged at least once.

To justify the usage, suppose the following use case:
- (1) The delivery receives an update message to a document
- (2) The application parses the message and updates the document
- (3) The application stores the updated document into the persistent storage

Now, if the sync delivery stores its state (more specifically, SVS state vector) before (3) finishes,
and the application crushes, there will be an inconsistency:
when the application restarts, the loaded document does not contain the update, while the sync delivery
will treat the message as delivered.

To prevent this from happening, the workflow must be modified to the following
- (1) The delivery receives an update message to a document
- (2) The application parses the message and updates the document
- (3) The application stores the updated document into the persistent storage
- (4) The application gives the delivery an acknowledge
- (5) The delivery stores the sync state into the persistent storage

In SyncAgent, the application receives messages via async callbacks,
and the acknowledge is represented by the resolution of the promise.
The application is required to register the callback before SVS sync starts to operate.
If there is any problem with the message, including validation failure and promise rejection of the callback,
At-Least-Once Delivery will reset by storing the *previous* SVS state into the storage and disconnecting.

Note: At-Least-Once Delivery does not guarantee the order.
The current implementation will only do in-order delivery when there is no restart nor reset.

### Latest Only

Latest-Only Delivery only fetches and delivers the latest message only with respect to the SVS sequence number of each node.
It is designed for real-time status update and close to at most once delivery in message brokers.

Latest-Only Delivery only uses the persistent storage to store the state vector.
Fetched data are only stored in a temporary storage.

Too frequent messages will lead to missing.
For example, if a node always sends `{time: Date.now()}` and `{position: Document.position}` at the same time,
then the `time` message will always get lost.
The application may want to combine them into one message before sending out.

## Storage

SyncAgent depends on key-value storages to store both NDN packets and non-packet data, such as SVS state vectors.
There are two kinds of storages: temporary storages and persistent storages.

- A **temporary storage** stores data that is only used in a single execution of the application.
  All data are lost after it shuts down.
- A **persistent storage** stores data carries data over to future executions, until data are explicitly deleted.

## Channel

A **channel** is a set of API to the upper layer, representing a specific way to fetch and store data.
Current implementation provides 3 channels for the share latex project

- `update`: Reliable delivery designed for delta updates
  - Embedded in sync packets without segmentation support
  - Use AtLeastOnce delivery
  - Stored in persistent storage

- `blob`: Reliable delivery designed for blob files uploaded by users
  - Segmented in a seperate namespace
  - Only object name is embedded in the sync packet
  - Use AtLeastOnce delivery for blob name
  - Stored in persistent storage

- `status`: Unreliable delivery for frequent and small online status update such as Yjs awareness
  - Embedded in sync packets without segmentation support
  - Use LatestOnly delivery
  - Stored in temporary storage

## Namespace

WIP
