import app from "./app";
import { initScheduler } from "./lib/scheduler";
import { clearAnnouncementBarOnce, runPendingFlavourPickupEmailIfNeeded } from "./lib/pending-jobs";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

process.on("uncaughtException", (err) => {
  console.error("[UNCAUGHT]", err);
});
process.on("unhandledRejection", (reason) => {
  console.error("[UNHANDLED REJECTION]", reason);
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
  initScheduler();
  clearAnnouncementBarOnce().catch((err) => {
    console.error("[PENDING-JOB] Announcement clear job failed:", err);
  });
  runPendingFlavourPickupEmailIfNeeded().catch((err) => {
    console.error("[PENDING-JOB] Startup job failed:", err);
  });
});
