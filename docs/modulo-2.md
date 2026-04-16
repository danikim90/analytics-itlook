# Módulo 2 — Trocas & Devoluções

## Status: 🔧 Em desenvolvimento

## Entradas (uploads na interface)
| Arquivo | Fonte | Conteúdo | Obrigatório |
|---------|-------|----------|-------------|
| `ProdutosMotivos.csv` | TroqueCommerce | SKU, Descrição, Reversas, Trocas, Devoluções, Valor, 5 motivos | ✅ Sim |
| `Relatorio_Geral_de_Vendas.xls` | Eccosys | Código, Descrição, Quantidade vendida — mesmo período | Desbloqueia visões 6 e 7 |

## Estrutura do CSV TroqueCommerce
Separador: `;`
```
SKU; Descrição; Total de Reversas; Trocas; Trocas por Produto; Devoluções;
Valor das Trocas; Valor das Trocas por Produto; Valor das Devoluções;
Ficou grande; Ficou pequeno; Arrependimento; Não gostei da qualidade; Não gostei do produto
```
Descrição: `"Nome Produto Cor (Cor, Tamanho)"` → extrair nome do produto pai removendo cor e tamanho.

## As 7 visões

### Visões independentes (só TroqueCommerce)

**1. Resumo geral**
Cards no topo: total de reversas, total devoluções, total trocas, valor total devolvido, motivo mais frequente.

**2. Ranking de motivos geral**
Gráfico de barras: Ficou grande / Ficou pequeno / Arrependimento / Não gostei da qualidade / Não gostei do produto — totais e percentuais. Insumo direto pra decisão de grade na recompra.

**3. Diagnóstico por categoria**
Agrupar por categoria (Calça, Blusa, Vestido, Blazer, Conjunto, Camisa, Colete, Jaqueta) — total de reversas, % do total, motivo dominante. Confirma pivot estratégico pra vestidos.

**4. Ranking de produtos pai com problema**
Agrupa por nome do produto pai — total de reversas, breakdown de motivos, motivo principal destacado. Ordenado por total decrescente.

**5. Mapa de sizing**
Apenas SKUs com motivo sizing (ficou grande + ficou pequeno). Por tamanho (P, M, G, GG / 36–44): direção do problema. Insumo direto pra grade de recompra.

### Visões com cruzamento (TroqueCommerce + Eccosys)

**6. Taxa de devolução % por produto pai**
Reversas ÷ vendas × 100 por produto pai. Ordenado por taxa decrescente. Destaque visual para taxas acima de 10%.

**7. Curva ABC × Devolução**
Cruzar classificação ABC com taxa de devolução. Quadrantes:
- 🚨 Curva A + devolução alta = problema crítico de produto
- ✅ Curva A + devolução baixa = saudável
- ⚠️ Curva C + devolução alta = pode ser ruído (vende pouco, o pouco volta)
- Curva C + devolução baixa = invisível normal

## Comportamento da interface
- Upload dos dois arquivos na mesma tela
- Se só TroqueCommerce carregado: exibe visões 1 a 5
- Visões 6 e 7 desbloqueiam automaticamente quando Eccosys for carregado

## Prompt completo para o Claude Code

```
Preciso construir o Módulo 2 — Trocas & Devoluções no projeto analytics-itlook,
seguindo exatamente o mesmo padrão visual e de estrutura do Módulo 1 já existente.

Contexto do projeto:
- React + Vite + Vercel
- Repo: danikim90/analytics-itlook
- Módulo 1 já existe e funciona com upload de planilha do Eccosys
- Preciso adicionar uma nova rota /modulo-2 com navegação entre módulos no menu

O que o Módulo 2 faz:
Recebe 2 uploads: CSV do TroqueCommerce (ProdutosMotivos) + planilha de vendas do
Eccosys do mesmo período. Processa e exibe 7 visões analíticas.

Estrutura do CSV do TroqueCommerce (separador ;):
SKU; Descrição; Total de Reversas; Trocas; Trocas por Produto; Devoluções;
Valor das Trocas; Valor das Trocas por Produto; Valor das Devoluções;
Ficou grande; Ficou pequeno; Arrependimento; Não gostei da qualidade; Não gostei do produto

A descrição vem no formato: "Nome Produto Cor (Cor, Tamanho)"
Extrair o nome do produto pai removendo cor e tamanho.

Estrutura da planilha Eccosys: SKU + quantidade vendida no período.

As 7 visões:

1. Resumo geral
Cards no topo: total de reversas, total devoluções, total trocas, valor total devolvido,
motivo mais frequente.

2. Ranking de motivos geral
Gráfico de barras: Ficou grande / Ficou pequeno / Arrependimento /
Não gostei da qualidade / Não gostei do produto — com totais e percentuais.

3. Diagnóstico por categoria
Agrupar por categoria (Calça, Blusa, Vestido, Blazer, Conjunto, Camisa, Colete, Jaqueta)
— total de reversas, % do total geral, motivo dominante de cada uma.

4. Ranking de produtos pai com problema
Agrupa por nome do produto pai — total de reversas, breakdown de motivos,
motivo principal destacado. Ordenado por total decrescente.

5. Mapa de sizing
Apenas SKUs com motivo sizing (ficou grande + ficou pequeno).
Por tamanho (P, M, G, GG / 36, 38, 40, 42, 44): direção do problema.

6. Taxa de devolução % por produto pai (cruzamento com Eccosys)
Reversas ÷ vendas × 100 por produto pai.
Ordenado por taxa decrescente. Destaque para taxas acima de 10%.

7. Curva ABC × Devolução (cruzamento com Eccosys)
Cruzar classificação ABC com taxa de devolução. Quadrantes:
- Curva A + devolução alta = problema crítico
- Curva A + devolução baixa = saudável
- Curva C + devolução alta = possível ruído
- Curva C + devolução baixa = invisível normal

Instruções técnicas:
- Seguir exatamente o mesmo padrão visual do Módulo 1 (cores, tipografia, cards, tabelas)
- Adicionar navegação no menu entre Módulo 1 e Módulo 2
- Upload dos dois arquivos na mesma tela
- Se só TroqueCommerce carregado: exibe visões 1 a 5
- Visões 6 e 7 desbloqueiam quando Eccosys for carregado
- Parsing do CSV com separador ; e valores monetários no formato brasileiro (vírgula decimal)
- Extrair nome do produto pai da descrição: remover tudo a partir do padrão (Cor, Tamanho)
- Leia os arquivos da pasta docs/ antes de começar para entender o padrão do projeto
```
