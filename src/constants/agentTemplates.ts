import { Users, DollarSign, Target, Zap, ShoppingCart, CalendarDays, ThumbsUp } from 'lucide-react';

export const AGENT_TEMPLATES = {
    'negociacoes-perdidas': {
        name: 'Negociações Perdidas',
        icon: DollarSign,
        context: `O cliente da empresa teve interesse comercial, solicitou orçamento, recebeu proposta ou chegou próximo ao fechamento, mas não converteu.`,
        objective: `Reativar o interesse comercial sem parecer desesperado, identificando e resolvendo objeções que impediram o fechamento inicial.`,
        strategy: `
1. **Reconexão Suave**: Retomar contato sem pressão
2. **Identificação de Objeções**: Entender motivos da não-conversão
3. **Nova Proposta de Valor**: Apresentar benefícios adicionais
4. **Facilitação**: Tornar mais fácil a decisão de compra`
    },
    'leads-frios': {
        name: 'Leads Frios',
        icon: Users,
        context: `Leads que demonstraram interesse inicial (baixaram material, inscrição) mas ficaram inativos.`,
        objective: `Despertar interesse novamente através de educação, construção de confiança e demonstração de valor.`,
        strategy: `
1. **Reconexão Baseada em Valor**: Oferecer algo útil
2. **Educação Progressiva**: Nutrir com conteúdo relevante
3. **Construção de Autoridade**: Demonstrar expertise
4. **Despertar Necessidade**: Fazer o lead perceber que precisa da solução`
    },
    'clientes-ltv': {
        name: 'Clientes LTV',
        icon: ThumbsUp,
        context: `Clientes ativos que já compraram pelo menos uma vez.`,
        objective: `Aumentar o valor total (LTV) através de upsell, cross-sell e fidelização.`,
        strategy: `
1. **Relacionamento VIP**: Tratar como cliente especial
2. **Ofertas Exclusivas**: Produtos only para clientes
3. **Programas de Fidelidade**: Incentivar recompra
4. **Feedback**: Mostrar que a opinião importa`
    },
    'outbound-frio': {
        name: 'Outbound Frio',
        icon: Target,
        context: `Contatos que nunca interagiram com a marca (prospecção ativa).`,
        objective: `Iniciar relacionamento, despertar interesse e conseguir permissão para continuar.`,
        strategy: `
1. **Personalização Extrema**: Pesquisar antes de contatar
2. **Valor Imediato**: Oferecer algo útil de cara
3. **Quebra de Padrão**: Ser diferente de spam
4. **Permission Marketing**: Pedir autorização`
    },
    'reativacao-black-friday': {
        name: 'Reativação Black Friday',
        icon: Zap,
        context: `Base inativa ou leads antigos durante período de Black Friday.`,
        objective: `Maximizar vendas com ofertas irresistíveis e senso de urgência real.`,
        strategy: `
1. **Pre-hype**: Construir expectativa
2. **Exclusividade**: Ofertas especiais para a base
3. **Escassez Real**: Limitações de tempo/quantidade
4. **FOMO**: Fear of Missing Out estratégico`
    },
    'recuperacao-carrinho': {
        name: 'Recuperação Carrinho',
        icon: ShoppingCart,
        context: `Clientes que adicionaram produtos mas não finalizaram.`,
        objective: `Recuperar a venda identificando e resolvendo objeções.`,
        strategy: `
1. **Lembrete Suave**: "Esqueceu algo?"
2. **Resolução de Objeções**: Ajudar com dúvidas
3. **Facilitação**: Simplificar pagamento
4. **Incentivo Final**: Push gentil`
    },
    'agendamento-reuniao': {
        name: 'Agendamento Reunião',
        icon: CalendarDays,
        context: `Leads qualificados que precisam de consultoria ou demo (B2B/High Ticket).`,
        objective: `Conseguir agendamento demonstrando valor da conversa.`,
        strategy: `
1. **Qualificação Prévia**: Confirmar fit
2. **Valor da Reunião**: Vender a conversa, não o produto
3. **Facilidade**: Opções de horário claras
4. **Confirmação**: Garantir comparecimento`
    },
    'promocao-sazonal': {
        name: 'Promoção Sazonal',
        icon: CalendarDays,
        context: `Datas comemorativas (Natal, Dia das Mães, etc).`,
        objective: `Conectar emocionalmente e gerar vendas com ofertas temáticas.`,
        strategy: `
1. **Conexão Emocional**: Ligar produto à data
2. **Storytelling**: Narrativa envolvente
3. **Oferta Temática**: Coerência com a ocasião
4. **Celebração**: Senso de comunidade`
    }
};
