import { NativeConnection, Worker } from "@temporalio/worker";
import * as activities from "./activities";
import { address, namespace, taskQueue } from "./config";

async function main() {
  const connection = await NativeConnection.connect({ address });
  try {
    const worker = await Worker.create({
      connection,
      namespace,
      taskQueue,
      workflowsPath: require.resolve("./workflows"),
      activities,
    });
    console.log(`Polling ${taskQueue} at ${address} (namespace ${namespace})`);
    await worker.run();
  } finally {
    await connection.close();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
