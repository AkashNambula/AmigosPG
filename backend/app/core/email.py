import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587
SENDER_EMAIL = "prasadpolavarapu57@gmail.com"
SENDER_PASSWORD = "vozx nmvk hfgp ywmb"

def send_reset_code_email(to_email: str, code: str, user_name: str):
    subject = "Password Reset Code - Amigos PG"
    body = f"""
    <html>
      <head>
        <style>
          body {{ font-family: Arial, sans-serif; background-color: #f9fafb; padding: 20px; }}
          .container {{ max-width: 500px; margin: 0 auto; background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); border-top: 4px solid #4f46e5; }}
          .header {{ text-align: center; margin-bottom: 24px; }}
          .header h1 {{ margin: 0; color: #111827; font-size: 24px; }}
          .content {{ color: #374151; font-size: 16px; line-height: 1.5; }}
          .code-box {{ text-align: center; margin: 30px 0; }}
          .code {{ font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #4f46e5; background-color: #e0e7ff; padding: 15px 20px; border-radius: 6px; display: inline-block; }}
          .footer {{ margin-top: 30px; font-size: 13px; color: #6b7280; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 15px; }}
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Amigos PG</h1>
          </div>
          <div class="content">
            <p>Hello {user_name},</p>
            <p>We received a request to reset the password for your Amigos PG account. Your password reset code is:</p>
            <div class="code-box">
              <span class="code">{code}</span>
            </div>
            <p>This code will expire in <strong>15 minutes</strong>.</p>
            <p>If you did not request a password reset, please ignore this email or contact support if you have concerns.</p>
          </div>
          <div class="footer">
            &copy; 2026 Amigos Mens Luxury PG. All rights reserved.
          </div>
        </div>
      </body>
    </html>
    """
    
    msg = MIMEMultipart()
    msg['From'] = f"Amigos PG <{SENDER_EMAIL}>"
    msg['To'] = to_email
    msg['Subject'] = subject
    msg.attach(MIMEText(body, 'html'))
    
    try:
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SENDER_EMAIL, SENDER_PASSWORD)
        server.send_message(msg)
        server.quit()
        print(f"Password reset email sent to {to_email}")
        return True
    except Exception as e:
        print(f"Failed to send email to {to_email}: {e}")
        return False
