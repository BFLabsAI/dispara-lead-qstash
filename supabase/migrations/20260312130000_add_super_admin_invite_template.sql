ALTER TABLE public.email_templates_dispara_lead_saas
DROP CONSTRAINT IF EXISTS email_templates_dispara_lead_saas_type_check;

ALTER TABLE public.email_templates_dispara_lead_saas
ADD CONSTRAINT email_templates_dispara_lead_saas_type_check
CHECK (type IN ('invite', 'recovery', 'super_admin_invite'));

INSERT INTO public.email_templates_dispara_lead_saas (type, subject, html_content)
VALUES (
  'super_admin_invite',
  'Você foi convidado para administrar o DisparaLead',
  '<!DOCTYPE html>
<html>
<head>
<style>
  body { font-family: sans-serif; background-color: #f9f9f9; padding: 20px; }
  .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
  .btn { display: inline-block; padding: 12px 24px; background-color: #111827; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; }
</style>
</head>
<body>
  <div class="container">
    <h2>Olá, {{name}}!</h2>
    <p>Você foi convidado para acessar o Manager Portal do DisparaLead como super admin.</p>
    <p>Esse acesso é global e não fica vinculado a um tenant específico.</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{action_url}}" class="btn">Criar Conta de Super Admin</a>
    </div>
    <p style="font-size: 12px; color: #666;">Conta vinculada ao email {{email}}.</p>
  </div>
</body>
</html>'
)
ON CONFLICT (type) DO UPDATE SET
  subject = EXCLUDED.subject,
  html_content = EXCLUDED.html_content,
  updated_at = now();
