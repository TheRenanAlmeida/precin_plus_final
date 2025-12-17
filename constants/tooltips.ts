
export const TOOLTIP = {
  // Cabeçalhos de Seção
  HEADER_YOUR_QUOTES: "Informe seus preços do dia (cotações registradas).",
  HEADER_MARKET_TABLE: "Hoje no mercado: melhores preços por distribuidora e combustível.",
  HEADER_MARKET_CHART: "Histórico (21 dias): linhas de Mínimo, Média (IQR) e Máximo do mercado.",
  HEADER_THERMOMETER: "Termômetro: posição do preço de hoje vs os últimos 21 dias (referência estatística).",
  HEADER_RANKING: "Ranking do dia: comparação entre distribuidoras neste combustível.",
  HEADER_MY_DISTRIBUTORS: "Suas bandeiras nesta base. Clique para informar a cotação do dia.",
  HEADER_MARKET_QUOTES: "Contribua com cotações: preencha para fortalecer a inteligência de mercado.",
  HEADER_CONTRACT_LIST: "Escolha uma bandeira para definir regras de referência (visível no Histórico).",
  HEADER_HISTORY_SUMMARY_MARKET: "Quanto a média do mercado (IQR) mudou no período selecionado.",
  HEADER_HISTORY_SUMMARY_YOURS: "Como suas cotações mudaram no período (por bandeira).",
  HEADER_HISTORY_SUMMARY_BEST: "Maior diferença favorável no período: dia e bandeira com maior distância vs média do mercado.",

  // Contratos
  CONTRACT_BASE_SELECTOR: "Base selecionada determina onde o contrato será salvo e aplicado.",
  CONTRACT_BASE_TYPE: "A regra usa qual referência: Mínimo ou Média do mercado?",
  CONTRACT_SPREAD: "Quantos centavos acima da referência? Ex.: 0,04 = 4 centavos.",
  
  // Mercado / Tabela Histórico
  MARKET_MIN: "Menor preço do mercado no dia.",
  MARKET_AVG: "Média do mercado (IQR).",
  MARKET_MAX: "Maior preço do mercado no dia.",
  
  // Diferenças e Status
  DIFF_VS_MIN: "Sua cotação − Mínimo do mercado (R$).",
  DIFF_VS_AVG: "Sua cotação − Média do mercado (R$).",
  EXPECTED_PRICE: "Referência esperada: MIN/AVG + centavos definidos.",
  DEVIATION: "Desvio: Cotação − Referência esperada. Se > 0, ficou acima da referência.",
  STATUS: "OK = dentro da regra. FORA = acima da regra (desvio > 0).",
};
