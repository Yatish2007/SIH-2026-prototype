import uuid
from datetime import datetime
from pathlib import Path
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Certificate, CourseCompletion, Course, User
from ..schemas import PostAssessmentRequest, CertificateResponse
from ..services.certificate_generator import generate_certificate
from ..services.completion import (
    best_assessment_result,
    get_certificate_eligibility,
    get_or_create_certificate
)
from .users import get_current_user

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
CERT_OUTPUT_DIR = ROOT_DIR / "certificate-system" / "certificates"

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
    """
    Fetches/creates the certificate ONLY when the backend has already
    validated course completion (learning policy + final assessment).
    This endpoint never grades or fabricates results - the certificate
    is issued by the final-assessment flow when eligibility is met.
    """
    course = db.query(Course).filter(Course.id == data.course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    eligible, reasons = get_certificate_eligibility(data.course_id, current_user.id, db)
    if not eligible:
        raise HTTPException(
            status_code=403,
            detail={"message": "Certificate is not yet eligible.", "reasons": reasons}
        )

    best = best_assessment_result(data.course_id, current_user.id, db)
    score = best.percentage if best else 0.0

    cert = get_or_create_certificate(
        data.course_id,
        current_user.id,
        db,
        course_title=course.title,
        score=score,
    )
    if not cert:
        raise HTTPException(status_code=403, detail="Certificate is not eligible yet.")

    if generate_certificate:
        try:
            generate_certificate({
                "name": current_user.name,
                "course": course.title,
                "score": int(score),
                "completion_date": cert.issued_date.strftime("%Y-%m-%d"),
                "certificate_id": cert.certificate_code,
            })
        except Exception as e:
            print("Certificate Generator notice:", e)

    return CertificateResponse(
        id=cert.id,
        user_name=current_user.name,
        course_title=course.title,
        certificate_code=cert.certificate_code,
        issued_date=cert.issued_date,
        status="VALID",
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


@router.get("/download/{certificate_code}")
def download_certificate(
    certificate_code: str,
    db: Session = Depends(get_db)
):
    cert = db.query(Certificate).filter(Certificate.certificate_code == certificate_code).first()

    if not cert:
        raise HTTPException(status_code=404, detail="Certificate record not found")

    user = db.query(User).filter(User.id == cert.user_id).first()
    course = db.query(Course).filter(Course.id == cert.course_id).first()
    completion = (
        db.query(CourseCompletion)
        .filter(
            CourseCompletion.user_id == cert.user_id,
            CourseCompletion.course_id == cert.course_id
        )
        .first()
    )
    score = completion.final_score if completion else 0.0

    pdf_file = CERT_OUTPUT_DIR / f"{certificate_code}.pdf"

    if not pdf_file.exists() and generate_certificate:
        student_payload = {
            "name": user.name if user else "Trainee User",
            "course": course.title if course else "Capacity Building Course",
            "score": int(score),
            "completion_date": cert.issued_date.strftime("%Y-%m-%d"),
            "certificate_id": cert.certificate_code
        }
        try:
            pdf_file = generate_certificate(student_payload)
        except Exception as e:
            print("Error generating PDF:", e)

    if pdf_file and Path(pdf_file).exists():
        return FileResponse(
            path=str(pdf_file),
            filename=f"Certificate-{certificate_code}.pdf",
            media_type="application/pdf"
        )

    raise HTTPException(status_code=404, detail="Certificate PDF file not generated yet")


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