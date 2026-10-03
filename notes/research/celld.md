# celld research

Research date: **2026-10-01**. Source checkout:
[`f2bf648663a610eefde71f3547ad61e9b896b1f0`](https://github.com/denoland/celld/tree/f2bf648663a610eefde71f3547ad61e9b896b1f0),
the **v0.6.1** commit dated 2026-10-01. Facts below refer to that snapshot;
celld is a beta and its behavior can change. This note records source research,
not an independent production qualification.

## Practical answer

celld runs applications written against the Cloudflare Workers programming
model on machines you operate. Each celld process is a node. Nodes using the
same fleet storage form a fleet. A cell is a named unit of application state
with its own local SQLite database and one owner. The bucket contains
deployments, ownership and node records, replicated state, and a fleet secret.
Supported bindings extend beyond Durable Objects to KV, D1, Queues, Workflows,
R2, cron, and static assets. Containers are experimental.
([Repository overview](https://github.com/denoland/celld/blob/f2bf648663a610eefde71f3547ad61e9b896b1f0/README.md),
[compatibility table](https://github.com/denoland/celld/blob/f2bf648663a610eefde71f3547ad61e9b896b1f0/docs/cloudflare-compat.md#services))

For someone self-hosting S3, the appeal is a stateful application runtime that
uses that object store as its durable backing and coordination authority.
Ordinary requests operate on the owner's SQLite database; S3 is not the live
SQL query engine. S3 compatibility alone does not establish the storage
contract celld needs.
([Durable Object implementation contract](https://github.com/denoland/celld/blob/f2bf648663a610eefde71f3547ad61e9b896b1f0/docs/services/durable-objects.md#ownership-and-the-single-threaded-model),
[storage adapter](https://github.com/denoland/celld/blob/f2bf648663a610eefde71f3547ad61e9b896b1f0/crates/celld/bucket.rs#L3))

## Identity, ownership, and concurrency

`idFromName("room-7")` deterministically identifies the same object within its
namespace, even when callers arrive at different nodes. A stub is a handle;
the first call activates the cell. A node receiving a call resolves ownership
and forwards to the current owner. The object executes one synchronous turn
at a time, but another event may interleave when a handler awaits.
`blockConcurrencyWhile()` controls the input gate; “one owner” does not mean
every asynchronous handler runs to completion without interleaving.
([Identity and addressing](https://github.com/denoland/celld/blob/f2bf648663a610eefde71f3547ad61e9b896b1f0/docs/services/durable-objects.md#identity-and-addressing),
[concurrency contract](https://github.com/denoland/celld/blob/f2bf648663a610eefde71f3547ad61e9b896b1f0/docs/services/durable-objects.md#ownership-and-the-single-threaded-model))

Ownership uses an atomic conditional create or update of a bucket record.
Every activation advances a fencing epoch, including a wake on the same node.
LTX replication data uses a separate `cells/<cell>/ltx/e<epoch>/` namespace.
A stale process can write into its old namespace, but cannot overwrite the
new owner's namespace. The output gate also requires a valid proof before
exposing writes. Lease expiry makes the old node self-fence and exit.
([Ownership and acknowledgement](https://github.com/denoland/celld/blob/f2bf648663a610eefde71f3547ad61e9b896b1f0/docs/guarantees.md#the-mechanism),
[ownership adapter](https://github.com/denoland/celld/blob/f2bf648663a610eefde71f3547ad61e9b896b1f0/crates/celld/ownership_store.rs))

Editorial inference: “no separate consensus service” means celld delegates
atomic arbitration to the bucket. It should not be illustrated as an absence
of coordination, or as a guarantee independent of the storage implementation.

## Write acknowledgement and recovery

One node has no follower. Its output must wait for a bucket proof. Default
`CELLD_DURABILITY=fleet` recruits up to two followers; one follower is the
minimum for a fleet proof. Each member in the current ensemble must confirm
the batch was fsynced. Bucket upload races that proof, so a bucket proof can
finish first. `CELLD_DURABILITY=bucket` always selects the bucket path.
([Acknowledgement policy](https://github.com/denoland/celld/blob/f2bf648663a610eefde71f3547ad61e9b896b1f0/crates/celld/node_log.rs#L3771),
[one-follower floor](https://github.com/denoland/celld/blob/f2bf648663a610eefde71f3547ad61e9b896b1f0/crates/celld/node_log.rs#L5586),
[configuration reference](https://github.com/denoland/celld/blob/f2bf648663a610eefde71f3547ad61e9b896b1f0/docs/README.md#environment-variables))

Acknowledged fleet writes can remain on follower disks before the bucket
contains them. Takeover fences the predecessor's log session, seals followers,
and gathers retained data into bucket storage before restoring the cell.
Restarting nodes expose authenticated follower recovery endpoints before
accepting new application traffic. Preserve node disks across restarts and
upgrades: they can contain the only surviving copy of a recent acknowledged
write.
([Takeover gate](https://github.com/denoland/celld/blob/f2bf648663a610eefde71f3547ad61e9b896b1f0/docs/guarantees.md#the-takeover-recovery-gate),
[recovery implementation](https://github.com/denoland/celld/blob/f2bf648663a610eefde71f3547ad61e9b896b1f0/crates/celld/node_log.rs#L5027))

**Important limit to the headline “RPO=0”:** the implementation distinguishes
unverified recovery from conclusive loss. With possible fleet acknowledgements
and no complete surviving follower witness, inconclusive member states block
sealing. If every member's fate is conclusive, the code writes a permanent
`log/<leader>.e<epoch>.loss.json`, records possible loss within the final flush
window, drains surviving bucket data, and proceeds. Thus “recovery always
fails closed” and “acknowledged writes survive arbitrary destruction of all
node disks” are inaccurate. This is a material qualification the brief overview
does not explain. Separate fault domains reduce correlated loss; that is an
operational inference, not an additional celld guarantee.
([Exact loss branch](https://github.com/denoland/celld/blob/f2bf648663a610eefde71f3547ad61e9b896b1f0/crates/celld/node_log.rs#L5207))

An absent acknowledgement does not establish that a write failed to commit.
Application retries need stable operation IDs for effects that must tolerate
duplicates; transport failures and ownership movement do not make an operation
exactly once. A WebSocket must reconnect when ownership moves.
([Restore discussion](https://github.com/denoland/celld/blob/f2bf648663a610eefde71f3547ad61e9b896b1f0/docs/guarantees.md#epoch-gc),
[RPC and WebSocket gaps](https://github.com/denoland/celld/blob/f2bf648663a610eefde71f3547ad61e9b896b1f0/docs/cloudflare-compat.md#rpc))

## Self-hosted storage checklist

The required storage behavior is conditional create, conditional update,
read-after-write consistency, and exact ranged reads. Epoch garbage collection
also requires list-after-write consistency. S3 uses `If-None-Match: *` for
create and `If-Match` with an ETag for updates. AWS documents these as atomic
preconditions on writes.
([celld storage requirements](https://github.com/denoland/celld/blob/f2bf648663a610eefde71f3547ad61e9b896b1f0/docs/guarantees.md#what-the-bucket-must-provide),
[AWS conditional writes](https://docs.aws.amazon.com/AmazonS3/latest/userguide/conditional-writes.html))

At this snapshot, celld lists S3, R2, Tigris, Google Cloud Storage, and Azure
Blob Storage as qualified. Its docs say MinIO community edition passes the
storage probe but is **not qualified for production**. They identify MinIO
`RELEASE.2025-09-06T17-38-46Z` as broken for absent-object conditional create,
and specify `RELEASE.2025-09-07T16-13-09Z` or later. These are celld's stated
qualifications, not an independent assessment of every current vendor release.
([Provider qualifications](https://github.com/denoland/celld/blob/f2bf648663a610eefde71f3547ad61e9b896b1f0/docs/guarantees.md#what-the-bucket-must-provide))

`celld diagnose` probes create, rejected duplicate create, update, and rejected
stale update. Node startup additionally checks a ranged read. Passing the
probe is necessary evidence of compatibility; it is not a durability,
performance, or production certification. Use the same `--bucket`,
`--endpoint`, and `--region` for deployment, diagnosis, and nodes. Use a
dedicated fleet namespace and preserve the engine-owned key spaces.
([Storage probe](https://github.com/denoland/celld/blob/f2bf648663a610eefde71f3547ad61e9b896b1f0/docs/guarantees.md#the-storage-test),
[storage configuration](https://github.com/denoland/celld/blob/f2bf648663a610eefde71f3547ad61e9b896b1f0/docs/README.md#configure-object-storage))

R2 bindings map logical buckets to `r2/<bucket_name>/<key>` in the fleet store.
Their durability is the chosen backend's durability. celld does not expose
an R2 binding as a public S3 endpoint, public URL, or presigned URL service;
use a Worker to serve bytes. This is a useful distinction for a self-hosted
file-service design.
([R2 placement and API limits](https://github.com/denoland/celld/blob/f2bf648663a610eefde71f3547ad61e9b896b1f0/docs/services/r2.md#where-celld-stores-an-object))

## Plausible uses and boundaries

| Workload                    | Natural cell boundary         | Why it fits / boundary to keep visible                                                          |
| --------------------------- | ----------------------------- | ----------------------------------------------------------------------------------------------- |
| Chat or multiplayer state   | One room or match             | Shared room state and connections have one owner; ownership movement still requires reconnects. |
| Cart, limiter, device state | One user, account, or device  | State divides by stable identity; a single hot cell remains a single writer.                    |
| Agent session               | One agent or conversation     | SQLite can keep inbox, progress, and memory; alarms schedule later work.                        |
| Import/export pipeline      | One workflow instance         | Completed step results survive replay; external effects still need duplicate tolerance.         |
| Upload service              | Metadata cell plus R2 binding | Metadata stays structured; file bytes remain in the backing object store.                       |

The first three are directly supported by the Durable Object documentation.
The upload composition is an architectural suggestion, not a celld sample
demonstrated here. A workflow restarts `run()` from the beginning and reads
completed step results; an uncommitted step can execute again. Queues deliver
at least once, retain messages for four days, and each queue has one writer.
([Object use cases](https://github.com/denoland/celld/blob/f2bf648663a610eefde71f3547ad61e9b896b1f0/docs/services/durable-objects.md),
[Workflow replay](https://github.com/denoland/celld/blob/f2bf648663a610eefde71f3547ad61e9b896b1f0/docs/services/workflows.md#steps-and-replay),
[Queues](https://github.com/denoland/celld/blob/f2bf648663a610eefde71f3547ad61e9b896b1f0/docs/services/queues.md#acknowledgement-and-retry))

Inference: this model is easiest when most invariants fit inside one named
unit. It does not remove application work for operations spanning cells,
cross-cell analytics, or global coordination. Adding nodes adds capacity
across cells, not concurrent writers to one database.

## Trying it locally versus testing a fleet

The checked-in counter is an appropriately small first experiment. Its Worker
reads `?name=...`, obtains a deterministic object ID, and forwards to a Counter
whose handler increments `storage` key `n`. It returns `{n,url}` on every
request, so repeated requests visibly demonstrate identity and persistence.
The config declares the binding and a `new_sqlite_classes` migration.
([Counter code](https://github.com/denoland/celld/blob/f2bf648663a610eefde71f3547ad61e9b896b1f0/examples/counter/index.js),
[counter config](https://github.com/denoland/celld/blob/f2bf648663a610eefde71f3547ad61e9b896b1f0/examples/counter/wrangler.jsonc))

`celld dev` uses a persistent local SQLite object-store backend in `.celld/dev`,
serves the Worker at `127.0.0.1:9876`, and rebuilds on changes. This backend is
for one development machine, not a production shared filesystem. `--clean`
deletes local application state. This test demonstrates APIs and restart
persistence, not real S3 semantics or independent-machine failover.
([Local backend implementation](https://github.com/denoland/celld/blob/f2bf648663a610eefde71f3547ad61e9b896b1f0/crates/celld/local_store.rs#L3),
[local development contract](https://github.com/denoland/celld/blob/f2bf648663a610eefde71f3547ad61e9b896b1f0/docs/README.md#develop-an-application-locally))

Local verification on 2026-10-01: the draft implementation session installed
celld 0.6.1 into a temporary directory on Apple Silicon and bundled the official
counter with esbuild 0.25.12. From fresh state, requests for `blue`, `blue`, and
`green` returned `n` values 1, 2, and 1. After stopping and restarting the dev
server, `blue` returned 3 and `green` returned 2. This is evidence for the local
example and persisted dev state only; no S3 service or independent host was
involved.

Follow with a disposable fleet bucket: diagnose the store, deploy the counter,
then start one and subsequently two nodes with distinct listeners and local
`CELLD_WATCH` directories. Keep follower disks. Read the same named counter
through both public listeners, restart a node, and check the counter again.
A two-process test on one laptop teaches routing and log transport; it does
not reproduce independent host, disk, or network failure domains.
([Node options](https://github.com/denoland/celld/blob/f2bf648663a610eefde71f3547ad61e9b896b1f0/docs/README.md#start-a-node),
[configuration](https://github.com/denoland/celld/blob/f2bf648663a610eefde71f3547ad61e9b896b1f0/docs/README.md#environment-variables))

The diagnostic command also binds its configured public listener before it
performs checks. When a running node already occupies port 8080, invoke
`celld diagnose --listen 127.0.0.1:0` with the normal storage arguments to
avoid a conflicting bind. A normal SIGTERM/Ctrl+C stop performs graceful
handoff; distinguish this from an abrupt SIGKILL experiment when testing
crash recovery.
([Diagnostic bind](https://github.com/denoland/celld/blob/f2bf648663a610eefde71f3547ad61e9b896b1f0/crates/celld/main.rs#L3472),
[shutdown contract](https://github.com/denoland/celld/blob/f2bf648663a610eefde71f3547ad61e9b896b1f0/docs/README.md#shut-down-and-roll-out-a-node))

## Operating constraints worth keeping in the draft

- v0.6.1 trusts the application, nodes, and operators; it is unsuitable for
  mutually hostile tenants. A fleet runs one application.
- celld does not terminate TLS. Public TLS belongs at a proxy. Internal
  peer/operator ports require a trusted private network or encrypted overlay;
  peer authentication is not encryption, and several operator routes are
  unauthenticated.
- A supervisor must restart self-fenced processes without an attempt limit,
  waiting at least one lease lifetime between attempts.
- Compatibility is a documented subset: Node.js and Python support are
  partial, the cache always misses, and network-specific services such as
  Workers AI, Browser Rendering, and Email Workers are absent.
- Namespace IDs include the script name; renaming it changes named IDs.
  celld accepts JSON/JSONC Wrangler configs, not TOML, and supports only
  `tag` plus `new_sqlite_classes` migration entries.

([Security boundary](https://github.com/denoland/celld/blob/f2bf648663a610eefde71f3547ad61e9b896b1f0/docs/security.md),
[fleet/platform limitations](https://github.com/denoland/celld/blob/f2bf648663a610eefde71f3547ad61e9b896b1f0/docs/limitations.md),
[supervisor requirement](https://github.com/denoland/celld/blob/f2bf648663a610eefde71f3547ad61e9b896b1f0/docs/guarantees.md#the-supervisor),
[compatibility](https://github.com/denoland/celld/blob/f2bf648663a610eefde71f3547ad61e9b896b1f0/docs/cloudflare-compat.md),
[namespace/migration caveats](https://github.com/denoland/celld/blob/f2bf648663a610eefde71f3547ad61e9b896b1f0/docs/services/durable-objects.md#differences-from-cloudflare))

## Visual accuracy contract

Use explanatory, inspectable states rather than claimed measurements. A useful
set is: named-cell identity; routing to one owner; competing conditional
claims; local SQLite/LTX replication; bucket versus follower acknowledgement;
epoch-separated stale writes; takeover recovery; and a spatial fleet overview.
Every figure should keep the cell's owner distinct from its followers. A
follower stores log data, not a second live instance of the object's code.

Show bucket upload as eventual relative to a completed fleet proof, and recovery
as requiring complete surviving data. Show a degraded or unavailable state
where the evidence is missing. Do not promise a fixed failover time, attach
invented latency values, claim all S3-compatible stores work, depict replicas
as active writers, or imply that adding a third node gives unlimited failure
tolerance. A 3D view can teach placement and independent state slices; use 2D
for exact causal sequences and ownership transitions.

## Remaining evidence gaps

No independent fleet benchmarks, MinIO production qualification, host-loss
trial, or long-running workload trial were performed in this research task.
Published upstream lab numbers depend on their reported configuration and
should not be presented as predictions for the reader's self-hosted store.
The documentation's broad zero-loss language needs the source-level loss
qualification above.
