# E-mails do sistema em português

O site passou a definir `auth.languageCode = "pt-BR"` (`js/firebase-config.js`), enviar **e-mail de confirmação** ao criar conta e oferecer **"Esqueci minha senha"** no login. O texto dos modelos é ajustado no **Console do Firebase** (não fica no código):

**Authentication › Modelos (Templates)** — para cada modelo, clique no lápis e:
1. Defina o idioma como **Português (Brasil)**.
2. Edite o nome do remetente (ex.: *Ponte Solidária*) e o assunto.
3. Cole os textos abaixo.

| Modelo | Assunto | Mensagem |
|---|---|---|
| Confirmação de endereço de e-mail | Confirme seu e-mail na Ponte Solidária | Olá, %DISPLAY_NAME%! Bem-vindo(a) à Ponte Solidária. Clique no link para confirmar seu e-mail e começar a doar ou pedir ajuda: %LINK% Se você não criou esta conta, ignore esta mensagem. Equipe Ponte Solidária |
| Redefinição de senha | Redefina sua senha na Ponte Solidária | Olá, %DISPLAY_NAME%! Recebemos um pedido para criar uma nova senha. Clique no link: %LINK% Se não foi você, ignore este e-mail — sua senha continua a mesma. Equipe Ponte Solidária |
| Alteração de e-mail | Seu e-mail na Ponte Solidária foi alterado | Olá, %DISPLAY_NAME%! O e-mail da sua conta foi alterado para %NEW_EMAIL%. Se não foi você, redefina sua senha imediatamente: %LINK% |

**Dicas para o e-mail chegar (o professor relatou que não chegou):**
- Confira a pasta de spam; o remetente padrão (`noreply@...firebaseapp.com`) é frequentemente filtrado.
- Em **Authentication › Configurações › Domínios autorizados**, inclua o domínio do site.
- Para produção, configure um **remetente com domínio próprio** (SMTP personalizado/DNS do domínio) em Modelos › "Personalizar domínio".
- Reenvio: no Perfil, o botão "Reenviar confirmação" aparece enquanto o e-mail não estiver confirmado.
