# notibot-action

GitHub Action that sends a KakaoTalk message through [NotiBot](https://notibot.xyz) ([source](https://github.com/froggy1014/noti-bot)) using [`@noti-bot/sdk`](https://www.npmjs.com/package/@noti-bot/sdk).

```yaml
- uses: froggy1014/notibot-action@v1
  with:
    api-key: ${{ secrets.NOTIBOT_API_KEY }}
    room-slug: deploy-alerts
    text: |
      🤖 자동 머지: homelab-deps
      https://github.com/org/repo/pull/42
    request-id: deps:42:merged
```

## Inputs

| Input | Required | Default | Description |
|---|---|---|---|
| `api-key` | yes | | NotiBot service API key (`kb_…`) from the [console](https://notibot.xyz). Scopes `messages:send`, plus `rooms:read` when `check-session` is on |
| `room` | one target required | | Exact room display name bound to the service |
| `room-slug` | one target required | | Workspace-unique room slug (e.g. `deploy-alerts`). Old slugs stop working after a change |
| `room-id` | one target required | | Stable hub room UUID; survives display-name and slug changes |
| `text` | yes | | Message. Truncated to 4000 chars. `<@kakaoUserId>` becomes a real Kakao tag (Iris) |
| `mentions` | no | | Display names to tag, comma or newline separated. Each must match exactly one room member, otherwise the hub rejects with `mention_name_unknown` / `mention_name_ambiguous` and nothing is sent. Iris transport only |
| `request-id` | no | hub-generated | Idempotency key. **Retry with the same id**; a new id sends twice |
| `base-url` | no | `https://api.notibot.xyz` | Hub origin |
| `timeout-ms` | no | `10000` | Request timeout |
| `check-session` | no | `true` | Call `GET /v1/rooms` first; fail without sending when the room is not bound or has `canReply: false` (transport is not ready for the room) |
| `fail-on-error` | no | `true` | Mark the step failed on any error. `false` only warns |

## Outputs

`request-id`, `queued`, `duplicate`.

Set exactly one of `room`, `room-slug`, `room-id`.

## Notes

- Errors from the SDK are logged as one JSON line (`NotiBotError.toJSON()`: `name`, `status`, `code`, `retryable`, `requestId`, …).
- The hub answers `202` when the message is **queued**, not delivered. Delivery is visible in the hub admin log.
- No automatic retries. The SDK never retries either; a timeout may already have been accepted.
- With `check-session: true`, unavailable transport or room mapping fails before sending. MessengerBotR additionally requires a recent notification session; Iris uses its bridge connection and explicit room mapping.

## Release

Bump `package.json` version, `pnpm build`, commit `dist/`, tag `vX.Y.Z` and move the `v1` tag.

### Iris migration

Use `room-id` (the hub's UUID from `listRooms`) or `room-slug` instead of `room` to keep the
target stable when its Kakao display name changes. Supply exactly one. Existing `room` and `room-slug`
workflows remain supported; when `check-session` is enabled the action sends to the
UUID returned by the room check. `queued` confirms hub acceptance, not recipient
delivery. On an uncertain failure the `request-id` output is retained when available;
reuse that ID for the same logical send. Never generate a fresh ID just to retry an
unknown outcome. Iris readiness depends on the bridge and explicit room mapping,
rather than a MessengerBotR notification session.
