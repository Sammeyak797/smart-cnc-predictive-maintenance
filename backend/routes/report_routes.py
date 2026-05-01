from flask import Blueprint, request, send_file, jsonify
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.lib.pagesizes import A4
from io import BytesIO
from datetime import datetime, timezone
from middleware.auth_middleware import token_required

report_bp = Blueprint("report", __name__)

REQUIRED_FIELDS             = ["machine_id", "prediction", "rul", "maintenance", "analysis"]
REQUIRED_PREDICTION_FIELDS  = ["failure_type", "confidence"]
REQUIRED_MAINTENANCE_FIELDS = ["priority"]
REQUIRED_ANALYSIS_FIELDS    = ["possible_cause", "recommendation"]

SENSOR_LABELS = {
    "air_temp":     "Air Temperature (K)",
    "process_temp": "Process Temperature (K)",
    "rpm":          "Spindle Speed (RPM)",
    "torque":       "Torque (Nm)",
    "tool_wear":    "Tool Wear (min)",
    "type":         "Machine Duty Type",
}


# ── Helpers ───────────────────────────────────────────────────────────────────
def safe_str(value, fallback="N/A"):
    if value is None or value == "": return fallback
    return str(value)


def priority_color(priority):
    return {"URGENT": "#DC2626", "SCHEDULE_SOON": "#D97706", "OK": "#059669"}.get(priority, "#6B7280")


def rul_color(rul):
    if rul < 20: return "#DC2626"
    if rul < 50: return "#D97706"
    return "#059669"


def make_info_table(rows, col_widths, row_bg="#F8FAFF"):
    t = Table(rows, colWidths=col_widths)
    t.setStyle(TableStyle([
        ("ROWBACKGROUNDS", (0, 0), (-1, -1), [colors.white, colors.HexColor(row_bg)]),
        ("GRID",      (0, 0), (-1, -1), 0.5, colors.HexColor("#E5E7EB")),
        ("FONTNAME",  (0, 0), (0, -1),  "Helvetica-Bold"),
        ("FONTSIZE",  (0, 0), (-1, -1), 9),
        ("PADDING",   (0, 0), (-1, -1), 8),
        ("TEXTCOLOR", (0, 0), (0, -1),  colors.HexColor("#374151")),
        ("TEXTCOLOR", (1, 0), (1, -1),  colors.HexColor("#111827")),
    ]))
    return t


def banner_table(text_para, bg_hex, border_hex):
    t = Table([[text_para]], colWidths=[6*inch])
    t.setStyle(TableStyle([
        ("BACKGROUND",    (0,0),(-1,-1), colors.HexColor(bg_hex)),
        ("BOX",           (0,0),(-1,-1), 1, colors.HexColor(border_hex)),
        ("LEFTPADDING",   (0,0),(-1,-1), 12),
        ("TOPPADDING",    (0,0),(-1,-1), 10),
        ("BOTTOMPADDING", (0,0),(-1,-1), 10),
    ]))
    return t


# ── Route ─────────────────────────────────────────────────────────────────────
@report_bp.route("/", methods=["POST"])
@token_required
def generate_report():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Request body is required"}), 400

    missing = [f for f in REQUIRED_FIELDS if f not in data]
    if missing:
        return jsonify({"error": f"Missing required fields: {', '.join(missing)}"}), 400

    nested_missing = (
        [f for f in REQUIRED_PREDICTION_FIELDS  if f not in data.get("prediction",  {})] +
        [f for f in REQUIRED_MAINTENANCE_FIELDS if f not in data.get("maintenance", {})] +
        [f for f in REQUIRED_ANALYSIS_FIELDS    if f not in data.get("analysis",    {})]
    )
    if nested_missing:
        return jsonify({"error": f"Missing nested fields: {', '.join(nested_missing)}"}), 400

    try:
        buffer  = BytesIO()
        doc     = SimpleDocTemplate(buffer, pagesize=A4,
                    rightMargin=0.75*inch, leftMargin=0.75*inch,
                    topMargin=0.75*inch,   bottomMargin=0.75*inch)
        elements = []
        styles   = getSampleStyleSheet()
        now_str  = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

        # ── Styles ────────────────────────────────────────────────────────
        title_sty   = ParagraphStyle("T",  parent=styles["Title"],   textColor=colors.HexColor("#1E3A5F"), fontSize=20, spaceAfter=2)
        sub_sty     = ParagraphStyle("S",  parent=styles["Normal"],  textColor=colors.HexColor("#6B7280"), fontSize=9, spaceAfter=14)
        heading_sty = ParagraphStyle("H",  parent=styles["Heading2"],textColor=colors.HexColor("#1E3A5F"), fontSize=11, spaceBefore=16, spaceAfter=6)
        normal_sty  = ParagraphStyle("N",  parent=styles["Normal"],  fontSize=9, leading=15)
        footer_sty  = ParagraphStyle("F",  parent=styles["Normal"],  fontSize=7, textColor=colors.HexColor("#9CA3AF"), alignment=1)

        failure_type = data["prediction"]["failure_type"]
        confidence   = float(data["prediction"]["confidence"])
        rul          = data["rul"]
        priority     = data["maintenance"]["priority"]
        has_failure  = failure_type != "No Failure"
        p_color      = priority_color(priority)
        r_color      = rul_color(rul)

        # ── Title ─────────────────────────────────────────────────────────
        elements.append(Paragraph("CNC Predictive Maintenance Report", title_sty))
        elements.append(Paragraph(f"Generated: {now_str}", sub_sty))
        elements.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#1E3A5F")))
        elements.append(Spacer(1, 0.2*inch))

        # ── Machine Overview ──────────────────────────────────────────────
        elements.append(Paragraph("Machine Overview", heading_sty))
        elements.append(make_info_table(
            [["Machine ID", safe_str(data["machine_id"])], ["Report Date", now_str]],
            [2.5*inch, 3.5*inch],
        ))
        elements.append(Spacer(1, 0.2*inch))

        # ── Status Banner ─────────────────────────────────────────────────
        p_label = {"URGENT": "URGENT — Immediate Action Required",
                   "SCHEDULE_SOON": "SCHEDULE SOON — Plan Maintenance",
                   "OK": "HEALTHY — No Action Required"}.get(priority, priority)
        bg_map  = {"URGENT": "#FEF2F2", "SCHEDULE_SOON": "#FFFBEB", "OK": "#F0FDF4"}
        bd_map  = {"URGENT": "#FECACA", "SCHEDULE_SOON": "#FDE68A", "OK": "#BBF7D0"}
        elements.append(banner_table(
            Paragraph(f'<b>Status: {p_label}</b>',
                ParagraphStyle("ST", parent=styles["Normal"], fontSize=10,
                    textColor=colors.HexColor(p_color))),
            bg_map.get(priority, "#F9FAFB"),
            bd_map.get(priority, "#E5E7EB"),
        ))
        elements.append(Spacer(1, 0.2*inch))

        # ── Failure Prediction ────────────────────────────────────────────
        elements.append(Paragraph("Failure Prediction", heading_sty))
        elements.append(make_info_table(
            [
                ["Failure Type",    safe_str(failure_type)],
                ["Confidence",      f"{confidence:.2f}%"],
                ["RUL",             Paragraph(f'<font color="{r_color}"><b>{rul}</b></font> cycles remaining', normal_sty)],
                ["Priority",        Paragraph(f'<font color="{p_color}"><b>{priority}</b></font>', normal_sty)],
                ["Maintenance",     safe_str(data["maintenance"].get("maintenance_type"))],
                ["Est. Downtime",   f"{data['maintenance'].get('estimated_downtime_hours', 0)} hour(s)"],
            ],
            [2.5*inch, 3.5*inch],
            row_bg="#FFFBEB",
        ))
        elements.append(Spacer(1, 0.2*inch))

        # ── Recommended Action ────────────────────────────────────────────
        action = data["maintenance"].get("action", "")
        if action:
            elements.append(Paragraph("Recommended Action", heading_sty))
            elements.append(banner_table(
                Paragraph(action, ParagraphStyle("AT", parent=styles["Normal"],
                    fontSize=9, leading=14, textColor=colors.HexColor("#1E3A5F"))),
                "#EFF6FF", "#BFDBFE",
            ))
            elements.append(Spacer(1, 0.2*inch))

        # ── Failure Analysis OR Health Summary ────────────────────────────
        # FIX: only show "Failure Analysis" when the ML model actually
        # detected a failure. When failure_type = "No Failure", show a
        # "Health Summary" instead — prevents the confusing contradiction
        # of "Failure Analysis: Normal operation" in the original PDF.
        if has_failure:
            elements.append(Paragraph("Failure Analysis", heading_sty))
            elements.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#E5E7EB")))
            elements.append(Spacer(1, 0.1*inch))

            severity  = data["analysis"].get("severity_note", "")
            cause     = safe_str(data["analysis"].get("possible_cause"))
            rec       = safe_str(data["analysis"].get("recommendation"))
            sev_color = {"Critical":"#DC2626","High":"#D97706","Moderate":"#2563EB","Low":"#059669"}.get(severity,"#6B7280")

            if severity:
                elements.append(Paragraph(f'Severity: <font color="{sev_color}"><b>{severity}</b></font>', normal_sty))
                elements.append(Spacer(1, 0.06*inch))
            elements.append(Paragraph(f"<b>Possible Cause:</b>  {cause}",  normal_sty))
            elements.append(Spacer(1, 0.08*inch))
            elements.append(Paragraph(f"<b>Recommendation:</b>  {rec}", normal_sty))
            elements.append(Spacer(1, 0.2*inch))

        else:
            # No failure — show context-aware health note instead
            elements.append(Paragraph("Health Summary", heading_sty))
            sensor_data = data.get("sensor_data", {})
            tool_wear   = sensor_data.get("tool_wear", "N/A")
            if rul < 50:
                note = (f"No active failure detected (confidence: {confidence:.1f}%). "
                        f"Tool wear is at <b>{tool_wear}/250</b> — "
                        f'RUL is <font color="{r_color}"><b>{rul} cycles</b></font>. '
                        "Follow the recommended maintenance action above to prevent future failure.")
            else:
                note = (f"No active failure detected (confidence: {confidence:.1f}%). "
                        f"Machine is operating within normal parameters. "
                        f'RUL: <font color="{r_color}"><b>{rul} cycles</b></font>. '
                        "Continue routine monitoring.")
            elements.append(banner_table(
                Paragraph(note, ParagraphStyle("NT", parent=styles["Normal"], fontSize=9, leading=14)),
                "#F0FDF4", "#BBF7D0",
            ))
            elements.append(Spacer(1, 0.2*inch))

        # ── Sensor Snapshot ───────────────────────────────────────────────
        sensor_data = data.get("sensor_data")
        if sensor_data and isinstance(sensor_data, dict):
            elements.append(Paragraph("Sensor Snapshot", heading_sty))
            sensor_rows = []
            for k, v in sensor_data.items():
                label = SENSOR_LABELS.get(k, k.replace("_", " ").title())
                if k == "tool_wear" and isinstance(v, (int, float)) and v >= 230:
                    val = Paragraph(f'<font color="#DC2626"><b>{v}</b></font>',
                        ParagraphStyle("SR", parent=styles["Normal"], fontSize=9))
                else:
                    val = safe_str(v)
                sensor_rows.append([label, val])
            elements.append(make_info_table(sensor_rows, [2.5*inch, 3.5*inch], row_bg="#F8FFFA"))
            elements.append(Spacer(1, 0.3*inch))

        # ── Footer ────────────────────────────────────────────────────────
        elements.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#E5E7EB")))
        elements.append(Spacer(1, 0.1*inch))
        elements.append(Paragraph(
            "This report is generated automatically by the CNC Predictive Maintenance System. "
            "For internal use only.",
            footer_sty,
        ))

        doc.build(elements)
        buffer.seek(0)

        machine_id = safe_str(data["machine_id"], "machine")
        timestamp  = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")

        return send_file(buffer, as_attachment=True,
            download_name=f"report_{machine_id}_{timestamp}.pdf",
            mimetype="application/pdf")

    except Exception as e:
        try: buffer.close()
        except Exception: pass
        return jsonify({"error": "Report generation failed", "detail": str(e)}), 500