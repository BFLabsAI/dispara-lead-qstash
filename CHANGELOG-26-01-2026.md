# Changelog

## [v1.3.0] - 26-01-2026

### 🚀 Novidades (Features)

- **Scroll Infinito na Lista de Contatos:** A lista de contatos agora carrega automaticamente à medida que você rola para baixo. Sem mais limite de 50 ou 100 contatos visíveis de uma vez! Pode ter milhares que ele carrega sob demanda. ✨
- **Indicador de Carregamento:** Adicionado spinner no final da lista para indicar que mais contatos estão sendo buscados.

### ⚡ Performance

- **Carregamento de Contatos 140x Mais Rápido:** A consulta que lista os contatos foi completamente reescrita como RPC (`get_contacts_for_chat_v5`), eliminando buscas lentas e permitindo paginação eficiente direto no banco de dados.

### 🐛 Correções & Melhorias (Fixes & Improvements)

- **Correção de Erro 406 (Detalhes do Contato):** Ao selecionar um contato que nunca recebeu campanha, o sistema exibia um erro. Corrigido para tratar esse cenário graciosamente.
- **Renderização de Stickers:** Stickers (figurinhas) agora são processados corretamente pelo webhook. Figurinhas antigas com links quebrados exibem um placeholder "Sticker (Não processado)" em vez de imagem quebrada.
- **Layout da Lista de Contatos:**
    - **Nomes Longos:** Nomes de contatos agora podem ocupar **até 2 linhas** antes de cortar, em vez de sempre truncar na primeira linha.
    - **Prévia de Mensagem:** O texto da última mensagem também pode ocupar até 2 linhas.
    - **Largura Aumentada:** Barra lateral ampliada para 384px, dando mais espaço para nomes, telefones e instâncias.
    - **Tooltips:** Ao passar o mouse sobre texto cortado, o conteúdo completo aparece em uma dica flutuante.

---

## 📱 Texto para Envio aos Clientes (WhatsApp)

Oi! 🎉
Atualizamos a plataforma com várias melhorias. Confira:

✅ **Lista de Contatos Infinita:** Agora você pode rolar sem parar na lista de atendimento. Nada de limite! Ele carrega mais contatos automaticamente. 📜♾️

✅ **Muito Mais Rápido:** O carregamento dos contatos ficou **140 vezes mais veloz!** Menos espera, mais produtividade. 🚀

✅ **Nomes Aparecem Completos:** Nomes longos agora vão para a próxima linha em vez de cortar. Você consegue ler tudo sem precisar adivinhar. 👁️

✅ **Stickers Funcionando:** As figurinhas que você recebe agora aparecem corretamente no chat. 🧩

✅ **Correções Gerais:** Vários ajustes de estabilidade para uma experiência mais suave.

Atualize a página e aproveite! 🔄
Qualquer coisa, só chamar. 💬
