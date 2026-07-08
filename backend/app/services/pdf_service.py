import os
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

def generate_pdf_report(
    pdf_path: str,
    patient_info: dict,
    prediction_info: dict,
    original_img_path: str,
    heatmap_img_path: str,
    prescription_info: dict = None
) -> str:
    """
    Generates a highly structured, clinical-grade PDF report for a patient's glaucoma prediction.
    Features:
    - Side-by-side retina scan and Grad-CAM heatmap alignment.
    - Color-coded risk banners.
    - Precautionary details and diet guidelines.
    - Doctor prescription details if available.
    """
    # Create directory if not exists
    os.makedirs(os.path.dirname(pdf_path), exist_ok=True)

    # Setup document
    doc = SimpleDocTemplate(pdf_path, pagesize=letter,
                            rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40)
    story = []
    
    # Styles
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=22,
        textColor=colors.HexColor('#1E3A8A'), # Navy Blue
        spaceAfter=15
    )
    
    section_heading = ParagraphStyle(
        'SectionHeading',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=14,
        textColor=colors.HexColor('#0D9488'), # Teal
        spaceBefore=10,
        spaceAfter=10
    )
    
    body_style = ParagraphStyle(
        'DocBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#374151')
    )

    # 1. Header Banner
    header_data = [
        [Paragraph("GLAUCOMA EYECARE AI PLATFORM", title_style), 
         Paragraph("<b>Date:</b> {}<br/><b>Report ID:</b> REP-{}".format(
             datetime_str := prediction_info.get("created_at", "N/A"),
             prediction_info.get("id", "001")
         ), body_style)]
    ]
    header_table = Table(header_data, colWidths=[350, 180])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ('LINEBELOW', (0, 0), (-1, -1), 2, colors.HexColor('#1E3A8A'))
    ]))
    story.append(header_table)
    story.append(Spacer(1, 15))

    # 2. Patient Demographics Table
    patient_data = [
        [
            Paragraph("<b>Patient Name:</b> {}".format(patient_info.get("name")), body_style),
            Paragraph("<b>Age:</b> {}".format(patient_info.get("age")), body_style),
            Paragraph("<b>Gender:</b> {}".format(patient_info.get("gender")), body_style)
        ],
        [
            Paragraph("<b>Blood Pressure:</b> {}".format(patient_info.get("blood_pressure", "N/A")), body_style),
            Paragraph("<b>Diabetes Status:</b> {}".format(patient_info.get("diabetes", "N/A")), body_style),
            Paragraph("<b>Family History:</b> {}".format(patient_info.get("family_history", "N/A")), body_style)
        ]
    ]
    patient_table = Table(patient_data, colWidths=[175, 175, 175])
    patient_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F3F4F6')),
        ('PADDING', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E5E7EB')),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE')
    ]))
    story.append(Paragraph("Patient Information", section_heading))
    story.append(patient_table)
    story.append(Spacer(1, 15))

    # 3. AI Prediction Summary
    risk = prediction_info.get("risk_level", "Low")
    risk_color = '#10B981' # Green
    if risk == 'Moderate':
        risk_color = '#F59E0B' # Orange
    elif risk == 'High':
        risk_color = '#EF4444' # Red

    prediction_data = [
        [
            Paragraph("<b>AI Diagnosis:</b> {}".format("Glaucoma Detected" if prediction_info.get("is_glaucoma") else "No Glaucoma Detected"), body_style),
            Paragraph("<b>Probability:</b> {}%".format(prediction_info.get("probability")), body_style),
            Paragraph("<b>Confidence Score:</b> {}%".format(prediction_info.get("confidence_score")), body_style)
        ],
        [
            Paragraph("<b>Risk Classification:</b> <font color='{}'><b>{}</b></font>".format(risk_color, risk), body_style),
            Paragraph("<b>Target Nerve:</b> Optic Disc / Cup Region", body_style),
            Paragraph("<b>Diagnostic Status:</b> Screening Completed", body_style)
        ]
    ]
    prediction_table = Table(prediction_data, colWidths=[175, 175, 175])
    prediction_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#EFF6FF')), # Light blue tint
        ('PADDING', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#BFDBFE')),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE')
    ]))
    story.append(Paragraph("AI Prediction Report", section_heading))
    story.append(prediction_table)
    story.append(Spacer(1, 15))

    # 4. Images Section (Original Retina vs. Heatmap)
    # Check if images exist on disk before adding, use a dummy box if missing.
    image_table_data = []
    
    img_width, img_height = 180, 180
    
    try:
        left_img = Image(original_img_path, width=img_width, height=img_height) if os.path.exists(original_img_path) else Paragraph("Original Fundus Scan missing", body_style)
        right_img = Image(heatmap_img_path, width=img_width, height=img_height) if os.path.exists(heatmap_img_path) else Paragraph("Grad-CAM heatmap missing", body_style)
        image_table_data = [
            [left_img, right_img],
            [Paragraph("<font color='#6B7280'>1. Original Retinal Fundus Scan</font>", body_style), 
             Paragraph("<font color='#6B7280'>2. AI Grad-CAM Visual Heatmap</font>", body_style)]
        ]
    except Exception as e:
        print(f"PDF Image addition error: {e}")
        image_table_data = [[Paragraph("Failed to load imaging attachments", body_style), ""]]

    image_table = Table(image_table_data, colWidths=[260, 260])
    image_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 1), (-1, 1), 5),
    ]))
    story.append(Paragraph("Ocular Imaging Diagnostics", section_heading))
    story.append(image_table)
    story.append(Spacer(1, 15))

    # 5. Doctor Prescription Section (if available)
    if prescription_info:
        story.append(Paragraph("Clinician Prescription & Treatment Plan", section_heading))
        presc_data = [
            [Paragraph("<b>Assigned Ophthalmologist:</b> {}".format(prescription_info.get("doctor_name", "Staff Doctor")), body_style)],
            [Paragraph("<b>Prescribed Medicines:</b> {}".format(prescription_info.get("medicines")), body_style)],
            [Paragraph("<b>Dosage Schedule:</b> {}".format(prescription_info.get("dosage", "As directed")), body_style)],
            [Paragraph("<b>Additional Instructions:</b> {}".format(prescription_info.get("instructions", "None")), body_style)]
        ]
        presc_table = Table(presc_data, colWidths=[520])
        presc_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#FEF3C7')), # Light gold
            ('PADDING', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#F59E0B')),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE')
        ]))
        story.append(presc_table)
        story.append(Spacer(1, 15))

    # 6. Dietary and Lifestyle Recommendations
    story.append(Paragraph("AI Recommendations & Eye Care Tips", section_heading))
    recs = prediction_info.get("recommendations", "")
    if not recs:
        # Default standard recommendations
        recs = ("• Eat foods rich in Antioxidants: Leafy greens (spinach, kale), fish (salmon), and walnuts.\n"
                "• Limit caffeine and high-sodium intakes, which can temporarily elevate intraocular pressure.\n"
                "• Implement the 20-20-20 rule to decrease eye strain.\n"
                "• Avoid rubbing your eyes, and take prescribed eye drops consistently.\n"
                "• Schedule annual comprehensive eye exams with an ophthalmologist.")
    
    rec_paragraphs = [Paragraph(line.strip(), body_style) for line in recs.split('\n') if line.strip()]
    
    rec_table_data = [[p] for p in rec_paragraphs]
    rec_table = Table(rec_table_data, colWidths=[520])
    rec_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F0FDF4')), # Light green tint
        ('PADDING', (0, 0), (-1, -1), 5),
        ('LINELEFT', (0, 0), (-1, -1), 3, colors.HexColor('#10B981')), # Green left-border bar
    ]))
    story.append(rec_table)
    
    # Build Document
    doc.build(story)
    return pdf_path
