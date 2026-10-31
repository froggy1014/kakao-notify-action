import * as core from "@actions/core";
import { isKakaoError } from "@kakao-bot/sdk";
import { RoomNoSessionError, RoomNotBoundError } from "./errors.js";
import { notify } from "./notify.js";

function boolInput(name: string): boolean {
  return core.getInput(name).trim().toLowerCase() !== "false";
}

async function run(): Promise<void> {
  const apiKey = core.getInput("api-key", { required: true });
  core.setSecret(apiKey);
  const failOnError = boolInput("fail-on-error");
  try {
    const result = await notify({
      apiKey,
      room: core.getInput("room", { required: true }),
      text: core.getInput("text", { required: true }),
      requestId: core.getInput("request-id") || undefined,
      baseUrl: core.getInput("base-url") || "https://kakao-api.jeongmin.dev",
      timeoutMs: Number(core.getInput("timeout-ms") || "10000"),
      checkSession: boolInput("check-session"),
    });
    core.setOutput("request-id", result.requestId);
    core.setOutput("queued", String(result.queued));
    core.setOutput("duplicate", String(result.duplicate));
    core.info(
      `kakao: request_id=${result.requestId} queued=${result.queued} duplicate=${result.duplicate}${result.test ? " (test key, not delivered)" : ""}`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (isKakaoError(error)) core.error(JSON.stringify(error.toJSON()));
    else if (error instanceof RoomNoSessionError || error instanceof RoomNotBoundError) core.error(message);
    else throw error;
    if (failOnError) core.setFailed(message);
    else core.warning(message);
  }
}

run().catch((error: unknown) => {
  core.setFailed(error instanceof Error ? error.message : String(error));
});
