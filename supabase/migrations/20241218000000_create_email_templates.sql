CREATE TABLE IF NOT EXISTS public.email_templates_dispara_lead_saas (
    type text PRIMARY KEY CHECK (type IN ('invite', 'recovery')),
    subject text NOT NULL,
    html_content text NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.email_templates_dispara_lead_saas ENABLE ROW LEVEL SECURITY;

-- Allow Super Admins to manage templates
CREATE POLICY "Super Admins can manage templates"
ON public.email_templates_dispara_lead_saas
FOR ALL
USING (public.is_super_admin());

-- Seed Data (Invite and Recovery)
INSERT INTO public.email_templates_dispara_lead_saas (type, subject, html_content)
VALUES
('invite', 'Você foi convidado para o DisparaLead', '<!DOCTYPE html>
<html>
<head>
<style>
  body { font-family: sans-serif; background-color: #f9f9f9; padding: 20px; }
  .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
  .btn { display: inline-block; padding: 12px 24px; background-color: #000; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; }
</style>
</head>
<body>
  <div class="container">
    <h2>Olá, {{name}}!</h2>
    <p>Você foi convidado para fazer parte da equipe no DisparaLead.</p>
    <p>Clique no botão abaixo para aceitar o convite e acessar sua conta:</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{action_url}}" class="btn">Aceitar Convite</a>
    </div>
    <p style="font-size: 12px; color: #666;">Se você não esperava este convite, pode ignorar este email.</p>
  </div>
</body>
</html>'),

('recovery', 'Recuperação de Senha - DisparaLead', '<!DOCTYPE html>
<html>
<head>
<style>
  body { font-family: sans-serif; background-color: #f9f9f9; padding: 20px; }
  .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
  .btn { display: inline-block; padding: 12px 24px; background-color: #000; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; }
</style>
</head>
<body>
  <div class="container">
    <h2>Recuperação de Senha</h2>
    <p>Recebemos uma solicitação para redefinir a senha da sua conta no DisparaLead.</p>
    <p>Clique no botão abaixo para criar uma nova senha:</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{action_url}}" class="btn">Redefinir Senha</a>
    </div>
    <p style="font-size: 12px; color: #666;">Este link expira em breve. Se não foi você, ignore este email.</p>
  </div>
</body>
</html>')
ON CONFLICT (type) DO UPDATE SET
  subject = EXCLUDED.subject,
  html_content = EXCLUDED.html_content;
