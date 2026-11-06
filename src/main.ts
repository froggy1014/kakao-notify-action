import * as core from "@actions/core";
import { isNotiBotError } from "@noti-bot/sdk";
import { RoomNoSessionError, RoomNotBoundError } from "./errors.js";
import { notify } from "./notify.js";

function boolInput(name: string): boolean {
  return core.getInput(name).trim().toLowerCase() !== "false";
}

function listInput(name: string): string[] | undefined {
  const values = core
    .getInput(name)
    .split(/[\n,]/)
    .map((value) => value.trim())
    .filter(Boolean);
  return values.length ? values : undefined;
}

async function run(): Promise<void> {
  const apiKey = core.getInput("api-key", { required: true });
  core.setSecret(apiKey);
  const failOnError = boolInput("fail-on-error");
  try {
    const result = await notify({
      apiKey,
      room: core.getInput("room") || undefined,
      roomSlug: core.getInput("room-slug") || undefined,
      roomId: core.getInput("room-id") || undefined,
      text: core.getInput("text", { required: true }),
      mentions: listInput("mentions"),
      requestId: core.getInput("request-id") || undefined,
      baseUrl: core.getInput("base-url") || "https://api.notibot.xyz",
      timeoutMs: Number(core.getInput("timeout-ms") || "10000"),
      checkSession: boolInput("check-session"),
    });
    core.setOutput("request-id", result.requestId);
    core.setOutput("queued", String(result.queued));
    core.setOutput("duplicate", String(result.duplicate));
    core.info(
      `notibot: request_id=${result.requestId} queued=${result.queued} duplicate=${result.duplicate}${result.test ? " (test key, not delivered)" : ""}`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (isNotiBotError(error)) {
      if (error.requestId) core.setOutput("request-id", error.requestId);
      core.error(JSON.stringify(error.toJSON()));
    }
    else if (error instanceof RoomNoSessionError || error instanceof RoomNotBoundError) core.error(message);
    else throw error;
    if (failOnError) core.setFailed(message);
    else core.warning(message);
  }
}

run().catch((error: unknown) => {
  core.setFailed(error instanceof Error ? error.message : String(error));
});
