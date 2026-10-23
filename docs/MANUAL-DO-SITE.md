# Manual do site — Ponte Solidária

## 1. O que é
Plataforma web sem fins lucrativos que aproxima **pessoas e famílias em necessidade**, **doadores** e **ONGs parceiras**, com entrega acompanhada e chat entre as partes.

## 2. Perfis
- **Pessoa:** doa itens, participa de campanhas e/ou pede ajuda com a mesma conta.
- **ONG:** após aprovação do administrador, cria campanhas e media doações.
- **Administrador:** aprova ONGs, bloqueia contas abusivas, vê auditoria e estatísticas.

## 3. Como usar
**Pedir ajuda:** Início › "Fazer meu pedido de ajuda" (ou aba *Pedir ajuda*) › escolha a categoria, o item, a quantidade e a urgência. O nome da família **nunca** aparece publicamente.
**Doar:** aba *Doar itens* › *Nova Doação*. O formulário muda conforme a categoria:

| Categoria | Estado aceito | Campos extras |
|---|---|---|
| Alimentos | Somente novo/lacrado | Validade (mín. 30 dias) |
| Remédios | Somente novo/lacrado, embalagem original | Validade (mín. 90 dias); sem peso |
| Higiene | Somente novo/lacrado | Validade (se houver) |
| Roupas e calçados | Novo, seminovo ou usado conservado | Tamanho/numeração |
| Móveis e eletrodomésticos | Todos | Dimensões e peso |
| Outros | Todos | — |

**Transparência:** mostra totais e o histórico de entregas com dados **anonimizados** (iniciais do doador, categoria, quantidade e cidade).
**Conta:** o cadastro envia e-mail de confirmação em português; há "Esqueci minha senha" na tela de login.

## 4. Segurança e privacidade (LGPD)
Regras de segurança do banco por papel, bloqueio de escalada para administrador, espelho público de pedidos sem dados pessoais, dados mínimos na Transparência e política de privacidade (`privacidade.html`). Detalhes em `docs/ESTRUTURA-BANCO-DE-DADOS.md` e `docs/SEGURANCA-TESTE-ESCALADA.md`.

## 5. Análise de viabilidade

### 5.1 Público e importância
- Janaúba (MG) tem **70.699 habitantes** (IBGE, Censo 2022); com cerca de 3 pessoas por domicílio (premissa), são ~23,6 mil domicílios.
- Em 2024, **24,2%** dos domicílios brasileiros tinham algum grau de insegurança alimentar e **7,7%** moderada ou grave (IBGE, PNAD Contínua). Aplicando as médias nacionais (estimativa, não dado municipal): ~5,7 mil domicílios com algum grau e ~1,8 mil no público prioritário.
- **Meta do piloto (1º ano):** alcançar 10% do público prioritário (~180 famílias), com cerca de **250 contas de pessoas e 3 ONGs**. Cenário de crescimento regional: ~1.000 contas e 10 ONGs; consolidado: ~5.000 contas e 30 ONGs.

### 5.2 Impacto esperado
Reduz a distância entre quem precisa e quem quer ajudar; dá segurança (ONGs verificadas, nomes protegidos); evita desperdício ao ajustar o pedido à doação compatível; e gera transparência pública agregada.

### 5.3 Custos
Planilha completa e editável: `docs/Planilha-de-Custos-Ponte-Solidaria.xlsx` (domínio, hospedagem, integrações, manutenção e marketing em 3 cenários).

| Cenário | Custo de caixa/ano | Custo com horas de trabalho/ano |
|---|---|---|
| Piloto | R$ 340 | R$ 6.100 |
| Crescimento | R$ 3.040 | R$ 22.480 |
| Consolidado | R$ 10.840 | R$ 61.240 |

No piloto, o desembolso real é praticamente o domínio (R$ 40/ano, registro.br) e materiais de divulgação; hospedagem e banco ficam nas cotas gratuitas do Firebase (50 mil leituras e 20 mil escritas por dia). Com as premissas da planilha, o piloto usa ~23% da cota de leituras; o cenário consolidado a excede e exigiria o plano pago (Blaze) e otimização das consultas. Valores além dos verificados são estimativas editáveis.

### 5.4 Patrocínio, monetização e investimento (opcional)
A plataforma não deve cobrar de quem precisa de ajuda nem vender dados. Fontes possíveis: cotas de patrocínio de comércio local, parceria com prefeitura/assistência social, doações voluntárias para manutenção, editais de tecnologia social e apoio institucional do IFNMG. A aba *Financiamento* da planilha permite simular a cobertura do custo.

### 5.5 Riscos
Dependência do Firebase (cotas e custos); moderação de abusos; adesão inicial de ONGs; privacidade de dados sensíveis. Mitigação: monitoramento de uso, aprovação de ONGs, regras de segurança e dados anonimizados.
