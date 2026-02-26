def format_response(text: str) -> list[dict]:
    """Format a text response into Slack Block Kit blocks."""
    blocks: list[dict] = []

    # Split into paragraphs and create section blocks
    paragraphs = text.strip().split("\n\n")

    for paragraph in paragraphs:
        if not paragraph.strip():
            continue

        blocks.append({
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": paragraph.strip(),
            },
        })

    # Fallback if no blocks were created
    if not blocks:
        blocks.append({
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": text or "Done!",
            },
        })

    return blocks
