import pytest

from utils.audit import AuditLog, AuditEntry


class TestAuditLog:
    """Tests for the AuditLog class."""

    @pytest.fixture(autouse=True)
    def _fresh_log(self):
        self.log = AuditLog()

    def test_log_appends_entry(self):
        self.log.log("create_event", {"title": "Test"}, {"id": "123"})
        assert len(self.log.entries) == 1
        assert self.log.entries[0].action == "create_event"

    def test_log_returns_audit_entry(self):
        entry = self.log.log("check_availability", {"date": "2025-03-10"}, {"slots": []})
        assert isinstance(entry, AuditEntry)
        assert entry.action == "check_availability"

    def test_get_entries_returns_dicts(self):
        self.log.log("create_event", {"title": "Test"}, {"id": "123"})
        entries = self.log.get_entries()
        assert len(entries) == 1
        assert isinstance(entries[0], dict)
        assert entries[0]["action"] == "create_event"

    def test_get_entries_preserves_order(self):
        self.log.log("action_a", {}, {})
        self.log.log("action_b", {}, {})
        self.log.log("action_c", {}, {})
        entries = self.log.get_entries()
        actions = [e["action"] for e in entries]
        assert actions == ["action_a", "action_b", "action_c"]

    def test_clear_removes_all_entries(self):
        self.log.log("x", {}, {})
        self.log.log("y", {}, {})
        self.log.clear()
        assert len(self.log.entries) == 0
        assert self.log.get_entries() == []

    def test_success_flag_defaults_true(self):
        entry = self.log.log("test", {}, {})
        assert entry.success is True

    def test_success_flag_can_be_false(self):
        entry = self.log.log("test", {}, {"error": "fail"}, success=False)
        assert entry.success is False

    def test_entry_has_timestamp(self):
        entry = self.log.log("test", {}, {})
        assert entry.timestamp is not None
        assert "T" in entry.timestamp  # ISO format

    def test_get_entries_includes_all_fields(self):
        self.log.log("test_action", {"key": "val"}, {"res": "ok"}, success=True)
        entry = self.log.get_entries()[0]
        assert "timestamp" in entry
        assert "action" in entry
        assert "params" in entry
        assert "result" in entry
        assert "success" in entry
