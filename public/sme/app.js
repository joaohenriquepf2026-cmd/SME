/* ============================================================
   SME Requerimentos — Protocolo Digital
   Área do requerente + Administração (Firebase Realtime DB,
   com modo demonstração em localStorage enquanto o Firebase
   não estiver configurado em index.html).
   ============================================================ */

'use strict';

/* ---- Opções do formulário (na ordem da folha modelo) ---- */
const OPTS_COL1 = [
  'ADICIONAL DE FÉRIAS',
  'ADICIONAL NOTURNO',
  'ADICIONAL POR TEMPO DE SERVIÇO',
  'AUXÍLIO DESLOCAMENTO',
  'AVERBAÇÃO DE TEMPO DE SERVIÇO',
  'COMPUTO DE TEMPO DE SERVIÇO',
  'CONCESSÃO DE FÉRIAS',
  'CONCESSÃO DE LICENÇA PARA CASAMENTO',
  'CONCESSÃO DE LICENÇA POR MOTIVO DE FALECIMENTO DE PESSOA NA FAMÍLIA',
  'CONCESSÃO DE PROGRESSÃO POR MERECIMENTO',
  'EXONERAÇÃO / DISPENSA',
  'GRATIFICAÇÃO REFERENTE AO CURSO DE ESPECIALIZAÇÃO (PÓS-GRADUAÇÃO)',
  'REMOÇÃO'
];
const OPTS_COL2 = [
  'GRATIFICAÇÃO REFERENTE A ATUAÇÃO NO AEE',
  'INCLUSÃO DE DEPENDENTES EM SALÁRIO-FAMÍLIA',
  'LICENÇA GESTANTE',
  'LICENÇA MATERNIDADE',
  'LICENÇA PATERNIDADE',
  'LICENÇA POR MOTIVO DE DOENÇA EM PESSOA DA FAMÍLIA',
  'LICENÇA PARA TRATAMENTO DE SAÚDE',
  'LICENÇA PARA TRATAR DE INTERESSES PARTICULARES',
  'LICENÇA PARA ATIVIDADES POLÍTICAS',
  'LICENÇA PARA SERVIÇO MILITAR OBRIGATÓRIO',
  'LICENÇA PRÊMIO POR ASSIDUIDADE',
  'MUDANÇA DE NOME / RETIFICAÇÃO',
  'REDUÇÃO DE CARGA HORÁRIA'
];
const TODOS_OPTS = [...OPTS_COL1, ...OPTS_COL2];

/* ---- utilidades ---- */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const hojeISO = () => new Date().toISOString().slice(0, 10);
function fmtDataBR(iso) {
  if (!iso) return '';
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  const d = new Date(iso);
  return isNaN(d) ? iso : d.toLocaleDateString('pt-BR');
}
function soDigitos(v) { return String(v || '').replace(/\D/g, ''); }
function mascaraCPF(v) {
  const d = soDigitos(v).slice(0, 11);
  return d.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}
function mascaraTel(v) {
  const d = soDigitos(v).slice(0, 11);
  if (d.length <= 10) return d.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d{1,4})$/, '$1-$2');
  return d.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d{1,4})$/, '$1-$2');
}
function toast(msg, ms = 2600) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), ms);
}
function gerarProtocolo() {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  let rnd = '';
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for (let i = 0; i < 4; i++) rnd += chars[Math.floor(Math.random() * chars.length)];
  return `SME-${yy}${mm}${dd}-${rnd}`;
}
const STAMP_TXT = { EM_ANALISE: 'EM ANÁLISE', DEFERIDO: 'DEFERIDO', INDEFERIDO: 'INDEFERIDO' };
const STAMP_CL = { EM_ANALISE: 'st-analise', DEFERIDO: 'st-deferido', INDEFERIDO: 'st-indeferido' };
const PILL_CL = { EM_ANALISE: 'analise', DEFERIDO: 'deferido', INDEFERIDO: 'indeferido' };

/* ============================================================
   REPOSIÇÃO DE DADOS: Firebase Realtime DB ou demonstração local
   ============================================================ */
const Store = (() => {
  const cfg = (window.SME_CONFIG || {}).firebase || {};
  const urlOK = /^https:\/\//.test(cfg.databaseURL || '') && !/SEU_PROJETO|YOUR_/.test(cfg.databaseURL || '');
  const podeFirebase = urlOK && typeof window.firebase !== 'undefined' && cfg.apiKey && !/SUA_API_KEY/.test(cfg.apiKey);
  let dbRef = null;

  if (podeFirebase) {
    try {
      firebase.initializeApp(cfg);
      dbRef = firebase.database().ref('requerimentos');
    } catch (e) { console.error('Firebase indisponível, usando modo demo:', e); dbRef = null; }
  }
  const DEMO = !dbRef;
  const LSKEY = 'sme_requerimentos_demo';
  const listeners = [];

  const lsRead = () => { try { return JSON.parse(localStorage.getItem(LSKEY)) || {}; } catch { return {}; } };
  const lsWrite = (o) => localStorage.setItem(LSKEY, JSON.stringify(o));
  const notify = () => { const all = lsRead(); listeners.forEach(cb => cb(all)); };

  function listar() {
    if (dbRef) return dbRef.once('value').then(s => s.val() || {});
    return Promise.resolve(lsRead());
  }
  function criar(reg) {
    if (dbRef) return dbRef.child(reg.id).set(reg);
    const all = lsRead(); all[reg.id] = reg; lsWrite(all); notify();
    return Promise.resolve();
  }
  function atualizar(id, patch) {
    if (dbRef) return dbRef.child(id).update(patch);
    const all = lsRead(); if (all[id]) { Object.assign(all[id], patch); lsWrite(all); notify(); }
    return Promise.resolve();
  }
  function ouvir(cb) {
    if (dbRef) { dbRef.on('value', s => cb(s.val() || {})); return; }
    cb(lsRead()); listeners.push(cb);
    window.addEventListener('storage', notify);
  }
  function limparDemo() { if (DEMO) { localStorage.removeItem(LSKEY); notify(); } }

  return { listar, criar, atualizar, ouvir, limparDemo, DEMO };
})();

/* ============================================================
   FOLHA DO REQUERIMENTO (reprodução em A4 do modelo PDF)
   ============================================================ */
function linhaCampo(rotulo, valor, extra = '') {
  return `<div class="f-campo" ${extra}><b>${rotulo}:</b><span class="val">${esc(valor) || '&nbsp;'}</span></div>`;
}
function cbX(on, texto, forte = false) {
  const box = on ? '<span class="cbx chk-on">☑</span>' : '<span class="cbx">☐</span>';
  return `<span>${box}${forte && on ? `<b>${esc(texto)}</b>` : esc(texto)}</span>`;
}
function buildFolha(d, { paraAdmin = false } = {}) {
  /* d = {nome,rg,cpf,matricula,cargo,lotacao,endereco,email,telefone,destinatario,
         itens:[], obs, data, assinatura, status, parecer} */
  const itens = d.itens || [];
  const linhaOpt = (t) => {
    const on = itens.includes(t);
    return `<div class="oi">${cbX(on, t, true)}</div>`;
  };
  const col = (arr) => {
    return arr.map(linhaOpt).join('');
  };
  const parecerHTML = (paraAdmin || (d.parecer && d.status && d.status !== 'EM_ANALISE'))
    ? `<div class="f-box"><div class="f-box-head">Parecer do(a) Secretário(a)</div>
        <div class="f-box-body"><span class="parecer-tag">${d.status && d.status !== 'EM_ANALISE' ? `<span class="stamp stamp-sm ${STAMP_CL[d.status]}">${STAMP_TXT[d.status]}</span>` : ''}</span>
        <div class="parecer-line">${esc(d.parecer || (paraAdmin ? '' : 'Aguardando parecer da Secretaria Municipal de Educação…'))}</div></div></div>`
    : '';
  const sig = d.assinatura
    ? `<img src="${d.assinatura}" alt="Assinatura do requerente">`
    : `<span style="align-self:flex-end;color:#c9c4b8;font-size:12px;padding-bottom:4px">${paraAdmin ? '' : '(assine abaixo da linha)'}</span>`;
  return `<div class="folha">
  <div style="text-align:center;margin-bottom:14px"><img src="selos.png" alt="" style="max-height:62px"></div>
  <div class="f-title">REQUERIMENTO</div>
  <div class="f-box">
    <div class="f-box-head">Identificação</div>
    <div class="f-box-body">
      <div class="f-linha">${linhaCampo('NOME', d.nome)}</div>
      <div class="f-linha">${linhaCampo('RG', d.rg)}${linhaCampo('CPF', d.cpf)}</div>
      <div class="f-linha">${linhaCampo('MATRÍCULA', d.matricula)}${linhaCampo('CARGO / FUNÇÃO', d.cargo)}</div>
      <div class="f-linha">${linhaCampo('LOTAÇÃO', d.lotacao)}</div>
      <div class="f-linha">${linhaCampo('ENDEREÇO', d.endereco)}</div>
      <div class="f-linha">${linhaCampo('E-MAIL', d.email)}${linhaCampo('TELEFONE', d.telefone)}</div>
    </div>
  </div>
  <div class="f-box">
    <div class="f-box-head">Requer ao(à)</div>
    <div class="f-box-body">
      <div class="dest-line">
        ${cbX(d.destinatario === 'PREFEITO(A)', 'PREFEITO (A)')}
        ${cbX(d.destinatario === 'SECRETÁRIO(A)', 'SECRETÁRIO (A)')}
      </div>
      <div class="opts-grid" style="margin-top:10px">
        <div style="break-inside:auto">${col(OPTS_COL1)}</div>
        <div style="break-inside:auto">${col(OPTS_COL2)}</div>
      </div>
    </div>
  </div>
  <div class="f-box">
    <div class="f-box-head">Informações complementares</div>
    <div class="f-box-body"><div class="obs-text">${esc(d.obs) || '&nbsp;'}</div></div>
  </div>
  ${parecerHTML}
  <div class="assin-row">
    <div class="assin-col">
      <div class="assin-space">${sig}</div>
      <div class="assin-label">Assinatura do requerente</div>
      <div class="assin-date">DATA: ${esc(fmtDataBR(d.data)) || '____ / ____ / ______'}</div>
    </div>
  </div>
  <div class="f-foot">Rua João Viana Pessoa, nº 466 — Loteamento — Paraipaba — Ceará — CEP: 62.685-000</div>
</div>`;
}

/* ============================================================
   NAVEGAÇÃO POR ABAS
   ============================================================ */
function abrir_view(nome) {
  $$('.tab').forEach(b => { const at = b.dataset.view === nome; b.classList.toggle('is-active', at); b.setAttribute('aria-selected', at); });
  $$('.view').forEach(v => v.classList.toggle('is-active', v.id === 'view-' + nome));
}

/* ============================================================
   FORMULÁRIO DO REQUERIMENTO
   ============================================================ */
function montarOpcoes() {
  const mk = (arr, alvo) => arr.forEach((t, i) => {
    const id = `opt-${alvo}-${i}`;
    const lb = document.createElement('label');
    lb.className = 'opt';
    lb.innerHTML = `<input type="checkbox" name="itens" value="${esc(t)}" id="${id}"><span class="opt-t">${esc(t)}</span>`;
    $(`#opts-col-${alvo}`).appendChild(lb);
  });
  mk(OPTS_COL1, 1); mk(OPTS_COL2, 2);
}

function lerRascunho() {
  const f = $('#form-req');
  const fd = new FormData(f);
  return {
    nome: fd.get('nome'), rg: fd.get('rg'), cpf: fd.get('cpf'), matricula: fd.get('matricula'),
    cargo: fd.get('cargo'), lotacao: fd.get('lotacao'), endereco: fd.get('endereco'),
    email: fd.get('email'), telefone: fd.get('telefone'),
    destinatario: fd.get('destinatario'), obs: fd.get('obs'), data: fd.get('data'),
    assinatura: fd.get('assinatura') || '',
    itens: $$('input[name=itens]:checked', f).map(i => i.value)
  };
}
function atualizarFolha() { $('#folha-live').innerHTML = buildFolha(lerRascunho()); }

/* ============================================================
   ASSINATURA: foto pela câmera
   ============================================================ */
let streamAtual = null;
function abrirModalTitulo(t) { $('#sig-modal-title').textContent = t; }
function abrirSigModal() {
  $('#sig-modal').classList.add('aberto');
  $('#sig-modal').setAttribute('aria-hidden', 'false');
  fecharPreviewFoto();
  abrirModalTitulo('Tirar foto da assinatura');
  $$('#sig-modal .sig-cam, #sig-modal .sig-preview').forEach(el => el.classList.add('hidden'));
  $('#sig-cam-wrap').classList.remove('hidden');
  iniciarCamera();
}
function fecharSigModal() {
  $('#sig-modal').classList.remove('aberto');
  $('#sig-modal').setAttribute('aria-hidden', 'true');
  pararCamera();
}
function fecharPreviewFoto() { $('#sig-cam-preview').classList.add('hidden'); $('#sig-cam-wrap').classList.add('hidden'); }

async function iniciarCamera() {
  pararCamera();
  $('#cam-erro').classList.add('hidden');
  try {
    streamAtual = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } }, audio: false });
    const v = $('#cam-video'); v.srcObject = streamAtual; v.play();
    $('#cam-capture').disabled = false;
  } catch (e) {
    console.warn('Câmera indisponível:', e);
    $('#cam-capture').disabled = true;
    $('#cam-erro').classList.remove('hidden');
  }
}
function pararCamera() { if (streamAtual) { streamAtual.getTracks().forEach(t => t.stop()); streamAtual = null; } }

/* remove o papel, sombras e variações de luz para deixar somente os traços */
function processarAssinatura(srcCanvas) {
  const maxW = 860;
  const scale = Math.min(1, maxW / srcCanvas.width);
  const w = Math.max(1, Math.round(srcCanvas.width * scale));
  const h = Math.max(1, Math.round(srcCanvas.height * scale));
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d'); ctx.drawImage(srcCanvas, 0, 0, w, h);
  const img = ctx.getImageData(0, 0, w, h); const p = img.data;

  /* estima a cor do papel pelas bordas da imagem */
  const amostrasR = [], amostrasG = [], amostrasB = [];
  const guardar = (x, y) => {
    const i = (y * w + x) * 4;
    if (p[i + 3] < 20) return;
    const lum = 0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2];
    if (lum < 105) return;
    amostrasR.push(p[i]); amostrasG.push(p[i + 1]); amostrasB.push(p[i + 2]);
  };
  const passo = Math.max(1, Math.floor(Math.min(w, h) / 90));
  for (let x = 0; x < w; x += passo) { guardar(x, 0); guardar(x, h - 1); }
  for (let y = 0; y < h; y += passo) { guardar(0, y); guardar(w - 1, y); }
  const mediana = (arr, padrao) => {
    if (!arr.length) return padrao;
    arr.sort((a, b) => a - b);
    return arr[Math.floor(arr.length / 2)];
  };
  const fundoR = mediana(amostrasR, 255);
  const fundoG = mediana(amostrasG, 255);
  const fundoB = mediana(amostrasB, 255);
  const fundoLum = 0.299 * fundoR + 0.587 * fundoG + 0.114 * fundoB;

  for (let i = 0; i < p.length; i += 4) {
    const alfaOriginal = p[i + 3];
    if (!alfaOriginal) continue;
    const lum = 0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2];
    const dr = p[i] - fundoR, dg = p[i + 1] - fundoG, db = p[i + 2] - fundoB;
    const distancia = Math.sqrt(dr * dr + dg * dg + db * db);
    const cromia = Math.max(p[i], p[i + 1], p[i + 2]) - Math.min(p[i], p[i + 1], p[i + 2]);
    const sinal = Math.max((fundoLum - lum) * 1.25, distancia * .9, cromia * 1.05);
    const t = Math.max(0, Math.min(1, (sinal - 38) / 57));
    const alfa = t * t * (3 - 2 * t); /* transição suave sem halo serrilhado */
    p[i + 3] = Math.round(alfaOriginal * alfa);
    if (alfa > 0) {
      /* reforça a tinta sem transformar assinatura azul em preta */
      p[i] = Math.max(0, Math.min(255, 255 - (fundoR - p[i]) * 1.22));
      p[i + 1] = Math.max(0, Math.min(255, 255 - (fundoG - p[i + 1]) * 1.22));
      p[i + 2] = Math.max(0, Math.min(255, 255 - (fundoB - p[i + 2]) * 1.22));
    }
  }
  ctx.putImageData(img, 0, 0);
  /* recorta as margens transparentes */
  const d = ctx.getImageData(0, 0, w, h); const q = d.data;
  let minX = w, minY = h, maxX = 0, maxY = 0, achou = false;
  for (let y = 0; y < h; y += 4) for (let x = 0; x < w; x += 4) {
    if (q[(y * w + x) * 4 + 3] > 30) { achou = true; if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
  }
  if (!achou) return c.toDataURL('image/png');
  const pad = 12;
  minX = Math.max(0, minX - pad); minY = Math.max(0, minY - pad);
  maxX = Math.min(w, maxX + pad); maxY = Math.min(h, maxY + pad);
  const c2 = document.createElement('canvas'); c2.width = maxX - minX; c2.height = maxY - minY;
  c2.getContext('2d').drawImage(c, minX, minY, c2.width, c2.height, 0, 0, c2.width, c2.height);
  return c2.toDataURL('image/png');
}

let assinaturaAtual = '';
function definirAssinatura(dataUrl) {
  assinaturaAtual = dataUrl || '';
  $('#assinatura').value = assinaturaAtual;
  const thumb = $('#sig-thumb');
  if (assinaturaAtual) {
    thumb.classList.remove('hidden'); $('img', thumb).src = assinaturaAtual;
    $('#btn-sig-clear').classList.remove('hidden');
  } else {
    thumb.classList.add('hidden'); $('#btn-sig-clear').classList.add('hidden');
  }
  atualizarFolha();
}

function anexarAssinatura(file) {
  if (!file) return;
  const tiposAceitos = ['image/png', 'image/jpeg', 'image/webp'];
  if (!tiposAceitos.includes(file.type)) {
    toast('Use uma imagem PNG, JPG ou WebP.');
    return;
  }
  if (file.size > 10 * 1024 * 1024) {
    toast('A imagem deve ter no máximo 10 MB.');
    return;
  }

  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    URL.revokeObjectURL(url);
    if (!img.naturalWidth || !img.naturalHeight || img.naturalWidth * img.naturalHeight > 40000000) {
      toast('A imagem é muito grande ou não pôde ser lida.');
      return;
    }
    const limite = 1600;
    const escala = Math.min(1, limite / img.naturalWidth, limite / img.naturalHeight);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.naturalWidth * escala));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * escala));
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
    definirAssinatura(processarAssinatura(canvas));
    toast('Assinatura anexada e incorporada à folha.');
  };
  img.onerror = () => {
    URL.revokeObjectURL(url);
    toast('Não foi possível ler a imagem selecionada.');
  };
  img.src = url;
}


/* ============================================================
   IMPRESSÃO / DOWNLOAD DA FOLHA
   ============================================================ */
function imprimirFolha(html) {
  $('#print-area').innerHTML = html;
  window.print();
}

function nomeArquivoPDF(d) {
  const protocolo = String(d.id || '').replace(/[^a-zA-Z0-9_-]/g, '');
  return protocolo ? `requerimento-${protocolo}.pdf` : 'requerimento-sme-paraipaba.pdf';
}

async function baixarFolhaPDF(d, { paraAdmin = false, botao = null } = {}) {
  const alvo = $('#pdf-area');
  const textoOriginal = botao ? botao.textContent : '';

  if (typeof window.html2pdf !== 'function') {
    toast('O gerador de PDF não foi carregado. Abrindo a opção de impressão.', 4000);
    imprimirFolha(buildFolha(d, { paraAdmin }));
    return;
  }

  try {
    if (botao) {
      botao.disabled = true;
      botao.textContent = 'Gerando PDF…';
    }
    alvo.innerHTML = buildFolha(d, { paraAdmin });

    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    await Promise.all($$('img', alvo).map(img => {
      if (img.complete && img.naturalWidth) return Promise.resolve();
      return new Promise(resolve => {
        img.addEventListener('load', resolve, { once: true });
        img.addEventListener('error', resolve, { once: true });
      });
    }));

    await window.html2pdf().set({
      margin: 0,
      filename: nomeArquivoPDF(d),
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        scrollX: 0,
        scrollY: 0
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['legacy'] }
    }).from($('.folha', alvo)).toPdf().get('pdf').then(pdf => {
      /* O formulário é uma folha A4 fixa. Remove uma eventual página vazia
         criada pelo arredondamento de pixels para milímetros no html2pdf. */
      let total = pdf.internal.getNumberOfPages();
      while (total > 1) pdf.deletePage(total--);
    }).save();

    toast('PDF baixado com sucesso.');
  } catch (e) {
    console.error('Falha ao gerar o PDF:', e);
    toast('Não foi possível gerar o PDF. Abrindo a opção de impressão.', 4000);
    imprimirFolha(buildFolha(d, { paraAdmin }));
  } finally {
    alvo.innerHTML = '';
    if (botao) {
      botao.disabled = false;
      botao.textContent = textoOriginal;
    }
  }
}

/* ============================================================
   ENVIO DO REQUERIMENTO
   ============================================================ */
let ultimoEnvio = null;

async function enviarRequerimento(ev) {
  ev.preventDefault();
  const f = ev.target;
  let valido = true;
  $$('.field-err').forEach(e => e.classList.add('hidden'));

  if (!$$('input[name=itens]:checked', f).length) { $('#opts-erro').classList.remove('hidden'); valido = false; }
  if (!assinaturaAtual) { $('#sig-erro').classList.remove('hidden'); valido = false; }
  if (!valido) { f.reportValidity(); if (f.checkValidity()) toast('Complete a assinatura e as opções do requerimento.'); return; }
  if (!f.checkValidity()) { f.reportValidity(); toast('Preencha os campos de identificação.'); return; }

  const d = lerRascunho();
  const id = gerarProtocolo();
  const reg = {
    id,
    nome: d.nome.trim(), rg: d.rg.trim(), cpf: d.cpf.trim(), matricula: d.matricula.trim(),
    cargo: d.cargo.trim(), lotacao: d.lotacao.trim(), endereco: d.endereco.trim(),
    email: (d.email || '').trim(), telefone: d.telefone.trim(),
    destinatario: d.destinatario, itens: d.itens, obs: (d.obs || '').trim(),
    data: d.data || hojeISO(),
    assinatura: assinaturaAtual,
    status: 'EM_ANALISE', parecer: '', decidido_em: '',
    criado_em: new Date().toISOString(), criado_ts: Date.now()
  };
  try {
    await Store.criar(reg);
  } catch (e) {
    console.error(e); toast('Não foi possível enviar agora. Verifique a conexão e tente novamente.', 4000); return;
  }
  ultimoEnvio = reg;
  $('#ok-proto').textContent = id;
  $('#ok-modal').classList.add('aberto'); $('#ok-modal').setAttribute('aria-hidden', 'false');
  f.reset(); prepararData(); definirAssinatura(''); atualizarFolha();
}

/* ============================================================
   ACOMPANHAR REQUERIMENTO
   ============================================================ */
async function buscarRequerimentos(termo) {
  const t = termo.trim().toUpperCase();
  const tD = soDigitos(termo);
  const all = Object.values(await Store.listar());
  let achados = all.filter(r => String(r.id).toUpperCase() === t);
  if (!achados.length && tD.length === 11) {
    achados = all.filter(r => soDigitos(r.cpf) === tD);
  }
  return achados.sort((a, b) => (b.criado_ts || 0) - (a.criado_ts || 0));
}

function cardAcompanhamento(r) {
  const itensTxt = r.itens.length > 2 ? `${r.itens.length} itens (${esc(r.itens[0])}…)` : r.itens.map(esc).join(' · ');
  let statusBloco = '';
  if (r.status === 'EM_ANALISE' || !r.status) {
    statusBloco = `<div class="stamp stamp-sm st-analise stamp-viva">EM ANÁLISE</div>
      <p><b>Documento enviado e em análise.</b> Assim que a Secretaria Municipal de Educação der o parecer, o resultado aparecerá aqui quando você consultar novamente.</p>`;
  } else if (r.status === 'DEFERIDO') {
    statusBloco = `<div class="stamp stamp-sm st-deferido stamp-viva">DEFERIDO</div>
      <div class="aviso-def"><b>O seu requerimento foi DEFERIDO.</b>${r.parecer ? ' Parecer: ' + esc(r.parecer) : ''}</div>
      <p class="res-obs">Procure a Secretaria Municipal de Educação para dar andamento ao que foi deferido.</p>`;
  } else {
    statusBloco = `<div class="stamp stamp-sm st-indeferido stamp-viva">INDEFERIDO</div>
      <div class="aviso-indef"><b>O seu requerimento foi INDEFERIDO.</b>${r.parecer ? ' Parecer: ' + esc(r.parecer) : ''}<br><br>
      ⚠️ Por favor, procure a <b>SECRETARIA MUNICIPAL DE EDUCAÇÃO</b> para mais esclarecimentos.</div>`;
  }
  return `<div class="res-card">
    <div class="res-head">
      <div><small>Protocolo</small><strong>${esc(r.id)}</strong></div>
      <div style="text-align:right"><small>Registrado em</small><strong>${fmtDataBR(r.criado_em)}</strong></div>
    </div>
    <div class="res-body">
      <div class="res-linha"><span>Requerente</span><span>${esc(r.nome)}</span></div>
      <div class="res-linha"><span>Escola / Lotação</span><span>${esc(r.lotacao)}</span></div>
      <div class="res-linha"><span>Requer ao(à)</span><span>${esc(r.destinatario || '—')}</span></div>
      <div class="res-linha"><span>Assunto</span><span>${itensTxt}</span></div>
    </div>
    <div class="res-status">${statusBloco}
      <div style="margin-top:18px"><button type="button" class="btn btn-line btn-sm" id="btn-ver-folha">Baixar minha folha (PDF)</button>
      <button type="button" class="btn btn-line btn-sm" id="btn-novo-busca">Consultar outro protocolo</button></div>
    </div>
  </div>`;
}

async function acompanhar(ev) {
  ev.preventDefault();
  const q = $('#busca-q').value;
  const box = $('#busca-resultado');
  if (!q.trim()) { box.innerHTML = '<div class="empty-q">Digite um protocolo ou CPF para consultar.</div>'; return; }
  box.innerHTML = '<div class="empty-q">Consultando…</div>';
  const lista = await buscarRequerimentos(q);
  if (!lista.length) { box.innerHTML = `<div class="empty-q">Nenhum requerimento encontrado para <b>“${esc(q)}”</b>.<br>Confira o número do protocolo (ex.: SME-261014-8KD3) ou o CPF usado no envio.</div>`; return; }
  let html = (lista.length > 1 ? `<p class="lead">Encontramos ${lista.length} requerimentos para o CPF informado:</p>` : '');
  lista.forEach((r, i) => {
    html += cardAcompanhamento(r)
      .replace('id="btn-ver-folha"', `id="btn-ver-folha-${i}" data-folha="${i}"`)
      .replace('id="btn-novo-busca"', `id="btn-novo-busca-${i}" data-novo`);
  });
  box.innerHTML = html;
  $$('[data-folha]', box).forEach(b => b.onclick = () => baixarFolhaPDF(lista[+b.dataset.folha], { botao: b }));
  $$('[data-novo]', box).forEach(b => b.onclick = () => { box.innerHTML = ''; $('#busca-q').value = ''; $('#busca-q').focus(); });
}

/* ============================================================
   ADMINISTRAÇÃO
   ============================================================ */
let adminTodos = {};
let adminFiltro = '';

function adminLogado() { return sessionStorage.getItem('sme_adm') === '1'; }
function tentarLogin(ev) {
  ev.preventDefault();
  const senha = $('#admin-pass').value;
  if (senha === (window.SME_CONFIG || {}).adminPassword) {
    sessionStorage.setItem('sme_adm', '1');
    $('#pass-erro').classList.add('hidden');
    $('#admin-pass').value = '';
    desenharAdmin();
  } else { $('#pass-erro').classList.remove('hidden'); }
}
function sairAdmin() { sessionStorage.removeItem('sme_adm'); desenharAdmin(); }

function desenharAdmin() {
  const logado = adminLogado();
  $('#admin-login').classList.toggle('hidden', logado);
  $('#admin-painel').classList.toggle('hidden', !logado);
}

function renderTabela() {
  const alvo = $('#tabela-req tbody');
  let lista = Object.values(adminTodos).sort((a, b) => (b.criado_ts || 0) - (a.criado_ts || 0));
  const nTotal = lista.length;
  const nAna = lista.filter(r => (r.status || 'EM_ANALISE') === 'EM_ANALISE').length;
  const nDef = lista.filter(r => r.status === 'DEFERIDO').length;
  const nInd = lista.filter(r => r.status === 'INDEFERIDO').length;
  $('#admin-stats').innerHTML = `
    <div class="stat"><b>${nTotal}</b><span>Requerimentos</span></div>
    <div class="stat" style="border-left-color:var(--warn)"><b>${nAna}</b><span>Em análise</span></div>
    <div class="stat" style="border-left-color:var(--ok)"><b>${nDef}</b><span>Deferidos</span></div>
    <div class="stat" style="border-left-color:var(--no)"><b>${nInd}</b><span>Indeferidos</span></div>`;
  const f = adminFiltro.trim().toLowerCase();
  if (f) lista = lista.filter(r => `${r.nome} ${r.lotacao} ${r.id}`.toLowerCase().includes(f));
  alvo.innerHTML = lista.map(r => {
    const st = r.status || 'EM_ANALISE';
    const assunto = r.itens && r.itens.length ? (r.itens.length === 1 ? r.itens[0] : `${r.itens[0]} +${r.itens.length - 1}`) : '—';
    return `<tr data-id="${esc(r.id)}" style="cursor:pointer">
      <td class="proto">${esc(r.id)}</td>
      <td><span class="prof">${esc(r.nome)}</span><br><span class="escola">${esc(r.cargo || '')}</span></td>
      <td>${esc(r.lotacao)}</td>
      <td style="max-width:230px;font-size:12.5px">${esc(assunto)}</td>
      <td style="white-space:nowrap">${fmtDataBR(r.criado_em)}</td>
      <td><span class="pill ${PILL_CL[st]}">${STAMP_TXT[st]}</span></td>
      <td><button type="button" class="btn btn-mini btn-abrir">Analisar →</button></td>
    </tr>`;
  }).join('');
  $('#lista-vazia').classList.toggle('hidden', nTotal > 0);
  if (!nTotal && Store.DEMO) {
    $('#lista-vazia').classList.remove('hidden');
    $('#lista-vazia').innerHTML = 'Nenhum requerimento protocolado ainda. <br><br><button type="button" class="btn btn-line btn-sm" id="btn-seed">Carregar exemplo de demonstração</button>';
  }
}

function abrirDrawer(id) {
  const r = adminTodos[id]; if (!r) return;
  $('#drawer-proto').textContent = id;
  const st = r.status || 'EM_ANALISE';
  const boxParecer = `
    <aside class="parecer-box">
      <legend>Parecer da Secretaria</legend>
      ${st !== 'EM_ANALISE' ? `<div class="decided-note">Parecer já registrado: <b>${STAMP_TXT[st]}</b>${r.parecer ? ' — ' + esc(r.parecer) : ''} (${fmtDataBR(r.decidido_em)})</div>` : ''}
      <textarea id="txt-parecer" rows="5" placeholder="Escreva aqui o parecer (fundamentação do deferimento ou do indeferimento)…">${esc(r.parecer || '')}</textarea>
      <div class="parecer-botoes">
        <button type="button" class="btn btn-ok" id="btn-deferir">✓ Deferir</button>
        <button type="button" class="btn btn-no" id="btn-indeferir">✗ Indeferir</button>
      </div>
      ${st !== 'EM_ANALISE' ? '<button type="button" class="btn btn-ghost btn-sm" id="btn-reabrir" style="width:100%;margin-top:10px">Voltar para “em análise”</button>' : ''}
    </aside>`;
  const folha = `<div class="drawer-folha">${buildFolha(r, { paraAdmin: true })}
    <div style="margin-top:12px"><button type="button" class="btn btn-primary btn-sm" id="btn-baixar">⬇ Baixar requerimento (PDF)</button></div></div>`;
  $('#drawer-body').innerHTML = folha + boxParecer;
  $('#drawer').setAttribute('aria-hidden', 'false');
  $('#drawer-body').scrollTop = 0;

  const decidir = async (status) => {
    const parecerTxt = $('#txt-parecer').value.trim();
    if (status === 'INDEFERIDO' && !parecerTxt) { toast('Descreva o motivo do indeferimento no parecer.'); $('#txt-parecer').focus(); return; }
    await Store.atualizar(id, { status, parecer: parecerTxt, decidido_em: new Date().toISOString() });
    toast(`Requerimento ${STAMP_TXT[status].toLowerCase()} — resultado já visível para o requerente.`);
    fecharDrawer();
  };
  $('#btn-deferir').onclick = () => decidir('DEFERIDO');
  $('#btn-indeferir').onclick = () => decidir('INDEFERIDO');
  if ($('#btn-reabrir')) $('#btn-reabrir').onclick = async () => { await Store.atualizar(id, { status: 'EM_ANALISE', parecer: '', decidido_em: '' }); toast('Requerimento reaberto para análise.'); fecharDrawer(); };
  $('#btn-baixar').onclick = () => baixarFolhaPDF(adminTodos[id], { paraAdmin: true, botao: $('#btn-baixar') });
}
function fecharDrawer() { $('#drawer').setAttribute('aria-hidden', 'true'); }

function seloDemo() {
  /* assinatura rabiscada para o exemplo de demonstração */
  const c = document.createElement('canvas'); c.width = 420; c.height = 160;
  const x = c.getContext('2d'); x.strokeStyle = '#1c2440'; x.lineWidth = 4; x.lineCap = 'round';
  x.beginPath(); x.moveTo(24, 118);
  x.bezierCurveTo(90, 30, 130, 138, 190, 70); x.bezierCurveTo(230, 22, 260, 120, 320, 60);
  x.bezierCurveTo(346, 34, 372, 60, 400, 44);
  x.moveTo(70, 140); x.lineTo(360, 128);
  x.stroke(); return c.toDataURL('image/png');
}
async function seedExemplo() {
  const id = gerarProtocolo();
  await Store.criar({
    id, nome: 'MARIA DO SOCORRO SOUSA LIRA', rg: '2004013-8 SSP/CE', cpf: '123.456.789-00',
    matricula: '98234-1', cargo: 'PROFESSOR(A) PIEB I', lotacao: 'ESCOLA DE ENSINO FUNDAMENTAL JOÃO MARTINS DA CRUZ',
    endereco: 'Rua das Flores, 120 — Centro — Paraipaba/CE', email: 'socorro.lira@exemplo.com', telefone: '(88) 99999-1234',
    destinatario: 'SECRETÁRIO(A)', itens: ['LICENÇA PARA TRATAMENTO DE SAÚDE', 'AVERBAÇÃO DE TEMPO DE SERVIÇO'],
    obs: 'Segue em anexo relatório médico comprobatório (CID M54) e declaração de horário da escola.',
    data: hojeISO(), assinatura: seloDemo(), status: 'EM_ANALISE', parecer: '', decidido_em: '',
    criado_em: new Date().toISOString(), criado_ts: Date.now()
  });
  toast('Exemplo carregado.');
}

/* ============================================================
   INICIALIZAÇÃO
   ============================================================ */
let sigTemp = '';
function prepararData() { const d = $('#data-req'); if (!d.value) d.value = hojeISO(); }

document.addEventListener('DOMContentLoaded', () => {
  montarOpcoes();
  prepararData();
  atualizarFolha();
  desenharAdmin();
  if (Store.DEMO) $('#mode-chip').classList.remove('hidden');

  /* abas */
  $$('.tab').forEach(b => b.onclick = () => { abrir_view(b.dataset.view); if (b.dataset.view === 'admin') desenharAdmin(); });

  /* formulário */
  $('#form-req').addEventListener('submit', enviarRequerimento);
  $('#form-req').addEventListener('input', (e) => {
    const t = e.target;
    if (t.name === 'cpf') t.value = mascaraCPF(t.value);
    if (t.name === 'telefone') t.value = mascaraTel(t.value);
    atualizarFolha();
  });
  $('#btn-print-req').onclick = (e) => {
    const d = lerRascunho();
    if (!d.nome && !d.itens.length) { toast('Preencha o formulário antes de baixar a folha.'); return; }
    baixarFolhaPDF(d, { botao: e.currentTarget });
  };

  /* assinatura: abrir */
  $('#btn-cam').onclick = () => abrirSigModal();
  $('#btn-upload').onclick = () => {
    const input = $('#assinatura-arquivo');
    input.value = '';
    input.click();
  };
  $('#assinatura-arquivo').onchange = (e) => anexarAssinatura(e.target.files[0]);
  $('#btn-sig-clear').onclick = () => definirAssinatura('');
  $('#sig-close').onclick = fecharSigModal;

  /* assinatura: câmera */
  $('#cam-capture').onclick = () => {
    const v = $('#cam-video');
    if (!v.videoWidth) { toast('A câmera ainda não está pronta.'); return; }
    const shot = $('#cam-shot');
    shot.width = v.videoWidth; shot.height = v.videoHeight;
    shot.getContext('2d').drawImage(v, 0, 0);
    pararCamera();
    sigTemp = processarAssinatura(shot);
    $('#sig-preview-img').src = sigTemp;
    $('#sig-cam-wrap').classList.add('hidden');
    $('#sig-cam-preview').classList.remove('hidden');
  };
  $('#cam-retry').onclick = () => { $('#sig-cam-preview').classList.add('hidden'); $('#sig-cam-wrap').classList.remove('hidden'); iniciarCamera(); };
  $('#sig-recap').onclick = () => { $('#sig-cam-preview').classList.add('hidden'); $('#sig-cam-wrap').classList.remove('hidden'); iniciarCamera(); };
  $('#sig-use').onclick = () => { definirAssinatura(sigTemp); fecharSigModal(); };


  /* modal de sucesso */
  $('#ok-close').onclick = () => { $('#ok-modal').classList.remove('aberto'); $('#ok-modal').setAttribute('aria-hidden', 'true'); abrir_view('acompanhar'); $('#busca-q').value = ultimoEnvio ? ultimoEnvio.id : ''; if (ultimoEnvio) $('#busca-q').closest('form').dispatchEvent(new Event('submit', { cancelable: true })); };
  $('#ok-copy').onclick = () => { navigator.clipboard.writeText($('#ok-proto').textContent).then(() => toast('Protocolo copiado.')); };
  $('#ok-see').onclick = (e) => { if (ultimoEnvio) baixarFolhaPDF(ultimoEnvio, { botao: e.currentTarget }); };

  /* acompanhar */
  $('#form-busca').addEventListener('submit', acompanhar);

  /* admin */
  $('#form-senha').addEventListener('submit', tentarLogin);
  $('#btn-sair').onclick = sairAdmin;
  $('#admin-filtro').addEventListener('input', (e) => { adminFiltro = e.target.value; renderTabela(); });
  $('#tabela-req').addEventListener('click', (e) => {
    const tr = e.target.closest('tr[data-id]'); if (tr) abrirDrawer(tr.dataset.id);
  });
  $('#drawer-x').onclick = fecharDrawer;
  $('#drawer-bd').onclick = fecharDrawer;
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { fecharDrawer(); fecharSigModal(); } });
  document.addEventListener('click', (e) => { if (e.target.id === 'btn-seed') seedExemplo(); });
  $('#btn-reset-demo') && $('#btn-reset-demo').addEventListener('click', async () => {
    if (!confirm('Apagar todos os requerimentos salvos neste navegador (modo demonstração)?')) return;
    Store.limparDemo(); toast('Dados de demonstração apagados.');
  });

  /* lista viva para a administração */
  Store.ouvir((todos) => { adminTodos = todos; renderTabela(); });
});
