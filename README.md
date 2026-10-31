# kakao-notify-action

GitHub Action that sends a KakaoTalk message through the [Kakao Bot Hub](https://github.com/froggy1014/kakao-bot) using [`@kakao-bot/sdk`](https://www.npmjs.com/package/@kakao-bot/sdk).

```yaml
- uses: froggy1014/kakao-notify-action@v1
  with:
    api-key: ${{ secrets.KAKAO_API_KEY }}
    room: 홈랩 알림
    text: |
      🤖 자동 머지: homelab-deps
      https://github.com/org/repo/pull/42
    request-id: deps:42:merged
```

## Inputs

| Input | Required | Default | Description |
|---|---|---|---|
| `api-key` | yes | | Hub service API key (`kb_…`). Scopes `messages:send`, plus `rooms:read` when `check-session` is on |
| `room` | yes | | Exact room name bound to the service |
| `text` | yes | | Message. Truncated to 4000 chars |
| `request-id` | no | hub-generated | Idempotency key. **Retry with the same id**; a new id sends twice |
| `base-url` | no | `https://kakao-api.jeongmin.dev` | Hub origin |
| `timeout-ms` | no | `10000` | Request timeout |
| `check-session` | no | `true` | Call `GET /v1/rooms` first; fail without sending when the room is not bound or has `canReply: false` (phone restarted and nobody has written in the room yet) |
| `fail-on-error` | no | `true` | Mark the step failed on any error. `false` only warns |

## Outputs

`request-id`, `queued`, `duplicate`.

## Notes

- The hub answers `202` when the message is **queued**, not delivered. Delivery is visible in the hub admin log.
- No automatic retries. The SDK never retries either; a timeout may already have been accepted.
- Session check matters because a room where only the bot writes goes dead after every bot-phone restart. With `check-session: true` the failed step surfaces that through GitHub's own workflow-failure notification.

## Release

Bump `package.json` version, `pnpm build`, commit `dist/`, tag `vX.Y.Z` and move the `v1` tag.
