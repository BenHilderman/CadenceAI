from langgraph.graph import StateGraph, END

from graph.state import SchedulingState
from graph.nodes import (
    fetch_busy, compute_slots, rank, verify_free,
    book_event, return_error, reschedule_event, cancel_event,
)
from graph.edges import route_action, check_verification


def build_scheduling_graph():
    """Build and compile the scheduling state graph.

    Flows:
      check_availability: fetch_busy -> compute_slots -> rank -> END
      create_event:       verify_free -> (book_event | return_error) -> END
      reschedule_event:   verify_free -> (reschedule_event | return_error) -> END
      cancel_event:       cancel_event -> END
    """
    graph = StateGraph(SchedulingState)

    # Add all nodes
    graph.add_node("fetch_busy", fetch_busy)
    graph.add_node("compute_slots", compute_slots)
    graph.add_node("rank", rank)
    graph.add_node("verify_free", verify_free)
    graph.add_node("book_event", book_event)
    graph.add_node("return_error", return_error)
    graph.add_node("reschedule_event", reschedule_event)
    graph.add_node("cancel_event", cancel_event)

    # Entry point: route based on action
    graph.set_conditional_entry_point(route_action)

    # Availability path: fetch_busy -> compute_slots -> rank -> END
    graph.add_edge("fetch_busy", "compute_slots")
    graph.add_edge("compute_slots", "rank")
    graph.add_edge("rank", END)

    # Booking + Reschedule path: verify_free -> conditional -> (book|reschedule|error) -> END
    graph.add_conditional_edges("verify_free", check_verification)
    graph.add_edge("book_event", END)
    graph.add_edge("reschedule_event", END)
    graph.add_edge("return_error", END)

    # Cancel path: cancel_event -> END
    graph.add_edge("cancel_event", END)

    return graph.compile()


scheduling_graph = build_scheduling_graph()
