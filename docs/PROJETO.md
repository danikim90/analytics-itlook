# IT Look Analytics — Visão Geral do Projeto

## Sobre a IT Look
Ecommerce de moda feminina (itlook.com.br), hospedado na Nuvemshop. Foco em moda para ocasião, público feminino 45–55 anos. A dona é a Dani, que opera tudo sozinha — estoque, ads, tecnologia. Sede em Bom Retiro, São Paulo. Canal de atacado (Mire) e varejo online (Nuvemshop). ERP: Eccosys.

## Objetivo da ferramenta
Dani exporta relatórios mensalmente do Eccosys e TroqueCommerce, faz upload na ferramenta, e recebe análises prontas para decisão: quais produtos remarcar, quais repetir, qual grade pedir, o negócio dá lucro?

## Stack técnica
- React + Vite
- Deploy: Vercel
- GitHub: danikim90/analytics-itlook
- Padrão visual: tema bege Radar, consistente entre todos os módulos

## Fluxo de uso
1. Dani exporta relatórios mensalmente
2. Faz upload na ferramenta
3. Ferramenta processa e exibe painéis automaticamente
4. Dani toma decisões baseadas nos dados

## Estrutura do SKU (Eccosys)
- SKU numérico de 12 dígitos
- SKU filho = referência + cor + tamanho (nível granular)
- SKU pai = primeiros 10 dígitos (agrupa tamanhos — usado para análise)
- Descrição padrão: `Nome do Produto Cor Tamanho`
- Mesmo SKU usado no Eccosys e TroqueCommerce

## Módulos planejados
| # | Módulo | Status |
|---|--------|--------|
| 1 | Vendas + Curva ABC + Remarcação | ✅ Concluído |
| 2 | Trocas & Devoluções | 🔧 Em desenvolvimento |
| 3 | DRE | 📋 Planejado |
| 4 | Performance de Promoções | 📋 Planejado |
| 5 | Logística | 📋 Planejado |
| 6 | LTV & Recorrência | 📋 Planejado |
| 7 | Meta Ads | 📋 Planejado |

## Regras técnicas críticas
1. **Bug XLS Eccosys:** não abrem com xlrd/openpyxl → converter com `ssconvert arquivo.xls arquivo.csv`
2. **SKU com .0:** pandas gera `206600601003.0` → sempre limpar: `.astype(str).str.replace('.0','').str.strip()`
3. **Separador TroqueCommerce:** CSV usa `;`, não `,`
4. **Cruzamento Eccosys × TroqueCommerce:** pelo SKU numérico limpo. 178/182 SKUs batem.
