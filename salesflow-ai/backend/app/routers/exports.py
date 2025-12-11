from fastapi import APIRouter, Depends, Body
from fastapi.responses import StreamingResponse
from app.core.security.main import get_current_user
import io

router = APIRouter(prefix="/api/exports", tags=["exports"])


@router.post("/pdf")
async def create_pdf(
    request: dict = Body(...),
    current_user=Depends(get_current_user),
):
    """Erstellt ein einfaches PDF aus Text/HTML-Content."""
    from reportlab.pdfgen import canvas
    from reportlab.lib.pagesizes import A4

    content = request.get("content", "")
    title = request.get("title", "Dokument")

    buffer = io.BytesIO()
    p = canvas.Canvas(buffer, pagesize=A4)

    # Title
    p.setFont("Helvetica-Bold", 16)
    p.drawString(50, 800, title[:80])
    p.setFont("Helvetica", 12)

    # Text mit einfachem Zeilenumbruch
    y = 750
    for line in str(content).split("\n"):
        if y < 50:
            p.showPage()
            y = 800
            p.setFont("Helvetica", 12)
        p.drawString(50, y, line[:80])
        y -= 20

    p.save()
    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{title}.pdf"'},
    )


@router.post("/excel")
async def create_excel(
    request: dict = Body(...),
    current_user=Depends(get_current_user),
):
    """Erstellt eine Excel-Datei aus Daten (Array von Objekten/Records)."""
    import pandas as pd

    data = request.get("data", [])
    filename = request.get("filename", "export")

    df = pd.DataFrame(data)
    buffer = io.BytesIO()
    df.to_excel(buffer, index=False)
    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}.xlsx"'},
    )


@router.post("/csv")
async def create_csv(
    request: dict = Body(...),
    current_user=Depends(get_current_user),
):
    """Erstellt eine CSV-Datei aus Daten (Array von Objekten/Records)."""
    import pandas as pd

    data = request.get("data", [])
    filename = request.get("filename", "export")

    df = pd.DataFrame(data)
    csv_content = df.to_csv(index=False)

    return StreamingResponse(
        io.StringIO(csv_content),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}.csv"'},
    )

