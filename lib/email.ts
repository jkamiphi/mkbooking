type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export async function sendEmail(input: SendEmailInput) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.AUTH_EMAIL_FROM;

  if (apiKey && from) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: input.to,
        subject: input.subject,
        text: input.text,
        html: input.html,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("Failed to send auth email via Resend", {
        status: response.status,
        body: errorBody,
      });
    }

    return;
  }

  console.info("[auth-email:fallback] Missing RESEND_API_KEY or AUTH_EMAIL_FROM.");
  console.info("[auth-email:fallback] To:", input.to);
  console.info("[auth-email:fallback] Subject:", input.subject);
  console.info("[auth-email:fallback] Body:", input.text);
}
