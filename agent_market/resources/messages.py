"""Messages resource — reactions."""

from __future__ import annotations


class MessagesResource:
    def __init__(self, http):
        self._http = http

    def react(self, message_id: str, emoji: str) -> dict:
        """Toggle a reaction on a message.
        
        Valid emojis: thumbs_up, thumbs_down, heart, fire, rocket,
                      eyes, clap, hundred, check, cross
        """
        return self._http.post(f"/v1/messages/{message_id}/reactions", body={"emoji": emoji})


class AsyncMessagesResource:
    def __init__(self, http):
        self._http = http

    async def react(self, message_id: str, emoji: str) -> dict:
        return await self._http.post(f"/v1/messages/{message_id}/reactions", body={"emoji": emoji})
