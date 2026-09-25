import json
import uuid
from datetime import datetime
from typing import Dict, List, Optional, Tuple

from sqlalchemy.orm import Session

from ..models import (
    Certificate,
    CourseCompletion,
    CourseModule,
    FinalAssessmentAttempt,
    LearningPolicy,
    LearningSession,
    User,
)


# =========================================================
# SEGMENT / CONTENT CONSUMPTION HELPERS
#
# Observable content consumption is tracked as a union of
# played time-ranges (0..100, percentage of material length).
# Skipped/unwatched portions are simply never part of the
# union, so seeking ahead does not "count" as consumed.
# =========================================================

def merge_segments(existing: Optional[str], new_segments: List[list]) -> str:
    segs: List[list] = []
    if existing:
        try:
            parsed = json.loads(existing)
            if isinstance(parsed, list):
                segs = [[float(s), float(e)] for s, e in parsed if float(e) > float(s)]
        except (ValueError, TypeError):
            segs = []

    if new_segments:
        for pair in new_segments:
            try:
                start, end = float(pair[0]), float(pair[1])
            except (ValueError, TypeError, IndexError):
                continue
            if end > start:
                segs.append([min(100.0, max(0.0, start)), min(100.0, max(0.0, end))])

    segs.sort(key=lambda x: x[0])

    merged: List[list] = []
    for start, end in segs:
        if merged and start <= merged[-1][1]:
            merged[-1][1] = max(merged[-1][1], end)
        else:
            merged.append([start, end])

    return json.dumps(merged)


def consumed_percentage(session: LearningSession) -> float:
    """Percentage of material actually consumed (union of watched ranges)."""
    if not session.consumed_segments_json:
        return float(session.progress_pct or 0.0)
    try:
        segs = json.loads(session.consumed_segments_json)
    except (ValueError, TypeError):
        return float(session.progress_pct or 0.0)
    if not isinstance(segs, list) or not segs:
        return float(session.progress_pct or 0.0)
    total = 0.0
    for start, end in segs:
        try:
            total += max(0.0, float(end) - float(start))
        except (ValueError, TypeError):
            continue
    return min(100.0, total)


# =========================================================
# LEARNING POLICY EVALUATION
#
# Only observable signals are used:
#   - union content consumption  vs minimum_content_percentage
#   - maximum position reached    vs minimum_video_watch_percentage
#   - mandatory module completion (heuristic derived from the
#     same observable sessions, mirroring the existing logic)
# =========================================================

def evaluate_learning_policy(course_id: int, user_id: int, db: Session) -> Dict:
    policy = db.query(LearningPolicy).filter(LearningPolicy.course_id == course_id).first()

    if not policy:
        return {
            "policy_passed": True,
            "reasons": [],
            "content_consumption_pct": 0.0,
            "video_watch_pct": 0.0,
            "skip_pct": 0.0,
            "mandatory_modules_completed": 0,
            "mandatory_modules_total": 0,
            "inactivity_violations": 0,
            "policy_rules": {},
        }

    comp = (
        db.query(CourseCompletion)
        .filter(CourseCompletion.user_id == user_id, CourseCompletion.course_id == course_id)
        .first()
    )
    if comp and comp.learning_policy_passed:
        return {
            "policy_passed": True,
            "reasons": [],
            "content_consumption_pct": 100.0,
            "video_watch_pct": 100.0,
            "skip_pct": 0.0,
            "mandatory_modules_completed": 0,
            "mandatory_modules_total": 0,
            "inactivity_violations": 0,
            "policy_rules": _policy_rules(policy),
            "policy": policy,
        }

    sessions = (
        db.query(LearningSession)
        .filter(LearningSession.user_id == user_id, LearningSession.course_id == course_id)
        .all()
    )

    max_progress = max([s.progress_pct or 0.0 for s in sessions], default=0.0)
    content_consumption = max([consumed_percentage(s) for s in sessions], default=max_progress)
    total_watch = sum(s.watch_time_seconds or 0.0 for s in sessions)
    total_skip = sum(s.skipped_time_seconds or 0.0 for s in sessions)
    inactivity_violations = sum(s.inactivity_count or 0 for s in sessions)

    mandatory_modules = (
        db.query(CourseModule)
        .filter(CourseModule.course_id == course_id, CourseModule.is_mandatory == True)
        .all()
    )
    total_mandatory = len(mandatory_modules)

    is_video_watched = max_progress >= policy.minimum_video_watch_percentage
    if is_video_watched:
        mandatory_completed = total_mandatory
    else:
        mandatory_completed = max(0, int(total_mandatory * (content_consumption / 100)))

    reasons: List[str] = []
    if content_consumption < policy.minimum_content_percentage:
        reasons.append(
            f"Content consumption ({content_consumption:.0f}%) is below trainer requirement "
            f"({policy.minimum_content_percentage:.0f}%)."
        )
    if not is_video_watched:
        reasons.append(
            f"Video watch time ({max_progress:.0f}%) is below required minimum "
            f"({policy.minimum_video_watch_percentage:.0f}%)."
        )
    if policy.require_all_mandatory_modules and mandatory_completed < total_mandatory:
        reasons.append(
            f"Mandatory modules incomplete ({mandatory_completed}/{total_mandatory} completed)."
        )

    policy_passed = len(reasons) == 0

    if policy_passed:
        if not comp:
            comp = CourseCompletion(
                user_id=user_id,
                course_id=course_id,
                learning_policy_passed=True,
                final_assessment_passed=False,
            )
            db.add(comp)
            db.commit()
        elif not comp.learning_policy_passed:
            comp.learning_policy_passed = True
            db.commit()

    return {
        "policy_passed": policy_passed,
        "reasons": reasons,
        "content_consumption_pct": round(content_consumption, 1),
        "video_watch_pct": round(max_progress, 1),
        "skip_pct": round(total_skip, 1),
        "mandatory_modules_completed": mandatory_completed,
        "mandatory_modules_total": total_mandatory,
        "inactivity_violations": inactivity_violations,
        "policy_rules": _policy_rules(policy),
        "policy": policy,
        "sessions_total_watch": round(total_watch, 1),
    }


def _policy_rules(policy) -> Dict:
    return {
        "minimum_content_percentage": policy.minimum_content_percentage,
        "minimum_video_watch_percentage": policy.minimum_video_watch_percentage,
        "maximum_skip_percentage": policy.maximum_skip_percentage,
        "allowed_playback_speed": policy.allowed_playback_speed,
        "inactivity_threshold": policy.inactivity_threshold,
        "require_all_mandatory_modules": policy.require_all_mandatory_modules,
        "final_assessment_required": policy.final_assessment_required,
    }


# =========================================================
# CERTIFICATE ELIGIBILITY
#
# The backend is the final authority. A certificate is only
# eligible when the learning policy has passed AND (depending
# on the policy) the final assessment has been passed.
# =========================================================

def get_certificate_eligibility(course_id: int, user_id: int, db: Session) -> Tuple[bool, List[str]]:
    from ..models import LearningPolicy as LP

    policy = db.query(LP).filter(LP.course_id == course_id).first()

    comp = (
        db.query(CourseCompletion)
        .filter(CourseCompletion.user_id == user_id, CourseCompletion.course_id == course_id)
        .first()
    )
    if not comp:
        return False, ["Learning requirements not yet satisfied."]

    reasons: List[str] = []
    if not comp.learning_policy_passed:
        reasons.append("Learning policy requirements are not yet satisfied.")
    if policy and policy.final_assessment_required and not comp.final_assessment_passed:
        reasons.append("Final assessment has not been passed.")

    return (len(reasons) == 0), reasons


def get_or_create_certificate(
    course_id: int,
    user_id: int,
    db: Session,
    course_title: str = "Capacity Building Course",
    score: float = 0.0,
) -> Optional[Certificate]:
    """Issues (or returns existing) certificate record only for eligible trainees."""
    eligible, _reasons = get_certificate_eligibility(course_id, user_id, db)
    if not eligible:
        return None

    user = db.get(User, user_id)
    comp = (
        db.query(CourseCompletion)
        .filter(CourseCompletion.user_id == user_id, CourseCompletion.course_id == course_id)
        .first()
    )

    cert = (
        db.query(Certificate)
        .filter(Certificate.user_id == user_id, Certificate.course_id == course_id)
        .first()
    )

    if not cert:
        cert_code = f"CC-{uuid.uuid4().hex[:8].upper()}"
        cert = Certificate(
            user_id=user_id,
            course_id=course_id,
            certificate_code=cert_code,
            issued_date=datetime.utcnow(),
        )
        db.add(cert)
        db.commit()
        db.refresh(cert)
    else:
        cert_code = cert.certificate_code

    if comp:
        comp.certificate_code = cert.certificate_code
        comp.completed_at = datetime.utcnow()
        db.commit()

    return cert


def best_assessment_result(course_id: int, user_id: int, db: Session) -> Optional[FinalAssessmentAttempt]:
    return (
        db.query(FinalAssessmentAttempt)
        .filter(
            FinalAssessmentAttempt.user_id == user_id,
            FinalAssessmentAttempt.course_id == course_id,
            FinalAssessmentAttempt.passed == True,
        )
        .order_by(FinalAssessmentAttempt.percentage.desc())
        .first()
    )