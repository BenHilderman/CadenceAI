import pytest
from unittest.mock import patch
from datetime import datetime


class TestSystemPrompt:
    """Tests for system prompt content and structure."""

    def _get_prompt(self):
        from system_prompt import get_system_prompt
        return get_system_prompt()

    def test_prompt_contains_step_1_greet(self):
        prompt = self._get_prompt()
        assert "Step 1" in prompt
        assert "name" in prompt.lower()

    def test_prompt_contains_step_2_date_time(self):
        prompt = self._get_prompt()
        assert "Step 2" in prompt
        assert "date" in prompt.lower()

    def test_prompt_contains_step_3_title(self):
        prompt = self._get_prompt()
        assert "Step 3" in prompt
        assert "title" in prompt.lower()

    def test_prompt_contains_step_4_confirm(self):
        prompt = self._get_prompt()
        assert "Step 4" in prompt
        assert "confirm" in prompt.lower() or "Confirm" in prompt

    def test_prompt_contains_step_5_book(self):
        prompt = self._get_prompt()
        assert "Step 5" in prompt
        assert "book" in prompt.lower() or "Book" in prompt

    def test_prompt_includes_current_date(self):
        prompt = self._get_prompt()
        today = datetime.now()
        # The prompt should contain today's date in some format
        assert today.strftime("%B") in prompt  # Month name
        assert str(today.day) in prompt

    def test_prompt_includes_timezone(self):
        prompt = self._get_prompt()
        assert "Timezone:" in prompt

    def test_prompt_forbids_open_ended_questions(self):
        prompt = self._get_prompt()
        assert "open-ended" in prompt.lower() or "What can I help" in prompt

    def test_prompt_duration_always_30_minutes(self):
        prompt = self._get_prompt()
        assert "30 minutes" in prompt

    def test_prompt_identifies_as_cadence(self):
        prompt = self._get_prompt()
        assert "Cadence" in prompt
