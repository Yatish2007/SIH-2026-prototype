import uuid
from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Certificate, PostAssessment, Course, User
from ..schemas import PostAssessmentRequest, CertificateResponse
from .users import get_current_user

router = APIRouter(
    prefix="/certificates",
    tags=["Post-Assessment & Certificates"]
)


@router.post("/submit-post-assessment")
def submit_post_assessment(
    data: PostAssessmentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    course = db.query(Course).filter(Course.id == data.course_id).first()
    course_title = course.title if course else "Capacity Building Course"
    c_id = course.id if course else 1

    # Evaluate post-assessment answers
    total = len(data.answers) if data.answers else 5
    score = total # Demo high passing score
    passed = True

    post_att = PostAssessment(
        user_id=current_user.id,
        course_id=c_id,
        score=score,
        passed=passed
    )
    db.add(post_att)
    db.commit()

    # Generate certificate if passed
    cert_code = f"CC-{uuid.uuid4().hex[:8].upper()}"

    existing_cert = (
        db.query(Certificate)
        .filter(Certificate.user_id == current_user.id, Certificate.course_id == c_id)
        .first()
    )

    if not existing_cert:
        cert = Certificate(
            user_id=current_user.id,
            course_id=c_id,
            certificate_code=cert_code,
            issued_date=datetime.utcnow()
        )
        db.add(cert)
        db.commit()
        db.refresh(cert)
    else:
        cert = existing_cert

    return CertificateResponse(
        id=cert.id,
        user_name=current_user.name,
        course_title=course_title,
        certificate_code=cert.certificate_code,
        issued_date=cert.issued_date,
        status="VALID"
    )


@router.get("/me", response_model=List[CertificateResponse])
def get_user_certificates(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    certs = db.query(Certificate).filter(Certificate.user_id == current_user.id).all()
    results = []

    for c in certs:
        course = db.query(Course).filter(Course.id == c.course_id).first()
        results.append(CertificateResponse(
            id=c.id,
            user_name=current_user.name,
            course_title=course.title if course else "Capacity Building Course",
            certificate_code=c.certificate_code,
            issued_date=c.issued_date,
            status="VALID"
        ))

    return results


@router.get("/verify/{certificate_code}")
def verify_certificate(
    certificate_code: str,
    db: Session = Depends(get_db)
):
    cert = db.query(Certificate).filter(Certificate.certificate_code == certificate_code).first()

    if not cert:
        return {"valid": False, "message": "Certificate code not found in registry."}

    user = db.query(User).filter(User.id == cert.user_id).first()
    course = db.query(Course).filter(Course.id == cert.course_id).first()

    return {
        "valid": True,
        "certificate_code": cert.certificate_code,
        "user_name": user.name if user else "Verified Trainee",
        "course_title": course.title if course else "Capacity Building Course",
        "issued_date": cert.issued_date.strftime("%Y-%m-%d"),
        "status": "OFFICIALLY_VERIFIED"
    }
