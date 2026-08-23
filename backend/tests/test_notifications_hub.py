"""Tests for the notifications real-time hub (per-user fan-out + dead-socket cleanup)."""
from __future__ import annotations

from app.api.notifications.hub import NotificationHub


class FakeSocket:
    def __init__(self, should_fail: bool = False):
        self.sent: list[str] = []
        self.should_fail = should_fail

    async def send_text(self, data: str) -> None:
        if self.should_fail:
            raise RuntimeError("connection closed")
        self.sent.append(data)


async def test_push_sends_to_registered_user():
    hub = NotificationHub()
    ws = FakeSocket()
    hub.register("u1", ws)

    await hub.push("u1", {"title": "Hello"}, unread_count=3)

    assert len(ws.sent) == 1
    import json

    payload = json.loads(ws.sent[0])
    assert payload["type"] == "notification:new"
    assert payload["notification"]["title"] == "Hello"
    assert payload["unread_count"] == 3


async def test_push_to_unregistered_user_is_noop():
    hub = NotificationHub()
    # Should not raise.
    await hub.push("nobody", {"title": "x"}, unread_count=0)


async def test_broadcast_multiple_tabs():
    hub = NotificationHub()
    ws1, ws2 = FakeSocket(), FakeSocket()
    hub.register("u1", ws1)
    hub.register("u1", ws2)

    await hub.push("u1", {"title": "both"})
    assert len(ws1.sent) == 1
    assert len(ws2.sent) == 1


async def test_dead_socket_cleaned_up():
    hub = NotificationHub()
    dead = FakeSocket(should_fail=True)
    live = FakeSocket()
    hub.register("u1", dead)
    hub.register("u1", live)

    await hub.push("u1", {"title": "x"})

    # Live socket got the message; the dead one was dropped from the registry.
    assert len(live.sent) == 1
    assert dead not in hub._sockets["u1"]
    assert live in hub._sockets["u1"]


async def test_unregister_removes_socket():
    hub = NotificationHub()
    ws = FakeSocket()
    hub.register("u1", ws)
    hub.unregister("u1", ws)
    assert hub.online_users() == []