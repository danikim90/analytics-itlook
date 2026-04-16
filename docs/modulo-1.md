# Módulo 1 — Vendas, Curva ABC e Remarcação

## Status: ✅ Concluído

## Entradas (uploads na interface)
| Arquivo | Fonte | Conteúdo |
|---------|-------|----------|
| `Relatorio_Geral_de_Vendas.xls` | Eccosys | Código, Descrição, Total R$, Quantidade vendida |
| `Relatorio_de_Entradas_e_Saidas_de_Estoque.xls` | Eccosys | Código, Produto, Saldo Inicial, Entradas, Saídas, Saldo Final |
| `Saldos_Em_Estoque.xls` | Eccosys | Nome, Código, Data de Criação, Preço de Custo, Quantidade, Qtd Disponível |

## Saídas entregues
- Tabela de SKUs pai (ref + cor) classificados por curva ABC customizada
- Velocidade de venda por SKU
- D+ de cada SKU com alerta de remarcação
- Breakdown por tamanho para decisão de grade na recompra
- Destaque para best sellers (candidatos à repetição de compra)
- Export CSV completo

## Lógica de negócio

### Curva ABC customizada (baseada em velocidade de venda)
Velocidade = Saídas ÷ Dias disponível desde Data de Criação

| Curva | Proporção | Giro esperado |
|-------|-----------|---------------|
| A | 20% das peças | 1 mês |
| B+ | 25% | 3 meses |
| B- | 25% | 6 meses |
| C+ | 15% | 12 meses |
| C- | 15% | sem giro |

### D+
Dias corridos desde Data de Criação (Saldos em Estoque) até hoje.

### Régua de remarcação
| Prazo | Desconto sugerido |
|-------|-------------------|
| D+30 | avaliar |
| D+45 | 15% a 30% OFF |
| D+60 ou D+75 | 30% a 50% OFF |
| D+75 ou D+105 | 50% a 70% OFF |

### Atenção ao estoque fracionado
A IT Look repõe o ecommerce em lotes do atacado. Usar Saídas totais do período como proxy de demanda real.

## Decisões técnicas
- XLS do Eccosys corrompidos para xlrd/openpyxl → usar ssconvert
- SKU vem com `.0` no pandas → sempre limpar antes de cruzar
- Análise de curva no nível SKU pai (ref + cor)
- Breakdown de tamanhos só para visão de recompra

## Possíveis atualizações futuras
- Integrar CMV (Preço de Custo) para cálculo de margem por SKU
- Cruzar com dados de promoção para Módulo 4
- Exportar lista de remarcação diretamente para o Eccosys
