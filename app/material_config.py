"""
Single source of truth for course learning-material configuration.

Both the FastAPI upload endpoints and the frontend validation rules derive
from the material taxonomy defined here, so extension/limit rules live in
exactly one place.
"""

# Maximum upload size per material type (bytes).
MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024  # 500 MB ceiling for any file upload

# Reasonable per-type ceilings. Videos get the most headroom, documents far less.
DEFAULT_MAX_SIZE = 100 * 1024 * 1024  # 100 MB fallback


def _exts(*values: str) -> set:
    return {v if v.startswith(".") else f".{v}" for v in values}


# material_type -> {
#   "label":        human label used in the UI,
#   "extensions":   allowed file extensions (lowercase, dot-prefixed),
#   "accept":       value for the HTML <input type="file" accept attribute,
#   "max_size":     per-type size ceiling in bytes,
#   "mime":         canonical mime type for the material,
#   "input":        "file" | "url" | "text" -> which form field the UI renders,
#   "label_hint":   short hint shown under the upload control,
# }
MATERIAL_TYPES: dict = {
    "video": {
        "label": "Video (MP4/WebM/OGG)",
        "extensions": _exts("mp4", "webm", "ogg"),
        "accept": "video/mp4,video/webm,video/ogg,.mp4,.webm,.ogg",
        "max_size": MAX_FILE_SIZE_BYTES,
        "mime": "video/mp4",
        "input": "file",
        "label_hint": "Upload MP4/WebM/OGG",
    },
    "pdf": {
        "label": "PDF Document",
        "extensions": _exts("pdf"),
        "accept": "application/pdf,.pdf",
        "max_size": 50 * 1024 * 1024,
        "mime": "application/pdf",
        "input": "file",
        "label_hint": "Upload PDF",
    },
    "presentation": {
        "label": "PowerPoint (PPT/PPTX)",
        "extensions": _exts("ppt", "pptx"),
        "accept": ".ppt,.pptx",
        "max_size": 50 * 1024 * 1024,
        "mime": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "input": "file",
        "label_hint": "Upload PPT/PPTX",
    },
    "document": {
        "label": "Word Document (DOC/DOCX)",
        "extensions": _exts("doc", "docx"),
        "accept": ".doc,.docx",
        "max_size": 25 * 1024 * 1024,
        "mime": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "input": "file",
        "label_hint": "Upload DOC/DOCX",
    },
    "spreadsheet": {
        "label": "Excel Spreadsheet (XLS/XLSX)",
        "extensions": _exts("xls", "xlsx"),
        "accept": ".xls,.xlsx",
        "max_size": 25 * 1024 * 1024,
        "mime": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "input": "file",
        "label_hint": "Upload XLS/XLSX",
    },
    "google_sheet": {
        "label": "Google Sheets (URL)",
        "extensions": set(),
        "accept": "",
        "max_size": 0,
        "mime": "text/html",
        "input": "url",
        "label_hint": "https://docs.google.com/spreadsheets/d/...",
    },
    "link": {
        "label": "External Resource (URL)",
        "extensions": set(),
        "accept": "",
        "max_size": 0,
        "mime": "text/html",
        "input": "url",
        "label_hint": "https://example.com/resource",
    },
    "note": {
        "label": "Notes (Text/Content)",
        "extensions": set(),
        "accept": "",
        "max_size": 0,
        "mime": "text/plain",
        "input": "text",
        "label_hint": "Write the learning content here...",
    },
}

VALID_MATERIAL_TYPES = set(MATERIAL_TYPES.keys())

# Material types that reference an external resource instead of a stored file.
URL_MATERIAL_TYPES = {"google_sheet", "link"}
# Material types that store trainer-authored text in `content`.
TEXT_MATERIAL_TYPES = {"note"}


def max_size_for(material_type: str) -> int:
    cfg = MATERIAL_TYPES.get((material_type or "").lower())
    return cfg["max_size"] if cfg else DEFAULT_MAX_SIZE


def allowed_extensions(material_type: str) -> set:
    cfg = MATERIAL_TYPES.get((material_type or "").lower())
    return set(cfg["extensions"]) if cfg else set()


def is_file_material(material_type: str) -> bool:
    cfg = MATERIAL_TYPES.get((material_type or "").lower())
    return bool(cfg) and cfg["input"] == "file"


def human_size(num_bytes: int) -> str:
    size = float(num_bytes or 0)
    for unit in ("B", "KB", "MB", "GB"):
        if size < 1024 or unit == "GB":
            return f"{size:.0f} {unit}" if unit == "B" else f"{size:.1f} {unit}"
        size /= 1024
    return f"{size:.1f} GB"
