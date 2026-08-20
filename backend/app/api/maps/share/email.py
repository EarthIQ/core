"""Async email sender for map/project share invitations.

Uses aiosmtplib with an inline Jinja2 HTML template.
Gracefully no-ops when SMTP is not configured (SMTP_HOST is empty).
"""
from __future__ import annotations

import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional

logger = logging.getLogger(__name__)

# ── HTML template (inline Jinja2) ─────────────────────────────────────────────

_INVITE_TEMPLATE = """\
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
           background: #0d1117; color: #e6edf3; margin: 0; padding: 0; }
    .container { max-width: 560px; margin: 40px auto; background: #161b22;
                 border-radius: 12px; border: 1px solid #30363d; overflow: hidden; }
    .header { background: linear-gradient(135deg, #1a3a2a 0%, #0d2318 100%);
              padding: 32px 36px; text-align: center; }
    .header h1 { margin: 0; font-size: 22px; font-weight: 700; color: #3fb950; }
    .header p  { margin: 6px 0 0; font-size: 13px; color: #8b949e; }
    .body      { padding: 32px 36px; }
    .body p    { margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #c9d1d9; }
    .role-badge { display: inline-block; background: #1f3a2a; color: #3fb950;
                  border: 1px solid #238636; border-radius: 20px;
                  padding: 2px 12px; font-size: 12px; font-weight: 600; }
    .message-box { background: #0d1117; border-left: 3px solid #3fb950;
                   border-radius: 4px; padding: 12px 16px; margin: 16px 0;
                   font-size: 13px; color: #8b949e; font-style: italic; }
    .btn { display: inline-block; background: #238636; color: #ffffff !important;
           text-decoration: none; padding: 12px 28px; border-radius: 8px;
           font-size: 14px; font-weight: 600; margin: 8px 0; }
    .footer { padding: 20px 36px; text-align: center; font-size: 11px; color: #6e7681; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🌍 EarthIQ</h1>
      <p>{{ entity_label|capitalize }} Collaboration Invitation</p>
    </div>
    <div class="body">
      <p>Hi there,</p>
      <p>
        <strong>{{ inviter_name }}</strong> has invited you to collaborate on the
        {{ entity_label }} <strong>"{{ entity_title }}"</strong> with
        <span class="role-badge">{{ role }}</span> access.
      </p>
      {% if message %}
      <div class="message-box">{{ message }}</div>
      {% endif %}
      <p>Click the button below to accept your invitation and open the {{ entity_label }}:</p>
      <p style="text-align:center">
        <a class="btn" href="{{ accept_url }}">Accept Invitation</a>
      </p>
      <p style="font-size:12px; color:#6e7681;">
        If you didn't expect this invitation, you can safely ignore this email.
        The link expires in 7 days.
      </p>
    </div>
    <div class="footer">
      EarthIQ · Geospatial Intelligence Platform<br />
      <a href="{{ frontend_url }}" style="color:#3fb950; text-decoration:none;">{{ frontend_url }}</a>
    </div>
  </div>
</body>
</html>
"""


# ── Access-request template (sent to the owner) ────────────────────────────────

_REQUEST_TEMPLATE = """\
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
           background: #0d1117; color: #e6edf3; margin: 0; padding: 0; }
    .container { max-width: 560px; margin: 40px auto; background: #161b22;
                 border-radius: 12px; border: 1px solid #30363d; overflow: hidden; }
    .header { background: linear-gradient(135deg, #1a3a2a 0%, #0d2318 100%);
              padding: 32px 36px; text-align: center; }
    .header h1 { margin: 0; font-size: 22px; font-weight: 700; color: #3fb950; }
    .header p  { margin: 6px 0 0; font-size: 13px; color: #8b949e; }
    .body      { padding: 32px 36px; }
    .body p    { margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #c9d1d9; }
    .role-badge { display: inline-block; background: #1f3a2a; color: #3fb950;
                  border: 1px solid #238636; border-radius: 20px;
                  padding: 2px 12px; font-size: 12px; font-weight: 600; }
    .message-box { background: #0d1117; border-left: 3px solid #3fb950;
                   border-radius: 4px; padding: 12px 16px; margin: 16px 0;
                   font-size: 13px; color: #8b949e; font-style: italic; }
    .btn { display: inline-block; background: #238636; color: #ffffff !important;
           text-decoration: none; padding: 12px 28px; border-radius: 8px;
           font-size: 14px; font-weight: 600; margin: 8px 0; }
    .footer { padding: 20px 36px; text-align: center; font-size: 11px; color: #6e7681; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🌍 EarthIQ</h1>
      <p>Access Request</p>
    </div>
    <div class="body">
      <p>Hi there,</p>
      <p>
        <strong>{{ requester_name }}</strong> is requesting
        <span class="role-badge">{{ requested_role }}</span> access to your
        {{ entity_label }} <strong>"{{ entity_title }}"</strong>.
      </p>
      {% if message %}
      <p><strong>They wrote:</strong></p>
      <div class="message-box">{{ message }}</div>
      {% endif %}
      <p>Click the button below to review the request and decide whether to grant access:</p>
      <p style="text-align:center">
        <a class="btn" href="{{ approve_url }}">Review Request</a>
      </p>
      <p style="font-size:12px; color:#6e7681;">
        If you didn't expect this request, you can safely ignore this email.
      </p>
    </div>
    <div class="footer">
      EarthIQ · Geospatial Intelligence Platform<br />
      <a href="{{ frontend_url }}" style="color:#3fb950; text-decoration:none;">{{ frontend_url }}</a>
    </div>
  </div>
</body>
</html>
"""


# ── Access-granted template (sent back to the requester) ──────────────────────

_GRANTED_TEMPLATE = """\
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
           background: #0d1117; color: #e6edf3; margin: 0; padding: 0; }
    .container { max-width: 560px; margin: 40px auto; background: #161b22;
                 border-radius: 12px; border: 1px solid #30363d; overflow: hidden; }
    .header { background: linear-gradient(135deg, #1a3a2a 0%, #0d2318 100%);
              padding: 32px 36px; text-align: center; }
    .header h1 { margin: 0; font-size: 22px; font-weight: 700; color: #3fb950; }
    .header p  { margin: 6px 0 0; font-size: 13px; color: #8b949e; }
    .body      { padding: 32px 36px; }
    .body p    { margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #c9d1d9; }
    .role-badge { display: inline-block; background: #1f3a2a; color: #3fb950;
                  border: 1px solid #238636; border-radius: 20px;
                  padding: 2px 12px; font-size: 12px; font-weight: 600; }
    .btn { display: inline-block; background: #238636; color: #ffffff !important;
           text-decoration: none; padding: 12px 28px; border-radius: 8px;
           font-size: 14px; font-weight: 600; margin: 8px 0; }
    .footer { padding: 20px 36px; text-align: center; font-size: 11px; color: #6e7681; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🌍 EarthIQ</h1>
      <p>Access Granted</p>
    </div>
    <div class="body">
      <p>Good news!</p>
      <p>
        <strong>{{ grantor_name }}</strong> approved your request — you now have
        <span class="role-badge">{{ role }}</span> access to the
        {{ entity_label }} <strong>"{{ entity_title }}"</strong>.
      </p>
      <p style="text-align:center">
        <a class="btn" href="{{ open_url }}">Open {{ entity_label|capitalize }}</a>
      </p>
    </div>
    <div class="footer">
      EarthIQ · Geospatial Intelligence Platform<br />
      <a href="{{ frontend_url }}" style="color:#3fb950; text-decoration:none;">{{ frontend_url }}</a>
    </div>
  </div>
</body>
</html>
"""


async def _render_and_send(*, to: str, subject: str, html: str) -> None:
    """Shared SMTP send helper (no-ops when SMTP is not configured)."""
    from app.core.config import get_settings

    settings = get_settings()
    if not settings.smtp_host:
        logger.info("SMTP not configured — skipping email to %s (%s)", to, subject)
        return

    import aiosmtplib

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = settings.smtp_from
    msg["To"] = to
    msg.attach(MIMEText(html, "html"))

    await aiosmtplib.send(
        msg,
        hostname=settings.smtp_host,
        port=settings.smtp_port,
        username=settings.smtp_user or None,
        password=settings.smtp_password or None,
        use_tls=False,
        start_tls=settings.smtp_tls,
    )
    logger.info("Email sent to %s (%s)", to, subject)


async def send_request_access_email(
    *,
    to: str,
    requester_name: str,
    entity_title: str,
    requested_role: str,
    message: str,
    approve_url: str,
    frontend_url: str,
    entity_label: str = "map",
) -> None:
    """Notify the entity owner that a user is requesting access. Best-effort."""
    try:
        from jinja2 import Template

        html = Template(_REQUEST_TEMPLATE).render(
            requester_name=requester_name,
            entity_title=entity_title,
            entity_label=entity_label,
            requested_role=requested_role.capitalize(),
            message=message,
            approve_url=approve_url,
            frontend_url=frontend_url,
        )
        await _render_and_send(
            to=to,
            subject=f'{requester_name} is requesting access to "{entity_title}" on EarthIQ',
            html=html,
        )
    except Exception as exc:  # noqa: BLE001
        logger.error("Failed to send access-request email to %s: %s", to, exc)


async def send_access_granted_email(
    *,
    to: str,
    grantor_name: str,
    entity_title: str,
    role: str,
    open_url: str,
    frontend_url: str,
    entity_label: str = "map",
) -> None:
    """Notify the requester that their access request was approved. Best-effort."""
    try:
        from jinja2 import Template

        html = Template(_GRANTED_TEMPLATE).render(
            grantor_name=grantor_name,
            entity_title=entity_title,
            entity_label=entity_label,
            role=role.capitalize(),
            open_url=open_url,
            frontend_url=frontend_url,
        )
        await _render_and_send(
            to=to,
            subject=f'You now have access to "{entity_title}" on EarthIQ',
            html=html,
        )
    except Exception as exc:  # noqa: BLE001
        logger.error("Failed to send access-granted email to %s: %s", to, exc)


async def send_invite_email(
    *,
    to: str,
    inviter_name: str,
    entity_title: str,
    role: str,
    message: str,
    accept_url: str,
    frontend_url: str,
    entity_label: str = "map",
) -> None:
    """Send a map/project invitation email. No-ops if SMTP is not configured."""
    from app.core.config import get_settings

    settings = get_settings()
    if not settings.smtp_host:
        logger.info(
            "SMTP not configured — skipping invite email to %s for %s '%s'",
            to,
            entity_label,
            entity_title,
        )
        return

    try:
        import aiosmtplib
        from jinja2 import Template

        html = Template(_INVITE_TEMPLATE).render(
            inviter_name=inviter_name,
            entity_title=entity_title,
            entity_label=entity_label,
            role=role.capitalize(),
            message=message,
            accept_url=accept_url,
            frontend_url=frontend_url,
        )

        msg = MIMEMultipart("alternative")
        msg["Subject"] = f'{inviter_name} invited you to "{entity_title}" on EarthIQ'
        msg["From"] = settings.smtp_from
        msg["To"] = to
        msg.attach(MIMEText(html, "html"))

        await aiosmtplib.send(
            msg,
            hostname=settings.smtp_host,
            port=settings.smtp_port,
            username=settings.smtp_user or None,
            password=settings.smtp_password or None,
            use_tls=False,
            start_tls=settings.smtp_tls,
        )
        logger.info("Invite email sent to %s", to)

    except Exception as exc:  # noqa: BLE001
        # Email is best-effort — don't fail the invite API call
        logger.error("Failed to send invite email to %s: %s", to, exc)
