# Changelog

## [v1.2.0] - 2026-01-23

### 🚀 Novidades (Features)
- **Slider de Tempo:** Substituído os campos manuais de "min/max" por um slider visual (30s a 200s), com padrão de 30s-60s e trava de segurança de 20s de diferença mínima entre os valores.
- **Suporte a Vídeo:** Agora é possível selecionar "Vídeo" como tipo de mídia nas campanhas, com upload de arquivo ou URL.
- **Importação Inteligente de Públicos (Tela de Públicos):**
    - Novo assistente de importação na tela "Públicos" que permite selecionar qual coluna é o **Nome**.
    - Opção de importar o "Nome Completo" ou apenas o "Primeiro Nome".
    - **Formatação Automática (Title Case):** Nomes em MAIÚSCULAS são automaticamente convertidos para formato capitalizado (Ex: "BRUNO GUERRA" → "Bruno Guerra" ou "Bruno").
    - Pré-visualização em tempo real mostrando o nome formatado antes de confirmar a importação.
    - Modal de importação ampliado para melhor usabilidade (menos scroll).

### 🐛 Correções & Melhorias (Fixes & Improvements)
- **Correção de Variáveis (IA & Templates):**
    - Resolvido problema onde variáveis como `@name` não eram substituídas se o cabeçalho do CSV estivesse em maiúsculo (ex: "NOME"). O sistema agora é *case-insensitive*.
    - **Proteção de Dados na IA:** Ajustado o prompt da Inteligência Artificial para não remover nomes, telefones e variáveis durante a reescrita.
- **Tratamento de Erros:**
    - Números inválidos agora retornam status de sucesso para a fila (fila não trava), mas marcam erro no log do sistema, evitando disparos repetidos infinitamente.
    - Melhoria nos logs para facilitar identificação de erros futuros.
    - **Log Detalhado:** O sistema salva o retorno exato (JSON) da API em caso de falha, visível no painel ao passar o mouse sobre o status "Falha".
    - **Proteção contra "Falso Disconnected":** Se a API retornar erro de desconexão, o sistema faz uma verificação dupla. Se a instância estiver online, ele tenta novamente automaticamente (erro transiente). Se estiver realmente offline, ele para de tentar (erro fatal), economizando recursos e evitando campanhas travadas.

---

## 📱 Texto para Envio aos Clientes (WhatsApp)

Olá! 👋
Temos novidades fresquinhas na plataforma! Confira o que acabou de chegar:

✅ **Vídeo nas Campanhas:** Agora você pode enviar vídeos diretamente nas suas campanhas em massa! Mais engajamento para seus leads. 🎥

✅ **Ajuste de Tempo Visual:** Ficou mais fácil definir o atraso entre mensagens. Use o novo "slider" para arrastar e escolher o tempo (30s a 200s). ⏱️

✅ **Importação de Nomes Inteligente:** Ao criar um público, agora você pode escolher a coluna de nome e se quer o nome completo ou só o primeiro. Nomes em MAIÚSCULAS são formatados automaticamente! Ex: "BRUNO" → "Bruno". ✨

✅ **IA Mais Inteligente:** Melhoramos nossa Inteligência Artificial para garantir que ela nunca mude os nomes ou dados importantes dos seus contatos. 🤖🔒

✅ **Mais Estabilidade:** Corrigimos problemas com campanhas que mostravam "desconectado" mesmo com instância online. Agora o sistema faz dupla checagem antes de marcar como falha. 🛡️

Atualize sua página e aproveite! 🚀
Qualquer dúvida, estamos à disposição.
