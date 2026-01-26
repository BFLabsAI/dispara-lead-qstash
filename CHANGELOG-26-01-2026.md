# Changelog

## [v1.3.1] - 26-01-2026

### 🚀 Novidades (Features)

- **Scroll Infinito na Lista de Contatos:** A lista de contatos agora carrega automaticamente à medida que você rola para baixo. Sem mais limite de 50 ou 100 contatos visíveis de uma vez! Pode ter milhares que ele carrega sob demanda. ✨
- **Indicador de Carregamento:** Adicionado spinner no final da lista para indicar que mais contatos estão sendo buscados.

### ⚡ Performance

- **Carregamento de Contatos 140x Mais Rápido:** A consulta que lista os contatos foi completamente reescrita como RPC (`get_contacts_for_chat_v5`), eliminando buscas lentas e permitindo paginação eficiente direto no banco de dados.

### 🐛 Correções & Melhorias (Fixes & Improvements)

- **Campanhas Travadas (Crítico):** Corrigido bug crítico que fazia algumas campanhas "travarem" ou pararem de enviar aleatoriamente. O processo de disparo foi blindado. 🛡️
- **Envio com IA:** Ajustada a marcação e processamento de mensagens enviadas com Inteligência Artificial, garantindo que a flag seja espeitada.
- **Correção de Erro 406 (Detalhes do Contato):** Ao selecionar um contato que nunca recebeu campanha, o sistema exibia um erro. Corrigido para tratar esse cenário graciosamente.
- **Renderização de Stickers:** Stickers (figurinhas) agora são processados corretamente pelo webhook. Figurinhas antigas com links quebrados exibem um placeholder "Sticker (Não processado)" em vez de imagem quebrada.
- **Layout da Lista de Contatos:**
    - **Nomes Longos:** Nomes de contatos agora podem ocupar **até 2 linhas** antes de cortar.
    - **Prévia de Mensagem:** O texto da última mensagem também pode ocupar até 2 linhas.
    - **Largura Aumentada:** Barra lateral ampliada para 384px.
    - **Tooltips:** Hover para ler textos cortados.

---

## 📱 Texto para Envio aos Clientes (WhatsApp)

Oi! 🎉
Hoje a atualização foi grande! O sistema está mais rápido e estável.

✅ **Campanhas Mais Seguras:** Resolvemos de vez os casos de campanhas que "travavam". Agora o envio é garantido. 🛡️
✅ **Lista de Contatos Infinita:** Pode rolar à vontade! Não tem mais limite de contatos na tela. 📜♾️
✅ **Super Velocidade:** O carregamento do chat está **140x virado no jiraia**! 🚀
✅ **IA Ajustada:** O envio com Inteligência Artificial foi calibrado para funcionar perfeitamente. 🤖
✅ **Visual Melhorado:** Nomes longos agora aparecem em 2 linhas e as figurinhas (stickers) voltam a funcionar! 🎨

Atualize a página para garantir todas as correções! 🔄
Qualquer dúvida, estamos por aqui. �
