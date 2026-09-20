import os
import re
import uuid
import mimetypes
from pathlib import Path
from typing import Optional, Dict, Any, Tuple
from fastapi import HTTPException, status, UploadFile, Request
from fastapi.responses import StreamingResponse, Response

# Base storage directory for reliable persistent storage
BASE_DIR = Path(__file__).resolve().parent.parent
UPLOADS_DIR = BASE_DIR / "uploads"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

BUCKET_VIDEOS = "course-videos"
BUCKET_MATERIALS = "course-materials"
BUCKET_PRESENTATIONS = "course-presentations"

VALID_BUCKETS = {
    BUCKET_VIDEOS,
    BUCKET_MATERIALS,
    BUCKET_PRESENTATIONS,
}

# Supported file type maps
VIDEO_EXTENSIONS = {".mp4", ".webm", ".ogg", ".mov", ".mkv"}
DOCUMENT_EXTENSIONS = {".pdf", ".doc", ".docx", ".txt", ".md"}
PRESENTATION_EXTENSIONS = {".ppt", ".pptx", ".key", ".pdf"}

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY") or os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")


def get_bucket_for_material_type(material_type: str, filename: str) -> str:
    ext = Path(filename).suffix.lower()
    mat_type = material_type.lower()
    
    if mat_type == "video" or ext in VIDEO_EXTENSIONS:
        return BUCKET_VIDEOS
    elif mat_type == "presentation" or ext in PRESENTATION_EXTENSIONS:
        return BUCKET_PRESENTATIONS
    else:
        return BUCKET_MATERIALS


def sanitize_filename(filename: str) -> str:
    # Strip dangerous characters
    clean = re.sub(r"[^\w\.-]", "_", filename)
    return clean


async def save_uploaded_file(
    file: UploadFile,
    course_id: int,
    module_id: int,
    material_type: str
) -> Dict[str, Any]:
    bucket = get_bucket_for_material_type(material_type, file.filename or "file")
    original_name = file.filename or "uploaded_file"
    safe_name = sanitize_filename(original_name)
    unique_prefix = uuid.uuid4().hex[:12]
    unique_file_name = f"{unique_prefix}_{safe_name}"

    relative_path = f"{course_id}/{module_id}/{unique_file_name}"
    target_dir = UPLOADS_DIR / bucket / str(course_id) / str(module_id)
    target_dir.mkdir(parents=True, exist_ok=True)
    target_file = target_dir / unique_file_name

    # Read and save file content
    contents = await file.read()
    file_size = len(contents)

    with open(target_file, "wb") as f:
        f.write(contents)

    mime_type = file.content_type
    if not mime_type or mime_type == "application/octet-stream":
        mime_type, _ = mimetypes.guess_type(original_name)
        if not mime_type:
            ext = Path(original_name).suffix.lower()
            if ext in VIDEO_EXTENSIONS:
                mime_type = "video/mp4"
            elif ext == ".pdf":
                mime_type = "application/pdf"
            elif ext in {".doc", ".docx"}:
                mime_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            elif ext in {".ppt", ".pptx"}:
                mime_type = "application/vnd.openxmlformats-officedocument.presentationml.presentation"
            else:
                mime_type = "application/octet-stream"

    # Try uploading to Supabase Storage if configured
    supabase_uploaded = False
    supabase_public_url = ""
    if SUPABASE_URL and SUPABASE_KEY:
        try:
            from supabase import create_client
            supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)
            res = supabase_client.storage.from_(bucket).upload(
                path=relative_path,
                file=contents,
                file_options={"content-type": mime_type}
            )
            supabase_public_url = f"{SUPABASE_URL}/storage/v1/object/public/{bucket}/{relative_path}"
            supabase_uploaded = True
        except Exception as e:
            print("Supabase Storage upload fallback note:", e)

    # Serving URL (points to our high-performance HTTP range streaming endpoint)
    # If Supabase public URL exists and is verified, it can be used, but our range streaming endpoint guarantees seek support
    streaming_url = f"/storage/{bucket}/{relative_path}"

    return {
        "bucket": bucket,
        "file_name": original_name,
        "unique_file_name": unique_file_name,
        "file_path": relative_path,
        "file_url": streaming_url,
        "supabase_url": supabase_public_url if supabase_uploaded else None,
        "mime_type": mime_type,
        "file_size": file_size,
        "duration_seconds": None # Will be populated by client on load or metadata extraction
    }


def stream_file_with_range(
    bucket: str,
    file_path: str,
    request: Request
) -> Response:
    if bucket not in VALID_BUCKETS:
        raise HTTPException(status_code=404, detail="Storage bucket not found")

    full_path = UPLOADS_DIR / bucket / file_path
    if not full_path.exists() or not full_path.is_file():
        raise HTTPException(status_code=404, detail="Requested learning file not found")

    file_size = full_path.stat().st_size
    mime_type, _ = mimetypes.guess_type(str(full_path))
    if not mime_type:
        ext = full_path.suffix.lower()
        if ext in VIDEO_EXTENSIONS:
            mime_type = "video/mp4"
        elif ext == ".pdf":
            mime_type = "application/pdf"
        elif ext in {".ppt", ".pptx"}:
            mime_type = "application/vnd.ms-powerpoint"
        elif ext in {".doc", ".docx"}:
            mime_type = "application/msword"
        else:
            mime_type = "application/octet-stream"

    range_header = request.headers.get("range")

    if not range_header:
        def iterfile():
            with open(full_path, mode="rb") as f:
                while chunk := f.read(1024 * 1024): # 1MB chunks
                    yield chunk

        headers = {
            "Content-Length": str(file_size),
            "Accept-Ranges": "bytes",
            "Content-Type": mime_type,
            "Cache-Control": "public, max-age=3600"
        }
        return StreamingResponse(iterfile(), media_type=mime_type, headers=headers)

    # Handle byte-range request for HTML5 video seeking
    try:
        range_match = re.match(r"bytes=(\d+)-(\d*)", range_header)
        if not range_match:
            raise ValueError()

        start = int(range_match.group(1))
        end = int(range_match.group(2)) if range_match.group(2) else file_size - 1

        if start >= file_size or end >= file_size or start > end:
            return Response(
                status_code=status.HTTP_416_REQUESTED_RANGE_NOT_SATISFIABLE,
                headers={"Content-Range": f"bytes */{file_size}"}
            )

        chunk_size = end - start + 1

        def iter_range():
            with open(full_path, mode="rb") as f:
                f.seek(start)
                bytes_left = chunk_size
                while bytes_left > 0:
                    read_bytes = min(bytes_left, 1024 * 1024)
                    chunk = f.read(read_bytes)
                    if not chunk:
                        break
                    bytes_left -= len(chunk)
                    yield chunk

        headers = {
            "Content-Range": f"bytes {start}-{end}/{file_size}",
            "Accept-Ranges": "bytes",
            "Content-Length": str(chunk_size),
            "Content-Type": mime_type,
            "Cache-Control": "public, max-age=3600"
        }
        return StreamingResponse(iter_range(), status_code=206, media_type=mime_type, headers=headers)

    except Exception:
        # Fallback to normal stream if range header is malformed
        def iterfile():
            with open(full_path, mode="rb") as f:
                while chunk := f.read(1024 * 1024):
                    yield chunk
        return StreamingResponse(iterfile(), media_type=mime_type)
