import pytest
from unittest.mock import patch

from slack.agent import execute_tool


class TestExecuteTool:
    """Tests for the execute_tool function (shared by Slack and chat agents)."""

    @patch("slack.agent._invoke_graph")
    def test_check_availability_returns_ranked_slots(self, mock_graph):
        """Mocked check_availability returns ranked slots."""
        mock_graph.return_value = {
            "result": {
                "available_slots": [
                    {
                        "start_time": "2025-03-10T10:00:00",
                        "end_time": "2025-03-10T10:30:00",
                        "display_time": "10:00 AM",
                        "score": 7.5,
                        "reason": "matches morning preference; good buffer",
                    },
                    {
                        "start_time": "2025-03-10T14:00:00",
                        "end_time": "2025-03-10T14:30:00",
                        "display_time": "2:00 PM",
                        "score": 5.0,
                        "reason": "available slot",
                    },
                ]
            }
        }

        result = execute_tool("check_availability", {"date": "2025-03-10"})
        assert "available_slots" in result
        assert len(result["available_slots"]) == 2
        assert result["available_slots"][0]["score"] == 7.5

    @patch("slack.agent._invoke_graph")
    def test_create_event_success(self, mock_graph):
        """Mocked create_event with free slot returns success."""
        mock_graph.return_value = {
            "result": {
                "success": True,
                "event": {
                    "id": "abc123",
                    "title": "Product Sync",
                    "start": "2025-03-10T14:00:00",
                    "end": "2025-03-10T14:30:00",
                    "meet_link": "https://meet.google.com/xxx-yyy-zzz",
                    "html_link": "https://calendar.google.com/event/abc123",
                },
            }
        }

        result = execute_tool("create_event", {
            "start_time": "2025-03-10T14:00:00",
            "title": "Product Sync",
        })
        assert result["success"] is True
        assert result["event"]["id"] == "abc123"
        assert "meet_link" in result["event"]

    @patch("slack.agent._invoke_graph")
    def test_create_event_conflict(self, mock_graph):
        """Mocked create_event with busy slot returns conflict error."""
        mock_graph.return_value = {
            "result": {"error": "Slot is no longer available"},
            "error": "Slot is no longer available",
        }

        result = execute_tool("create_event", {
            "start_time": "2025-03-10T14:00:00",
            "title": "Conflicting Meeting",
        })
        assert "error" in result

    def test_unknown_tool_returns_error(self):
        """Unknown tool name returns error dict."""
        result = execute_tool("nonexistent_tool", {})
        assert "error" in result
        assert "Unknown tool" in result["error"]

    @patch("slack.agent._invoke_graph")
    def test_graph_exception_returns_error(self, mock_graph):
        """Graph exception is caught and returned as error."""
        mock_graph.side_effect = RuntimeError("Calendar API timeout")

        result = execute_tool("check_availability", {"date": "2025-03-10"})
        assert "error" in result
        assert "timeout" in result["error"].lower()
