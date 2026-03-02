import pytest
from unittest.mock import MagicMock, patch


@pytest.fixture
def mock_calendar_client():
    """Mock CalendarClient for tests that don't need real Google API calls."""
    with patch("tools.calendar_client.CalendarClient") as MockClient:
        instance = MagicMock()
        MockClient.return_value = instance
        yield instance


@pytest.fixture
def mock_scheduling_graph():
    """Mock the scheduling graph invoke call."""
    with patch("graph.scheduling_graph.scheduling_graph") as mock_graph:
        yield mock_graph
