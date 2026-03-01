import pytest

from graph.scheduling_graph import build_scheduling_graph


class TestSchedulingGraphStructure:
    """Tests that the compiled graph has the expected topology."""

    @pytest.fixture(autouse=True)
    def _build(self):
        self.graph = build_scheduling_graph()

    def test_graph_compiles_without_error(self):
        assert self.graph is not None

    def test_graph_has_expected_nodes(self):
        node_names = set(self.graph.nodes.keys())
        expected = {
            "fetch_busy", "compute_slots", "rank",
            "verify_free", "book_event", "return_error",
            "reschedule_event", "cancel_event",
        }
        assert expected.issubset(node_names)

    def test_fetch_busy_leads_to_compute_slots(self):
        edges = self.graph.builder.edges
        assert ("fetch_busy", "compute_slots") in edges

    def test_compute_slots_leads_to_rank(self):
        edges = self.graph.builder.edges
        assert ("compute_slots", "rank") in edges

    def test_rank_leads_to_end(self):
        edges = self.graph.builder.edges
        assert ("rank", "__end__") in edges

    def test_book_event_leads_to_end(self):
        edges = self.graph.builder.edges
        assert ("book_event", "__end__") in edges

    def test_cancel_event_leads_to_end(self):
        edges = self.graph.builder.edges
        assert ("cancel_event", "__end__") in edges

    def test_reschedule_event_leads_to_end(self):
        edges = self.graph.builder.edges
        assert ("reschedule_event", "__end__") in edges
