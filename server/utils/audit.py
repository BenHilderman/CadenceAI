from datetime import datetime
from dataclasses import dataclass, field


@dataclass
class AuditEntry:
    timestamp: str
    action: str
    params: dict
    result: dict
    success: bool


class AuditLog:
    def __init__(self):
        self.entries: list[AuditEntry] = []

    def log(self, action: str, params: dict, result: dict, success: bool = True):
        entry = AuditEntry(
            timestamp=datetime.now().isoformat(),
            action=action,
            params=params,
            result=result,
            success=success,
        )
        self.entries.append(entry)
        return entry

    def get_entries(self) -> list[dict]:
        return [
            {
                "timestamp": e.timestamp,
                "action": e.action,
                "params": e.params,
                "result": e.result,
                "success": e.success,
            }
            for e in self.entries
        ]

    def clear(self):
        self.entries.clear()


audit_log = AuditLog()
