/* =========================================================
   GARAGE HF ESTÉTICA — CONFIGURAÇÃO
   ---------------------------------------------------------
   MODO DEMONSTRAÇÃO (firebase: null):
     os dados ficam salvos só no navegador deste aparelho.
     Serve para testar o site e o painel.

   MODO ONLINE (recomendado para uso real):
     cole abaixo o objeto de configuração do seu projeto
     Firebase (veja o LEIAME.md, passo a passo). Assim todos
     os clientes enxergam os mesmos horários em tempo real.
   ========================================================= */
window.HF_CONFIG = {
  firebase: null
  /* Exemplo:
  firebase: {
    apiKey: "AIza...",
    authDomain: "garage-hf.firebaseapp.com",
    projectId: "garage-hf",
    storageBucket: "garage-hf.appspot.com",
    messagingSenderId: "000000000",
    appId: "1:000000000:web:abc123"
  }
  */
};

/* Valores iniciais. Depois de salvar no painel, o que vale é o painel. */
window.HF_DEFAULTS = {
  settings: {
    nomeLoja: 'Garage HF Estética',
    whatsapp: '5564996186585',          // DDI + DDD + número, só dígitos
    instagram: 'estetica.hf',
    endereco: 'Atualize o endereço no painel do dono',
    pin: '1234',                         // senha do painel no modo demonstração
    slotMinutes: 60,                     // intervalo entre horários
    capacidade: 1,                       // quantos carros atendidos ao mesmo tempo
    antecedenciaHoras: 2,                // mínimo de antecedência para agendar hoje
    diasAFrente: 30                      // até quantos dias à frente o cliente pode agendar
  },
  categorias: [
    { id: 'hatch',  nome: 'Hatch / Compacto',     acrescimo: 0  },
    { id: 'sedan',  nome: 'Sedã / Cupê',          acrescimo: 10 },
    { id: 'suv',    nome: 'SUV',                  acrescimo: 20 },
    { id: 'pickup', nome: 'Picape / Caminhonete', acrescimo: 30 }
  ],
  services: [
    { id: 'lavagem',     nome: 'Lavagem normal',             preco: 50,  duracao: 60,  ativo: true,
      descricao: 'Lavagem externa detalhada, rodas, caixas de roda, aspiração e acabamento nos plásticos.' },
    { id: 'polimento',   nome: 'Polimento técnico',          preco: 450, duracao: 480, ativo: true,
      descricao: 'Correção de pintura em etapas: remove riscos finos, marcas de lavagem e devolve o brilho de fábrica.' },
    { id: 'higienizacao',nome: 'Higienização dos bancos',    preco: 180, duracao: 180, ativo: true,
      descricao: 'Limpeza profunda com extratora: remove manchas, odores, ácaros e bactérias do estofado.' },
    { id: 'cristalizacao',nome: 'Cristalização do para-brisa',preco: 80, duracao: 60,  ativo: true,
      descricao: 'Repelente de água no vidro: a chuva escorre sozinha e a visibilidade melhora à noite.' },
    { id: 'farois',      nome: 'Recuperação de faróis',      preco: 120, duracao: 120, ativo: true,
      descricao: 'Lixamento, polimento e proteção UV: farol amarelado volta a ficar transparente e ilumina melhor.' }
  ],
  // 0 = domingo ... 6 = sábado
  schedule: {
    0: { aberto: false, inicio: '08:00', fim: '12:00' },
    1: { aberto: true,  inicio: '08:00', fim: '18:00' },
    2: { aberto: true,  inicio: '08:00', fim: '18:00' },
    3: { aberto: true,  inicio: '08:00', fim: '18:00' },
    4: { aberto: true,  inicio: '08:00', fim: '18:00' },
    5: { aberto: true,  inicio: '08:00', fim: '18:00' },
    6: { aberto: true,  inicio: '08:00', fim: '13:00' }
  },
  // { data:'2026-12-25', tipo:'feriado'|'folga'|'fechado', motivo:'Natal', horarios:[] (vazio = dia inteiro) }
  bloqueios: []
};
