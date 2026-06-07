export interface GroupInviteTemplateParams {
  /** Absolute URL matching frontend `/group-invite` query shape. */
  inviteUrl: string;
  /** Care circle display name, if known. */
  groupName: string | null;
}

/** CareCircle theme (aligned with `frontend/src/index.css` :root tokens). */
const THEME = {
  primary: '#4A6FA5',
  primaryDark: '#2F4F73',
  primaryLight: '#EDF3FA',
  bgPage: '#F7F8FA',
  card: '#FFFFFF',
  accentSoft: '#E8EEF5',
  accentWarm: '#F3EAE6',
  border: '#DDE3EC',
  textPrimary: '#1A2332',
  textSecondary: '#5A6880',
  textHint: '#96A3B5',
} as const;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const FONT_UI =
  "'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const FONT_DISPLAY = "Georgia,'Lora','Times New Roman',serif";

/** HTML + plain text bodies for the group member invite (CC-150). */
export function buildGroupInviteEmailBodies(
  params: GroupInviteTemplateParams,
): {
  subject: string;
  html: string;
  text: string;
} {
  const circle = params.groupName?.trim() || 'a care circle';
  const safeCircle = escapeHtml(circle);
  const safeUrl = escapeHtml(params.inviteUrl);

  const subject = `You’re invited to join ${circle === 'a care circle' ? 'CareCircle' : circle} on CareCircle`;

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width,initial-scale=1"/>
    <meta name="color-scheme" content="light"/>
    <meta name="supported-color-schemes" content="light"/>
    <title>CareCircle invitation</title>
  </head>
  <body style="margin:0;padding:0;background-color:${THEME.bgPage};-webkit-text-size-adjust:100%;">
    <!--[if mso]>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td style="background-color:${THEME.bgPage};">
    <![endif]-->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:${THEME.bgPage};">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;">
            <!-- Brand header -->
            <tr>
              <td style="padding:0 0 20px 0;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:linear-gradient(135deg,${THEME.primary} 0%,${THEME.primaryDark} 100%);background-color:${THEME.primary};border-radius:16px 16px 0 0;">
                  <tr>
                    <td style="padding:28px 28px 24px 28px;">
                      <p style="margin:0;font-family:${FONT_DISPLAY};font-size:22px;font-weight:600;letter-spacing:-0.02em;color:#ffffff;line-height:1.2;">
                        CareCircle
                      </p>
                      <p style="margin:8px 0 0 0;font-family:${FONT_UI};font-size:14px;font-weight:600;color:rgba(255,255,255,0.88);line-height:1.4;">
                        You’ve been invited to coordinate care together.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <!-- Card body -->
            <tr>
              <td style="background-color:${THEME.card};border:1px solid ${THEME.border};border-top:none;border-radius:0 0 16px 16px;padding:0;box-shadow:0 4px 24px rgba(26,35,50,0.06);">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td style="padding:28px 28px 8px 28px;">
                      <p style="margin:0 0 12px 0;font-family:${FONT_UI};font-size:15px;color:${THEME.textSecondary};line-height:1.5;">
                        Hello,
                      </p>
                      <p style="margin:0 0 20px 0;font-family:${FONT_UI};font-size:17px;font-weight:600;color:${THEME.textPrimary};line-height:1.45;">
                        Join <span style="color:${THEME.primary};">${safeCircle}</span> on CareCircle.
                      </p>
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 24px 0;">
                        <tr>
                          <td style="background-color:${THEME.primaryLight};border:1px solid ${THEME.border};border-radius:12px;padding:14px 18px;">
                            <p style="margin:0;font-family:${FONT_UI};font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:${THEME.primaryDark};line-height:1.3;">
                              Care circle
                            </p>
                            <p style="margin:6px 0 0 0;font-family:${FONT_UI};font-size:16px;font-weight:600;color:${THEME.textPrimary};line-height:1.4;">
                              ${safeCircle}
                            </p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <!-- CTA button -->
                  <tr>
                    <td align="center" style="padding:4px 28px 8px 28px;">
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                        <tr>
                          <td align="center" style="border-radius:12px;background-color:${THEME.primary};">
                            <a href="${safeUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:15px 36px;font-family:${FONT_UI};font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:12px;line-height:1.2;">
                              Accept invitation
                            </a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <!-- Secondary hint -->
                  <tr>
                    <td style="padding:8px 28px 24px 28px;">
                      <p style="margin:0;font-family:${FONT_UI};font-size:13px;color:${THEME.textSecondary};line-height:1.55;">
                        Prefer copying the link? Paste this into your browser:
                      </p>
                      <p style="margin:10px 0 0 0;padding:12px 14px;background-color:${THEME.accentSoft};border:1px solid ${THEME.border};border-radius:10px;font-family:Consolas,Monaco,'Courier New',monospace;font-size:12px;word-break:break-all;color:${THEME.primaryDark};line-height:1.5;">
                        ${safeUrl}
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:0 28px 28px 28px;border-top:1px solid ${THEME.border};">
                      <p style="margin:20px 0 0 0;font-family:${FONT_UI};font-size:12px;color:${THEME.textHint};line-height:1.5;">
                        This message was sent because someone invited this email address to a care circle. If you didn’t expect it, you can ignore this email.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 8px 0 8px;text-align:center;">
                <p style="margin:0;font-family:${FONT_UI};font-size:11px;color:${THEME.textHint};line-height:1.5;">
                  © CareCircle · Coordinated family care
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    <!--[if mso]></td></tr></table><![endif]-->
  </body>
</html>`;

  const text = [
    "You've been invited to join a care circle on CareCircle.",
    `Circle: ${params.groupName?.trim() || 'Care circle'}`,
    '',
    `Open this link to continue: ${params.inviteUrl}`,
    '',
    'If you did not expect this message, you can ignore it.',
  ].join('\n');

  return { subject, html, text };
}
