import base64
from typing import Optional
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import Response
from sqlalchemy.orm import Session
from sqlalchemy import select

from ..database import get_db
from ..models import Document
from ..security import require_staff

router = APIRouter(prefix="/api/documents", tags=["documents"])

@router.post("/upload/{guild_id}")
async def upload_document(
    guild_id: int,
    entreprise: str = Form(...),
    document_type: Optional[str] = Form(None),
    uploaded_by: Optional[str] = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _=Depends(require_staff)
):
    content = await file.read()
    b64 = base64.b64encode(content).decode()
    doc = Document(
        guild_id=guild_id,
        entreprise=entreprise,
        filename=file.filename,
        content_type=file.content_type or "application/octet-stream",
        size=len(content),
        file_data_base64=b64,
        uploaded_by=uploaded_by,
        document_type=document_type,
    )
    db.add(doc)
    db.commit()
    return {"status": "ok", "id": doc.id}

@router.get("/{guild_id}")
async def list_documents(guild_id: int, entreprise: str, db: Session = Depends(get_db), _=Depends(require_staff)):
    rows = db.execute(
        select(Document).where(Document.guild_id == guild_id, Document.entreprise == entreprise)
    ).scalars().all()
    return [
        {
            "id": d.id,
            "filename": d.filename,
            "content_type": d.content_type,
            "size": d.size,
            "uploaded_by": d.uploaded_by,
            "document_type": d.document_type,
        }
        for d in rows
    ]

@router.get("/{guild_id}/{doc_id}/download")
async def download_document(guild_id: int, doc_id: int, db: Session = Depends(get_db), _=Depends(require_staff)):
    d = db.execute(
        select(Document).where(Document.id == doc_id, Document.guild_id == guild_id)
    ).scalars().first()
    if not d:
        raise HTTPException(status_code=404, detail="Not found")
    content = base64.b64decode(d.file_data_base64.encode())
    return Response(content, media_type=d.content_type, headers={"Content-Disposition": f"attachment; filename={d.filename}"})