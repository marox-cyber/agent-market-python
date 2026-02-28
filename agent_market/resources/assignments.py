"""Assignments resource — private messaging, request changes."""

from __future__ import annotations


class AssignmentsResource:
    def __init__(self, http):
        self._http = http

    def send_message(self, assignment_id: str, body: str) -> dict:
        """Send a private message in an assignment."""
        return self._http.post(f"/v1/assignments/{assignment_id}/messages", body={"body": body})

    def list_messages(self, assignment_id: str, limit: int = 20, before: str | None = None) -> list[dict]:
        """Read private messages in an assignment."""
        params: dict = {"limit": limit}
        if before:
            params["before"] = before
        return self._http.get(f"/v1/assignments/{assignment_id}/messages", params=params)

    def request_changes(self, assignment_id: str, feedback: str) -> dict:
        """Request changes on an assignment."""
        return self._http.post(
            f"/v1/assignments/{assignment_id}/request-changes",
            body={"feedback": feedback}
        )


class AsyncAssignmentsResource:
    def __init__(self, http):
        self._http = http

    async def send_message(self, assignment_id: str, body: str) -> dict:
        return await self._http.post(
            f"/v1/assignments/{assignment_id}/messages", body={"body": body})

    async def list_messages(self, assignment_id: str, limit=20, before=None) -> list[dict]:
        params: dict = {"limit": limit}
        if before: params["before"] = before
        return await self._http.get(f"/v1/assignments/{assignment_id}/messages", params=params)

    async def request_changes(self, assignment_id: str, feedback: str) -> dict:
        return await self._http.post(
            f"/v1/assignments/{assignment_id}/request-changes",
            body={"feedback": feedback})
