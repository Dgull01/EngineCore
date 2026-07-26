"""
EngineCore Authority Review

This module determines which levels of governing authority
should be reviewed for a given technical question.

Current Version:
- Defines the authority hierarchy.
- Produces a structured review checklist.

Future Versions:
- Automatic authority detection.
- Code applicability analysis.
- Jurisdiction awareness.
- Conflict detection.
"""


AUTHORITY_HIERARCHY = [
    {
        "level": 1,
        "name": "Applicable Code",
        "examples": [
            "International Fire Code",
            "International Building Code",
            "Local Amendments",
        ],
    },
    {
        "level": 2,
        "name": "Consensus Standards",
        "examples": [
            "NFPA 17A",
            "NFPA 96",
            "UL Standards",
        ],
    },
    {
        "level": 3,
        "name": "Manufacturer Documentation",
        "examples": [
            "Installation Manuals",
            "Operation Manuals",
            "Maintenance Manuals",
            "Service Bulletins",
        ],
    },
    {
        "level": 4,
        "name": "Company Procedures",
        "examples": [
            "PAC SOP",
            "Inspection Procedures",
            "Internal Policies",
        ],
    },
    {
        "level": 5,
        "name": "Historical / Field Evidence",
        "examples": [
            "Service Notes",
            "Previous Work Orders",
            "Historical Decisions",
        ],
    },
]


def build_authority_review() -> str:
    """
    Build the governing authority review instructions.

    This prompt is inserted into EngineCore's reasoning prompt.
    """

    lines = []

    lines.append("GOVERNING AUTHORITY REVIEW")
    lines.append("")

    for authority in AUTHORITY_HIERARCHY:

        lines.append(
            f"Level {authority['level']} — {authority['name']}"
        )

        for example in authority["examples"]:
            lines.append(f"- {example}")

        lines.append("")

    lines.append(
        "Review every authority level that is applicable."
    )

    lines.append(
        "If an authority level is silent, state that it is silent."
    )

    lines.append(
        "Do not skip a higher authority simply because a lower authority answered the question."
    )

    lines.append(
        "If conflicting authorities exist, report the conflict."
    )

    lines.append(
        "Identify the governing basis for the final answer."
    )

    return "\n".join(lines)