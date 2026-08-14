import io
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

def generate_booking_pdf(booking) -> io.BytesIO:
    buffer = io.BytesIO()
    
    # Create document with 0.5-inch margins for professional spacing
    doc = SimpleDocTemplate(
        buffer, 
        pagesize=letter, 
        rightMargin=36, 
        leftMargin=36, 
        topMargin=36, 
        bottomMargin=36
    )
    story = []
    
    # Setup styles
    styles = getSampleStyleSheet()
    
    # Custom styling
    title_style = ParagraphStyle(
        'HeaderTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=22,
        leading=26,
        textColor=colors.HexColor('#000000'),
        alignment=1, # Centered
        spaceAfter=4
    )
    
    subtitle_style = ParagraphStyle(
        'HeaderSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor('#374151'),
        alignment=1, # Centered
        spaceAfter=15
    )
    
    section_heading = ParagraphStyle(
        'SectionHeading',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=15,
        textColor=colors.HexColor('#ffffff'),
        spaceBefore=12,
        spaceAfter=6
    )
    
    normal_text = ParagraphStyle(
        'NormalText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor('#1f2937')
    )
    
    bold_text = ParagraphStyle(
        'BoldText',
        parent=normal_text,
        fontName='Helvetica-Bold',
        textColor=colors.HexColor('#111827')
    )
    
    # Main Title Header
    story.append(Paragraph("AMIGOS MENS LUXURY PG", title_style))
    story.append(Paragraph("ROOM BOOKING APPLICATION", subtitle_style))
    story.append(Spacer(1, 10))
    
    # Helper to generate section banners (solid grey background)
    def create_section_header(title):
        header_table = Table([[Paragraph(title, section_heading)]], colWidths=[540])
        header_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#1f2937')),
            ('TOPPADDING', (0,0), (-1,-1), 4),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
            ('LEFTPADDING', (0,0), (-1,-1), 8),
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ]))
        return header_table

    # Fetch entities
    user = booking.user
    room = booking.room
    
    # Check uploaded documents
    has_aadhaar = "No"
    has_photo = "No"
    for doc_ref in booking.documents:
        if doc_ref.document_type == "aadhaar_id":
            has_aadhaar = "Yes"
        elif doc_ref.document_type == "user_photo":
            has_photo = "Yes"

    # --- Applicant Details Section ---
    story.append(create_section_header("APPLICANT DETAILS"))
    applicant_data = [
        [
            Paragraph("First Name", bold_text), Paragraph(user.first_name, normal_text),
            Paragraph("Last Name", bold_text), Paragraph(user.last_name, normal_text)
        ],
        [
            Paragraph("Email Address", bold_text), Paragraph(user.email, normal_text),
            Paragraph("Phone Number", bold_text), Paragraph(user.phone, normal_text)
        ],
        [
            Paragraph("State", bold_text), Paragraph(user.state, normal_text),
            Paragraph("City", bold_text), Paragraph(user.city, normal_text)
        ]
    ]
    app_table = Table(applicant_data, colWidths=[120, 150, 120, 150])
    app_table.setStyle(TableStyle([
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e5e7eb')),
        ('BACKGROUND', (0,0), (0,-1), colors.HexColor('#f9fafb')),
        ('BACKGROUND', (2,0), (2,-1), colors.HexColor('#f9fafb')),
        ('PADDING', (0,0), (-1,-1), 6),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(app_table)
    story.append(Spacer(1, 10))

    # --- Room Details Section ---
    story.append(create_section_header("ROOM DETAILS"))
    duration_str = booking.duration
    days_count = str(booking.custom_days) if booking.duration == "Custom" else "N/A"
    
    room_data = [
        [
            Paragraph("Floor Assigned", bold_text), Paragraph(f"{room.floor} Floor", normal_text),
            Paragraph("Room Number", bold_text), Paragraph(f"Room {room.room_number}", normal_text)
        ],
        [
            Paragraph("Sharing Type", bold_text), Paragraph(room.sharing_type, normal_text),
            Paragraph("Monthly Rent Price", bold_text), Paragraph(f"INR {room.monthly_price:,.2f}", normal_text)
        ],
        [
            Paragraph("Security Deposit Due", bold_text), Paragraph(f"INR {room.security_deposit:,.2f}", normal_text),
            Paragraph("Booking Start Date", bold_text), Paragraph(booking.booking_start_date.strftime("%Y-%m-%d"), normal_text)
        ],
        [
            Paragraph("Booking Duration", bold_text), Paragraph(duration_str, normal_text),
            Paragraph("Number of Days", bold_text), Paragraph(days_count, normal_text)
        ],
        [
            Paragraph("Luggage Bags Count", bold_text), Paragraph(str(booking.luggage_bags_count), normal_text),
            Paragraph("", bold_text), Paragraph("", normal_text) # Empty padding cells
        ]
    ]
    room_table = Table(room_data, colWidths=[120, 150, 120, 150])
    room_table.setStyle(TableStyle([
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e5e7eb')),
        ('BACKGROUND', (0,0), (0,-1), colors.HexColor('#f9fafb')),
        ('BACKGROUND', (2,0), (2,-1), colors.HexColor('#f9fafb')),
        ('PADDING', (0,0), (-1,-1), 6),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(room_table)
    story.append(Spacer(1, 10))

    # --- Application Details & Verification Section ---
    story.append(create_section_header("APPLICATION & DOCUMENTS VERIFICATION"))
    
    app_details = [
        [
            Paragraph("Application Status", bold_text), Paragraph(booking.status, bold_text),
            Paragraph("Submitted Date", bold_text), Paragraph(booking.created_at.strftime("%Y-%m-%d %H:%M:%S"), normal_text)
        ],
        [
            Paragraph("Terms Accepted", bold_text), Paragraph("Yes" if booking.terms_accepted else "No", normal_text),
            Paragraph("", bold_text), Paragraph("", normal_text)
        ],
        [
            Paragraph("ID Proof Uploaded", bold_text), Paragraph(has_aadhaar, normal_text),
            Paragraph("Profile Photo Uploaded", bold_text), Paragraph(has_photo, normal_text)
        ]
    ]
    details_table = Table(app_details, colWidths=[120, 150, 120, 150])
    details_table.setStyle(TableStyle([
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e5e7eb')),
        ('BACKGROUND', (0,0), (0,-1), colors.HexColor('#f9fafb')),
        ('BACKGROUND', (2,0), (2,-1), colors.HexColor('#f9fafb')),
        ('PADDING', (0,0), (-1,-1), 6),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(details_table)
    story.append(Spacer(1, 20))

    # --- Signatures Section ---
    sig_data = [
        [Paragraph("Applicant Signature", normal_text), Paragraph("Authorized PG Manager Signature", normal_text)],
        ["", ""], # Spacer for signature
        ["_________________________", "_________________________"]
    ]
    sig_table = Table(sig_data, colWidths=[270, 270])
    sig_table.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('BOTTOMPADDING', (0,1), (-1,1), 30),
        ('TOPPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(sig_table)
    
    # Build Document
    doc.build(story)
    
    buffer.seek(0)
    return buffer
