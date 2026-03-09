VALID_USER_ROLES = {"author", "internal_reviewer", "external_reviewer", "editor", "admin"}
REVIEW_STAGES = ("internal", "external", "final")

STAGE_STATUS_MAP = {
    "internal": "internal_review",
    "external": "external_review",
    "final": "final_review",
}

ASSIGNABLE_ROLES_BY_STAGE = {
    "internal": {"internal_reviewer", "editor", "admin"},
    "external": {"external_reviewer", "editor", "admin"},
    "final": {"editor", "admin"},
}

ACTION_TYPE_STAGE_FLOW = {
    "submit_internal_review": ("internal", "external_review", "external"),
    "submit_external_review": ("external", "final_review", "final"),
    "submit_final_submission": ("final", "final_submitted", None),
}

TERMINAL_STATUSES = {"accepted", "rejected", "final_submitted"}


def can_be_assigned_to_stage(user_role: str, review_stage: str) -> bool:
    return review_stage in ASSIGNABLE_ROLES_BY_STAGE and user_role in ASSIGNABLE_ROLES_BY_STAGE[review_stage]


def status_for_stage(review_stage: str) -> str | None:
    return STAGE_STATUS_MAP.get(review_stage)


def next_flow_for_action(action_type: str) -> tuple[str, str, str | None] | None:
    return ACTION_TYPE_STAGE_FLOW.get(action_type)
