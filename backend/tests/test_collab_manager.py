"""
L2 — Unit tests for the collaboration ``ConnectionManager``.

The manager is pure in-memory (no DB), so we drive it directly with a
``FakeWebSocket`` that records outgoing frames. This verifies the real-time
presence protocol: join/leave broadcasts, snapshot-on-connect, presence
relaying, and dead-connection cleanup.
"""
from __future__ import annotations

import json

import pytest

from app.api.collab.manager import ConnectionManager


class FakeWebSocket:
    """Minimal stand-in for ``fastapi.WebSocket`` — records sent text frames."""

    def __init__(self, broken: bool = False):
        self.accepted = False
        self.sent: list[str] = []
        self.broken = broken  # set True after connect to simulate a drop

    async def accept(self) -> None:
        self.accepted = True

    async def send_text(self, data: str) -> None:
        if self.broken:
            raise RuntimeError("connection broken")
        self.sent.append(data)

    def sent_json(self) -> list[dict]:
        return [json.loads(s) for s in self.sent]


@pytest.fixture
def manager() -> ConnectionManager:
    return ConnectionManager()  # isolated per test


PROJECT = "proj-1"


async def test_connect_sends_snapshot_and_broadcasts_join(manager: ConnectionManager):
    a = FakeWebSocket()
    await manager.connect(PROJECT, "u-a", "a@x.com", "A", a)
    # Fresh room → snapshot is empty, and the sender is excluded from the join
    snap = a.sent_json()
    assert snap[0]["type"] == "snapshot"
    assert snap[0]["collaborators"] == []
    # No one else to notify → no join broadcast sent to A
    assert not any(m["type"] == "join" for m in snap)


async def test_second_user_receives_snapshot_and_join(manager: ConnectionManager):
    a = FakeWebSocket()
    await manager.connect(PROJECT, "u-a", "a@x.com", "A", a)

    b = FakeWebSocket()
    await manager.connect(PROJECT, "u-b", "b@x.com", "B", b)

    b_msgs = b.sent_json()
    # B receives a snapshot containing A, plus A's own join broadcast
    assert b_msgs[0]["type"] == "snapshot"
    assert any(c["user_id"] == "u-a" for c in b_msgs[0]["collaborators"])

    a_msgs = a.sent_json()
    # A receives B's join
    joins = [m for m in a_msgs if m["type"] == "join"]
    assert any(m["user_id"] == "u-b" for m in joins)


async def test_presence_relays_to_others(manager: ConnectionManager):
    a = FakeWebSocket()
    b = FakeWebSocket()
    await manager.connect(PROJECT, "u-a", "a@x.com", "A", a)
    await manager.connect(PROJECT, "u-b", "b@x.com", "B", b)

    cursor = {"lng": 12.5, "lat": 55.7}
    await manager.handle_message(
        PROJECT, "u-a", json.dumps({"type": "presence", "cursor": cursor})
    )

    b_msgs = b.sent_json()
    presence = [m for m in b_msgs if m["type"] == "presence"]
    assert presence, "B should receive A's presence"
    assert presence[-1]["cursor"] == cursor
    assert presence[-1]["user_id"] == "u-a"

    # Sender must not be echoed to themselves
    a_presence = [m for m in a.sent_json() if m["type"] == "presence"]
    assert a_presence == []


async def test_disconnect_notifies_peers_and_cleans_room(manager: ConnectionManager):
    a = FakeWebSocket()
    b = FakeWebSocket()
    await manager.connect(PROJECT, "u-a", "a@x.com", "A", a)
    await manager.connect(PROJECT, "u-b", "b@x.com", "B", b)

    await manager.disconnect(PROJECT, "u-a")

    b_msgs = b.sent_json()
    assert any(m["type"] == "leave" and m["user_id"] == "u-a" for m in b_msgs)

    # Room should now hold only B
    assert set(manager._rooms.get(PROJECT, {})) == {"u-b"}


async def test_disconnect_last_user_removes_room(manager: ConnectionManager):
    a = FakeWebSocket()
    await manager.connect(PROJECT, "u-a", "a@x.com", "A", a)
    await manager.disconnect(PROJECT, "u-a")
    assert PROJECT not in manager._rooms


async def test_malformed_json_message_is_ignored(manager: ConnectionManager):
    a = FakeWebSocket()
    b = FakeWebSocket()
    await manager.connect(PROJECT, "u-a", "a@x.com", "A", a)
    await manager.connect(PROJECT, "u-b", "b@x.com", "B", b)

    # No exception; B receives nothing new
    before = len(b.sent)
    await manager.handle_message(PROJECT, "u-a", "{not valid json")
    assert len(b.sent) == before


async def test_message_from_unknown_user_is_ignored(manager: ConnectionManager):
    b = FakeWebSocket()
    await manager.connect(PROJECT, "u-b", "b@x.com", "B", b)
    before = len(b.sent)
    await manager.handle_message(
        PROJECT, "u-ghost", json.dumps({"type": "presence", "cursor": {"lng": 0, "lat": 0}})
    )
    assert len(b.sent) == before


async def test_broadcast_cleans_up_dead_connections(manager: ConnectionManager):
    # A is healthy, B drops *after* connecting — a presence from A should evict B
    a = FakeWebSocket()
    b = FakeWebSocket()
    await manager.connect(PROJECT, "u-a", "a@x.com", "A", a)
    await manager.connect(PROJECT, "u-b", "b@x.com", "B", b)
    b.broken = True  # simulate the socket dying mid-session

    await manager.handle_message(
        PROJECT, "u-a", json.dumps({"type": "presence", "cursor": {"lng": 1, "lat": 2}})
    )

    # Broken B was removed from the room
    assert "u-b" not in manager._rooms.get(PROJECT, {})
    assert "u-a" in manager._rooms.get(PROJECT, {})
