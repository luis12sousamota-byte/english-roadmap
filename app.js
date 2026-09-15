/* ==========================================================================
   MYLORE — Diagnosis Experience
   Vanilla JS, no build step. Organized as component-like render functions.
   ========================================================================== */

(function () {
  "use strict";

  /* ------------------------------------------------------------------
   * UTILITIES
   * ------------------------------------------------------------------ */
  const app = document.getElementById("app");
  const progressShell = document.getElementById("progressShell");
  const progressFill = document.getElementById("progressFill");

  function qs(sel, ctx) { return (ctx || document).querySelector(sel); }
  function qsa(sel, ctx) { return Array.from((ctx || document).querySelectorAll(sel)); }

  function escapeHtml(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function delay(ms) { return new Promise((res) => setTimeout(res, ms)); }
  function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
  function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }
  function wordCount(str) {
    if (!str) return 0;
    return String(str).trim().split(/\s+/).filter(Boolean).length;
  }
  function setHtml(el, html) { el.innerHTML = html; }

  function render(html) {
    app.style.opacity = "0";
    setHtml(app, html);
    requestAnimationFrame(() => {
      app.style.transition = "opacity 0.3s ease";
      app.style.opacity = "1";
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function setProgress(pct, visible) {
    if (visible === false) {
      progressShell.hidden = true;
      return;
    }
    progressShell.hidden = false;
    progressFill.style.width = clamp(pct, 0, 100) + "%";
  }

  /* ------------------------------------------------------------------
   * ANALYTICS — thin abstraction, ready for GA4 / Meta Pixel later
   * ------------------------------------------------------------------ */
  window.dataLayer = window.dataLayer || [];
  function track(eventName, payload) {
    const data = Object.assign(
      {
        event: eventName,
        profile_type: state.profile ? state.profile.key : undefined,
        estimated_level: state.profile ? state.profile.levelLabel : undefined,
        primary_bottleneck: state.profile ? state.profile.bottleneckTitle : undefined,
        goal: state.answers.goals.join(",") || undefined,
        obstacle: state.answers.obstacle || undefined,
      },
      payload || {}
    );
    window.dataLayer.push(data);
    if (typeof window.gtag === "function") window.gtag("event", eventName, data);
    if (typeof window.fbq === "function") window.fbq("trackCustom", eventName, data);
    console.log("[track]", eventName, data);
  }

  function saveResponseToSheet() {
    const a = state.answers;
    const p = state.profile;
    const payload = {
      name: a.name,
      location: a.location,
      job: a.job,
      hobbies: a.hobbies,
      brazilRecommendation: a.brazilRecommendation,
      listeningReply: a.listeningReply,
      listeningSkipped: a.listeningSkipped,
      pain: a.painLabel || a.pain,
      goals: a.goals,
      goalOther: a.goalOther,
      obstacle: a.obstacle,
      obstacleOther: a.obstacleOther,
      boss1: a.boss1,
      boss2: a.boss2,
      boss3: a.boss3,
      scoreCommunication: state.scores.communication,
      scoreVocabulary: state.scores.vocabulary,
      scoreListening: state.scores.listening,
      scoreSpontaneity: state.scores.spontaneity,
      profileKey: p ? p.key : "",
      profileTitle: p ? p.title : "",
      estimatedLevel: p ? p.levelLabel : "",
    };
    fetch("/api/save-response", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => {});
  }

  /* ------------------------------------------------------------------
   * STATE
   * ------------------------------------------------------------------ */
  const state = {
    stage: "landing",
    answers: {
      name: "", location: "", job: "", hobbies: "", brazilRecommendation: "",
      listeningReply: "", listeningSkipped: null,
      pain: "", painLabel: "",
      goals: [], goalOther: "",
      obstacle: "", obstacleOther: "",
      boss1: "", boss2: "", boss3: "",
    },
    scores: { communication: 0, vocabulary: 0, listening: 0, spontaneity: 0 },
    profile: null,
  };

  /* ------------------------------------------------------------------
   * DATA
   * ------------------------------------------------------------------ */
  const PAIN_OPTIONS = [
    { key: "no_words", label: "Sei o que quero dizer, mas não encontro as palavras.", spontaneity: 5, vocabPenalty: 1 },
    { key: "freeze", label: "Entendo inglês, mas travo para responder.", spontaneity: 3, vocabPenalty: 0 },
    { key: "repeat", label: "Consigo responder, mas uso sempre as mesmas palavras.", spontaneity: 6, vocabPenalty: 1 },
    { key: "translate", label: "Preciso traduzir mentalmente antes de falar.", spontaneity: 4, vocabPenalty: 0 },
    { key: "natural", label: "Geralmente consigo responder com naturalidade.", spontaneity: 9, vocabPenalty: 0 },
  ];

  const GOALS = [
    { key: "travel", icon: "✈", label: "Viajar sem depender de ninguém", priority: "criar confiança para se comunicar sozinho no dia a dia" },
    { key: "conversation", icon: "💬", label: "Conversar naturalmente", priority: "prática de recuperação, vocabulário ativo e situações reais de comunicação" },
    { key: "media", icon: "🎬", label: "Entender filmes e séries", priority: "compreensão auditiva e o vocabulário usado no dia a dia" },
    { key: "work", icon: "💼", label: "Trabalhar em inglês", priority: "vocabulário profissional e confiança em contextos de trabalho" },
    { key: "abroad", icon: "🌎", label: "Morar fora", priority: "inglês funcional e rotina de imersão para o dia a dia" },
    { key: "content", icon: "📚", label: "Consumir conteúdo em inglês", priority: "consumo ativo de conteúdo com prática de produção em paralelo" },
    { key: "exam", icon: "🎓", label: "Passar em uma prova", priority: "estrutura de estudo focada e prática guiada para o formato da prova" },
    { key: "other", icon: "+", label: "Outro", priority: "uma rotina alinhada com o que você definir como prioridade" },
  ];

  const OBSTACLES = [
    { key: "no_direction", label: "Não sei exatamente o que estudar." },
    { key: "consistency", label: "Não consigo manter consistência." },
    { key: "no_progress", label: "Estudo, mas sinto que não evoluo." },
    { key: "gap", label: "Entendo mais do que consigo falar." },
    { key: "vocabulary", label: "Me falta vocabulário." },
    { key: "no_time", label: "Não tenho tempo." },
    { key: "no_practice", label: "Não sei como transformar estudo em prática." },
    { key: "other", label: "Outro." },
  ];

  const PROFILES = {
    beginner: {
      key: "beginner",
      title: "THE BEGINNER EXPLORER",
      levelLabel: "A0–A1",
      headline: "Você está no começo do mapa — e isso não é um problema.",
      body: "Você ainda está formando as primeiras estruturas do inglês. Isso é normal e é a fase mais rápida de evoluir, desde que você construa o repertório certo, e não qualquer repertório.",
      bottleneckTitle: "Base ainda em construção",
      bottleneckDesc: "Você ainda não tem uma base sólida de inglês de alta frequência — o vocabulário e as estruturas que aparecem o tempo todo em conversas reais.",
      missionBase: "Construir uma base utilizável de inglês de alta frequência para começar a se comunicar em situações reais.",
    },
    building: {
      key: "building",
      title: "THE BUILDING SPEAKER",
      levelLabel: "A2",
      headline: "Você já se vira. Agora precisa deixar de depender do básico.",
      body: "Você já consegue se comunicar em situações simples, mas seu repertório ainda é limitado — e isso te deixa recorrendo sempre às mesmas frases prontas.",
      bottleneckTitle: "Repertório limitado",
      bottleneckDesc: "Você já se comunica no básico, mas trava quando a conversa exige mais do que frases prontas.",
      missionBase: "Expandir seu repertório para deixar de depender sempre das mesmas frases e estruturas.",
    },
    stuck: {
      key: "stuck",
      title: "THE STUCK INTERMEDIATE",
      levelLabel: "A2/B1",
      headline: "Você entende mais inglês do que consegue usar.",
      body: "Você já possui inglês suficiente para se comunicar em diversas situações. Seu principal problema não é entender. É falta de prática real e feedback personalizado.",
      bottleneckTitle: "Active English",
      bottleneckDesc: "Você reconhece mais inglês do que consegue produzir espontaneamente.",
      missionBase: "Transformar vocabulário passivo em vocabulário ativo para falar de forma natural.",
    },
    capable: {
      key: "capable",
      title: "THE CAPABLE BUT INCONSISTENT",
      levelLabel: "B2+",
      headline: "Seu inglês funciona. Sua rotina, não.",
      body: "Você já consegue se comunicar bem na maior parte das situações. O que falta não é nível — é consistência, precisão e uma direção clara para os próximos passos.",
      bottleneckTitle: "Falta de consistência e direção",
      bottleneckDesc: "Você já se comunica bem, mas sem uma rotina clara isso avança e recua com facilidade.",
      missionBase: "Criar consistência e direção para transformar fluência ocasional em fluência confiável.",
    },
  };

  const OFFER_BENEFITS = [
    { key: "next_step", title: "Saiba qual é seu próximo passo", desc: "Sem precisar montar uma rotina nova toda semana." },
    { key: "active_practice", title: "Transforme inglês passivo em prática real", desc: "Use o que assiste, lê e aprende em atividades de speaking, listening, reading e writing." },
    { key: "consistency", title: "Construa consistência", desc: "Siga um sistema pensado para fazer o inglês entrar na sua rotina." },
    { key: "progress", title: "Veja sua evolução", desc: "Acompanhe sua prática e progresso ao longo do caminho." },
  ];

  const ROADMAP_MOCKUPS = [
    { src: "images/roadmap-mockup-overview.jpg", alt: "Página geral do English Roadmap com o plano organizado por trilhas", caption: "Seu mapa completo, em um só lugar" },
    { src: "images/roadmap-mockup-calendar.jpg", alt: "Calendário mês a mês do English Roadmap", caption: "Progresso organizado mês a mês" },
    { src: "images/roadmap-mockup-vocabulary.jpg", alt: "Guias de vocabulário por tema do English Roadmap", caption: "Vocabulário por tema, pronto para praticar" },
    { src: "images/roadmap-mockup-recommendations.jpg", alt: "Recomendações de conteúdos do English Roadmap por nível", caption: "Filmes, séries e canais recomendados para o seu nível" },
  ];

  const OBSTACLE_OFFER = {
    no_direction: {
      headlineLines: ["Você não precisa estudar mais.", "Precisa saber o que estudar."],
      paragraphs: [
        "Pelo seu diagnóstico, seu maior obstáculo hoje é falta de direção.",
        "Você já estuda inglês. O problema é que vídeos, aplicativos, dicas e exercícios acabam virando pedaços soltos que não levam você claramente do ponto A ao ponto B.",
      ],
      highlight: "next_step",
    },
    consistency: {
      headlineLines: ["Seu problema não é começar.", "É conseguir continuar."],
      paragraphs: [
        "Pelo seu diagnóstico, seu maior obstáculo hoje é manter consistência.",
        "Você já sabe o que fazer, mas sem um sistema simples de seguir, a rotina de inglês é a primeira coisa que cai quando a semana fica corrida.",
      ],
      highlight: "consistency",
    },
    no_progress: {
      headlineLines: ["Você não para de estudar.", "Só não sente isso virar progresso."],
      paragraphs: [
        "Pelo seu diagnóstico, seu maior obstáculo hoje é não ter como medir se está evoluindo.",
        "Sem um caminho claro e uma forma de acompanhar sua prática, é fácil sentir que está andando em círculos — mesmo estudando toda semana.",
      ],
      highlight: "progress",
    },
    gap: {
      headlineLines: ["Você já entende mais inglês", "do que consegue usar."],
      paragraphs: [
        "Pelo seu diagnóstico, seu maior obstáculo hoje é transformar o que você entende em fala real.",
        "Isso não se resolve assistindo mais conteúdo. Se resolve praticando produção — falar, escrever e responder em situações reais, com direção.",
      ],
      highlight: "active_practice",
    },
    vocabulary: {
      headlineLines: ["Não é falta de esforço.", "É falta do repertório certo."],
      paragraphs: [
        "Pelo seu diagnóstico, seu maior obstáculo hoje é vocabulário — principalmente o de alta frequência para o seu dia a dia.",
        "Estudar palavras soltas não ajuda muito. O que funciona é aprender o vocabulário certo, no contexto certo, e praticar até ele virar automático.",
      ],
      highlight: "active_practice",
    },
    no_time: {
      headlineLines: ["Você não precisa de mais tempo.", "Precisa de mais direção no tempo que já tem."],
      paragraphs: [
        "Pelo seu diagnóstico, seu maior obstáculo hoje é encaixar o inglês numa rotina apertada.",
        "Sem um sistema simples, cada sessão de estudo vira uma decisão nova: o que estudar, como, por quanto tempo. Isso cansa mais do que o próprio estudo.",
      ],
      highlight: "consistency",
    },
    no_practice: {
      headlineLines: ["Você está consumindo inglês.", "Agora precisa começar a usá-lo."],
      paragraphs: [
        "Pelo seu diagnóstico, seu maior obstáculo hoje é transformar consumo em prática.",
        "Filmes, séries, posts e vídeos ajudam — mas sozinhos não ensinam você a usar o idioma. Falta o passo de praticar de verdade o que você absorve.",
      ],
      highlight: "active_practice",
    },
    other: {
      headlineLines: ["Você já tem inglês.", "Falta um caminho para usá-lo melhor."],
      paragraphs: [
        "Pelo seu diagnóstico, o que mais te trava hoje é algo bem específico da sua jornada.",
        "Isso não se resolve com mais conteúdo solto. Se resolve com um caminho claro, passo a passo, adaptado ao seu objetivo.",
      ],
      highlight: "next_step",
    },
  };

  function getOfferVariant() {
    const variant = OBSTACLE_OFFER[state.answers.obstacle] || OBSTACLE_OFFER.no_direction;
    if (state.answers.obstacle === "other" && state.answers.obstacleOther) {
      const custom = Object.assign({}, variant);
      custom.paragraphs = [
        `Pelo seu diagnóstico, o que mais te trava hoje é: "${state.answers.obstacleOther}".`,
        variant.paragraphs[1],
      ];
      return custom;
    }
    return variant;
  }

  /* ------------------------------------------------------------------
   * SCORING / PROFILE LOGIC
   * ------------------------------------------------------------------ */
  function computeResults() {
    const a = state.answers;
    const freeTexts = [a.name, a.location, a.job, a.hobbies, a.brazilRecommendation, a.boss1, a.boss2, a.boss3].filter(Boolean);
    const totalWords = freeTexts.reduce((sum, t) => sum + wordCount(t), 0);
    const avgWords = freeTexts.length ? totalWords / freeTexts.length : 0;

    // communication
    let communication = clamp(Math.round(avgWords * 1.15), 1, 10);
    const painInfo = PAIN_OPTIONS.find((p) => p.key === a.pain);
    if (painInfo && painInfo.key === "freeze") communication = clamp(communication - 1, 1, 10);

    // vocabulary
    const allWords = freeTexts.join(" ").toLowerCase().replace(/[^\wà-ú\s]/gi, "").split(/\s+/).filter(Boolean);
    const uniqueWords = new Set(allWords).size;
    const totalW = allWords.length || 1;
    const diversity = uniqueWords / totalW;
    let vocabulary = clamp(Math.round(diversity * 5 + uniqueWords / 6), 1, 10);
    if (painInfo) vocabulary = clamp(vocabulary - painInfo.vocabPenalty, 1, 10);

    // listening
    let listening;
    if (a.listeningSkipped === "didnt_understand") listening = 3;
    else if (a.listeningSkipped === "cant_answer") listening = 2;
    else listening = clamp(Math.round(wordCount(a.listeningReply) * 1.3), 3, 10);

    // spontaneity
    let spontaneity = painInfo ? painInfo.spontaneity : 5;
    if (a.listeningSkipped) spontaneity = clamp(spontaneity - 1, 1, 10);
    if (avgWords > 8) spontaneity = clamp(spontaneity + 1, 1, 10);
    spontaneity = clamp(spontaneity, 1, 10);

    state.scores = { communication, vocabulary, listening, spontaneity };

    const avg = (communication + vocabulary + listening + spontaneity) / 4;
    const productionAvg = (communication + vocabulary + spontaneity) / 3;
    const gap = listening - productionAvg;

    let key;
    if (avg < 3.5) key = "beginner";
    else if (avg < 5.5) key = "building";
    else if (gap >= 1.3) key = "stuck";
    else if (avg >= 6.5) key = "capable";
    else key = "stuck";

    state.profile = Object.assign({}, PROFILES[key]);
    return state.profile;
  }

  function goalLabels() {
    return state.answers.goals.map((k) => {
      if (k === "other") return state.answers.goalOther || "seu objetivo";
      const g = GOALS.find((x) => x.key === k);
      return g ? g.label.toLowerCase() : k;
    });
  }

  function goalPriorityPhrase() {
    const phrases = state.answers.goals.map((k) => {
      const g = GOALS.find((x) => x.key === k);
      if (!g) return "";
      if (k === "other") return "uma rotina alinhada com " + (state.answers.goalOther || "o que você definiu");
      return g.priority;
    }).filter(Boolean);
    if (!phrases.length) return "prática real, vocabulário ativo e situações reais de comunicação";
    return phrases.join(" e também ");
  }

  function missionSentence() {
    const goals = goalLabels();
    const goalText = goals.length ? goals.join(" e ") : "evoluir no inglês";
    return `Como seu objetivo é ${goalText}, seu próximo ciclo deveria priorizar ${goalPriorityPhrase()}.`;
  }

  /* ------------------------------------------------------------------
   * SHARED SMALL COMPONENTS
   * ------------------------------------------------------------------ */
  function checkIconSvg() {
    return '<svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }

  function exitRow() {
    return `<div class="exit-row"><button class="exit-link" id="exitBtn" type="button">Sair</button></div>`;
  }

  function bindExit() {
    const btn = qs("#exitBtn");
    if (btn) btn.addEventListener("click", () => { if (confirm("Sair do diagnóstico? Seu progresso será perdido.")) goToLanding(); });
  }

  /* ------------------------------------------------------------------
   * SCREEN: LANDING
   * ------------------------------------------------------------------ */
  function renderLanding() {
    state.stage = "landing";
    setProgress(0, false);
    track("landing_view");
    render(`
      <section class="hero">
        <div class="hero-text">
          <div class="hero-eyebrow">DIAGNÓSTICO GRATUITO · ~3 MINUTOS</div>
          <h1>Você realmente sabe o que está <em>travando</em> o seu inglês?</h1>
          <p class="sub">Enfrente algumas situações reais em inglês e descubra seu nível estimado, seu principal gargalo e o próximo passo para evoluir.</p>
          <div class="hero-actions">
            <button class="btn btn-primary" id="heroCta" type="button">DESCOBRIR MEU DIAGNÓSTICO →</button>
            <div class="microcopy">Gratuito<span class="dot">·</span>Sem prova de gramática<span class="dot">·</span>Resultado personalizado</div>
          </div>
        </div>
        <div class="map-card">
          <div class="map-card-head">
            <p class="eyebrow">YOUR ENGLISH MAP</p>
            <svg class="map-compass" width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.2"/><path d="M15.2 8.8L13 13L8.8 15.2L11 11L15.2 8.8Z" fill="currentColor"/></svg>
          </div>
          <div class="map-skills">
            ${["Communication", "Vocabulary", "Listening", "Spontaneity"].map(s => `
              <div class="map-skill-row">
                <div class="map-skill-label"><span>${s}</span><span class="q">?</span></div>
                <div class="map-bar-track"><div class="map-bar-fill" style="width:${rand(25,70)}%"></div></div>
              </div>
            `).join("")}
          </div>
          <p class="map-footer-note">Seu mapa será revelado ao final.</p>
        </div>
      </section>
      <footer class="site-footer">© MyLore — Diagnóstico orientativo, não é certificação oficial.</footer>
    `);
    qs("#heroCta").addEventListener("click", startDiagnosis);
  }

  function startDiagnosis() {
    track("diagnosis_start");
    renderIntro();
  }

  /* ------------------------------------------------------------------
   * SCREEN: DIAGNOSIS INTRO
   * ------------------------------------------------------------------ */
  function renderIntro() {
    state.stage = "intro";
    setProgress(4);
    render(`
      <div class="stage-shell">
        ${exitRow()}
        <div class="intro-screen">
          <svg class="compass-spin" width="40" height="40" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.1"/><path d="M15.2 8.8L13 13L8.8 15.2L11 11L15.2 8.8Z" fill="currentColor"/></svg>
          <h2>Let's see what your English can actually do.</h2>
          <p>Você vai enfrentar algumas situações reais em inglês. Não é uma prova de gramática. Não tem pegadinha. Apenas responda como você responderia na vida real.</p>
          <button class="btn btn-primary" id="startBtn" type="button">START →</button>
          <div class="intro-tag">~3 min</div>
        </div>
      </div>
    `);
    bindExit();
    qs("#startBtn").addEventListener("click", () => runEmmaConversation());
  }

  function goToLanding() { renderLanding(); }

  /* ------------------------------------------------------------------
   * CONVERSATION ENGINE (shared by Emma stage & Boss battle)
   * ------------------------------------------------------------------ */
  function renderChatShell(character, extraClass) {
    return `
      <div class="stage-shell">
        ${extraClass === "boss" ? "" : exitRow()}
        <div class="phone-frame ${extraClass || ""}">
          <div class="chat-header">
            <div class="chat-avatar ${extraClass === "boss" ? "james" : ""}">${character.initial}</div>
            <div class="chat-id">
              <strong>${character.name}</strong>
              <span>${character.location}</span>
            </div>
            <div class="chat-online">online</div>
          </div>
          <div class="chat-body" id="chatBody"></div>
          <div class="chat-input-row" id="chatInputRow"></div>
        </div>
      </div>
    `;
  }

  function chatBody() { return qs("#chatBody"); }
  function chatInputRow() { return qs("#chatInputRow"); }

  function scrollChatToBottom() {
    const body = chatBody();
    if (body) body.scrollTop = body.scrollHeight + 200;
  }

  async function showTyping() {
    const row = document.createElement("div");
    row.className = "typing-row";
    row.innerHTML = `<div class="typing-bubble"><span></span><span></span><span></span></div>`;
    chatBody().appendChild(row);
    scrollChatToBottom();
    await delay(rand(700, 1100));
    row.remove();
  }

  async function appendBotMessage(text) {
    await showTyping();
    const row = document.createElement("div");
    row.className = "bubble-row bot";
    row.innerHTML = `<div class="bubble">${escapeHtml(text)}</div>`;
    chatBody().appendChild(row);
    scrollChatToBottom();
    await delay(350);
  }

  function appendUserMessage(text) {
    const row = document.createElement("div");
    row.className = "bubble-row user";
    row.innerHTML = `<div class="bubble">${escapeHtml(text)}</div>`;
    chatBody().appendChild(row);
    scrollChatToBottom();
  }

  function appendFeedbackToast(text) {
    const row = document.createElement("div");
    row.className = "feedback-toast";
    row.textContent = text;
    chatBody().appendChild(row);
    scrollChatToBottom();
  }

  function appendTipToast(text) {
    const row = document.createElement("div");
    row.className = "tip-toast";
    row.innerHTML = `<span class="tip-emoji">💬</span>${escapeHtml(text)}`;
    chatBody().appendChild(row);
    scrollChatToBottom();
  }

  function renderTextInput(placeholder) {
    chatInputRow().innerHTML = `
      <form class="chat-input-form" id="chatForm" autocomplete="off">
        <input type="text" id="chatInput" placeholder="${escapeHtml(placeholder)}" maxlength="240" />
        <button type="submit" class="chat-send" id="chatSend" aria-label="Enviar">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M4 12L20 4L14 20L11 13L4 12Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" fill="currentColor" fill-opacity="0.15"/></svg>
        </button>
      </form>
    `;
    const input = qs("#chatInput");
    input.focus();
    return new Promise((resolve) => {
      qs("#chatForm").addEventListener("submit", (e) => {
        e.preventDefault();
        const val = input.value.trim();
        if (!val) return;
        chatInputRow().innerHTML = "";
        resolve(val);
      });
    });
  }

  async function runUserStep(step) {
    const value = await renderTextInput(step.placeholder || "Type your reply…");
    appendUserMessage(value);
    state.answers[step.key] = value;
    if (step.firstFeedback) {
      await delay(300);
      appendFeedbackToast("✓ Nice — your message was clear.");
    }
    if (step.tipAfter) {
      await delay(500);
      appendTipToast(step.tipAfter);
      await delay(1600);
    }
    await delay(300);
  }

  const EMMA_AUDIO_SRC = "audio/emma-objective.mp3";

  function formatTime(sec) {
    if (!isFinite(sec) || sec < 0) sec = 0;
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return m + ":" + String(s).padStart(2, "0");
  }

  function renderAudioBubble() {
    const bars = Array.from({ length: 24 }).map(() => `<span style="height:${rand(30,100)}%"></span>`).join("");
    const row = document.createElement("div");
    row.className = "bubble-row bot";
    row.innerHTML = `
      <div class="audio-bubble">
        <audio id="audioEl" src="${EMMA_AUDIO_SRC}" preload="metadata"></audio>
        <button class="audio-play" id="audioPlayBtn" type="button" aria-label="Play">
          <svg id="playIcon" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 4L20 12L6 20V4Z"/></svg>
          <svg id="pauseIcon" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="display:none"><rect x="5" y="4" width="5" height="16"/><rect x="14" y="4" width="5" height="16"/></svg>
        </button>
        <div class="audio-wave">
          <div class="audio-wave-bars">${bars}</div>
          <div class="audio-wave-progress" id="audioProgress"></div>
        </div>
        <div class="audio-time" id="audioTime">0:00</div>
      </div>
    `;
    chatBody().appendChild(row);
    scrollChatToBottom();

    const audio = qs("#audioEl");
    const playBtn = qs("#audioPlayBtn");
    const playIcon = qs("#playIcon");
    const pauseIcon = qs("#pauseIcon");
    const progress = qs("#audioProgress");
    const timeEl = qs("#audioTime");

    audio.addEventListener("loadedmetadata", () => {
      if (isFinite(audio.duration)) timeEl.textContent = formatTime(audio.duration);
    });
    audio.addEventListener("timeupdate", () => {
      if (audio.duration) {
        progress.style.width = (audio.currentTime / audio.duration) * 100 + "%";
        timeEl.textContent = formatTime(Math.max(0, audio.duration - audio.currentTime));
      }
    });
    audio.addEventListener("ended", () => {
      playIcon.style.display = "";
      pauseIcon.style.display = "none";
      progress.style.width = "100%";
      if (isFinite(audio.duration)) timeEl.textContent = formatTime(audio.duration);
    });
    audio.addEventListener("pause", () => {
      playIcon.style.display = "";
      pauseIcon.style.display = "none";
    });
    audio.addEventListener("play", () => {
      playIcon.style.display = "none";
      pauseIcon.style.display = "";
    });

    playBtn.addEventListener("click", () => {
      if (audio.paused) {
        if (audio.ended) audio.currentTime = 0;
        audio.play().catch(() => {});
      } else {
        audio.pause();
      }
    });
  }

  async function runAudioStep(step) {
    await showTyping();
    renderAudioBubble();
    await delay(300);
    const questionRow = document.createElement("div");
    questionRow.className = "bubble-row bot";
    questionRow.innerHTML = `<div class="bubble">Reply to Emma.</div>`;
    chatBody().appendChild(questionRow);
    scrollChatToBottom();

    chatInputRow().innerHTML = `
      <div class="chat-alt-actions">
        <button class="chat-alt-btn" id="btnDidntUnderstand" type="button">😕 Não entendi</button>
        <button class="chat-alt-btn" id="btnCantAnswer" type="button">🤐 Não consigo responder</button>
      </div>
      <form class="chat-input-form" id="chatForm" autocomplete="off">
        <input type="text" id="chatInput" placeholder="Type your reply…" maxlength="240" />
        <button type="submit" class="chat-send" id="chatSend" aria-label="Enviar">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M4 12L20 4L14 20L11 13L4 12Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" fill="currentColor" fill-opacity="0.15"/></svg>
        </button>
      </form>
    `;
    qs("#chatInput").focus();

    return new Promise((resolve) => {
      qs("#chatForm").addEventListener("submit", (e) => {
        e.preventDefault();
        const val = qs("#chatInput").value.trim();
        if (!val) return;
        chatInputRow().innerHTML = "";
        appendUserMessage(val);
        state.answers.listeningReply = val;
        state.answers.listeningSkipped = null;
        resolve();
      });
      qs("#btnDidntUnderstand").addEventListener("click", () => {
        chatInputRow().innerHTML = "";
        appendUserMessage("😕 I didn't quite understand.");
        state.answers.listeningSkipped = "didnt_understand";
        resolve();
      });
      qs("#btnCantAnswer").addEventListener("click", () => {
        chatInputRow().innerHTML = "";
        appendUserMessage("🤐 I can't answer right now.");
        state.answers.listeningSkipped = "cant_answer";
        resolve();
      });
    });
  }

  const EMMA_SCRIPT = [
    { type: "bot", text: "Hey! Nice to meet you :) I'm Emma. What's your name?" },
    { type: "user", key: "name", placeholder: "Type your reply…", firstFeedback: true },
    { type: "bot", text: "Nice to meet you! Where are you from?" },
    { type: "user", key: "location", placeholder: "Type your reply…" },
    { type: "bot", text: "Cool! What do you work with?" },
    { type: "user", key: "job", placeholder: "Type your reply…" },
    { type: "progress-mark", value: 22, event: "stage_1_complete" },
    { type: "bot", text: "Oh cool! And what are your hobbies?" },
    { type: "user", key: "hobbies", placeholder: "Type your reply…" },
    { type: "bot", text: "Nice! I'm thinking about visiting Brazil next year. Where should I go?" },
    { type: "user", key: "brazilRecommendation", placeholder: "Type your reply…" },
    { type: "progress-mark", value: 36 },
    { type: "audio" },
    { type: "progress-mark", value: 46, event: "listening_complete" },
  ];

  const JAMES_SCRIPT = [
    { type: "bot", text: "Hey, I don't think we've met before. What's up?" },
    { type: "user", key: "boss1", placeholder: "Type your reply…", tipAfter: "Normalmente respondemos a pergunta \"What's up?\" com \"Not much!\"" },
    { type: "bot", text: "Oh, nice. So what brings you to London?" },
    { type: "user", key: "boss2", placeholder: "Type your reply…" },
    { type: "bot", text: "That's cool. What have you enjoyed most about the city so far?" },
    { type: "user", key: "boss3", placeholder: "Type your reply…" },
  ];

  async function runScript(script) {
    for (const step of script) {
      if (step.type === "bot") await appendBotMessage(step.text);
      else if (step.type === "user") await runUserStep(step);
      else if (step.type === "audio") await runAudioStep(step);
      else if (step.type === "progress-mark") {
        setProgress(step.value);
        if (step.event) track(step.event);
      }
    }
  }

  async function runEmmaConversation() {
    state.stage = "chat1";
    render(renderChatShell({ initial: "E", name: "Emma Austin", location: "USA" }));
    bindExit();
    setProgress(10);
    await delay(200);
    await runScript(EMMA_SCRIPT);
    await delay(600);
    renderPainRecognition();
  }

  /* ------------------------------------------------------------------
   * SCREEN: PAIN RECOGNITION (FIRST INSIGHT)
   * ------------------------------------------------------------------ */
  function renderPainRecognition() {
    state.stage = "pain";
    setProgress(52);
    render(`
      <div class="stage-shell">
        ${exitRow()}
        <div class="card-screen">
          <p class="eyebrow">INTERESTING.</p>
          <h2>Você conseguiu se comunicar. Mas queremos entender uma coisa.</h2>
          <p class="lede">Quando você precisa responder em inglês sem se preparar, o que geralmente acontece?</p>
          <div class="option-list" id="painList">
            ${PAIN_OPTIONS.map((opt) => `
              <button class="option-row" data-key="${opt.key}" type="button">
                <span class="option-check">${checkIconSvg()}</span>
                <span>${opt.label}</span>
              </button>
            `).join("")}
          </div>
          <p class="reveal-note" id="painReveal" hidden>Isso ajuda a entender a diferença entre o inglês que você reconhece e o inglês que consegue usar.</p>
          <div class="card-cta-row">
            <button class="btn btn-primary btn-full" id="painContinue" type="button" disabled>CONTINUAR →</button>
          </div>
        </div>
      </div>
    `);
    bindExit();

    qsa(".option-row", qs("#painList")).forEach((btn) => {
      btn.addEventListener("click", () => {
        qsa(".option-row", qs("#painList")).forEach((b) => b.classList.remove("selected"));
        btn.classList.add("selected");
        const opt = PAIN_OPTIONS.find((o) => o.key === btn.dataset.key);
        state.answers.pain = opt.key;
        state.answers.painLabel = opt.label;
        qs("#painReveal").hidden = false;
        qs("#painContinue").disabled = false;
        track("pain_selected", { pain: opt.key });
      });
    });
    qs("#painContinue").addEventListener("click", renderGoalSelection);
  }

  /* ------------------------------------------------------------------
   * SCREEN: GOAL SELECTION
   * ------------------------------------------------------------------ */
  function renderGoalSelection() {
    state.stage = "goals";
    setProgress(60);
    render(`
      <div class="stage-shell">
        ${exitRow()}
        <div class="card-screen">
          <p class="eyebrow">SEU DESTINO</p>
          <h2>Se seu inglês estivesse exatamente como você gostaria daqui a 12 meses, o que você conseguiria fazer?</h2>
          <p class="goal-hint">Escolha até 2 opções.</p>
          <div class="goal-grid" id="goalGrid">
            ${GOALS.map((g) => `
              <button class="goal-card" data-key="${g.key}" type="button">
                <span class="goal-icon">${g.icon}</span>
                <span class="goal-label">${g.label}</span>
              </button>
            `).join("")}
          </div>
          <input type="text" class="other-input" id="goalOtherInput" placeholder="Qual é o seu objetivo?" hidden />
          <div class="card-cta-row" style="margin-top:22px;">
            <button class="btn btn-primary btn-full" id="goalContinue" type="button" disabled>CONTINUAR →</button>
          </div>
        </div>
      </div>
    `);
    bindExit();

    const otherInput = qs("#goalOtherInput");
    function updateContinue() {
      qs("#goalContinue").disabled = state.answers.goals.length === 0;
    }

    qsa(".goal-card", qs("#goalGrid")).forEach((card) => {
      card.addEventListener("click", () => {
        const key = card.dataset.key;
        const idx = state.answers.goals.indexOf(key);
        if (idx > -1) {
          state.answers.goals.splice(idx, 1);
          card.classList.remove("selected");
        } else {
          if (state.answers.goals.length >= 2) return;
          state.answers.goals.push(key);
          card.classList.add("selected");
        }
        otherInput.hidden = !state.answers.goals.includes("other");
        if (!otherInput.hidden) otherInput.focus();
        updateContinue();
      });
    });
    otherInput.addEventListener("input", () => { state.answers.goalOther = otherInput.value.trim(); });

    qs("#goalContinue").addEventListener("click", () => {
      track("goal_selected", { goals: state.answers.goals.join(",") });
      renderObstacleSelection();
    });
  }

  /* ------------------------------------------------------------------
   * SCREEN: OBSTACLE SELECTION
   * ------------------------------------------------------------------ */
  function renderObstacleSelection() {
    state.stage = "obstacle";
    setProgress(70);
    render(`
      <div class="stage-shell">
        ${exitRow()}
        <div class="card-screen">
          <p class="eyebrow">O QUE TE SEGURA</p>
          <h2>E o que mais te impede de chegar lá hoje?</h2>
          <div class="option-list" id="obstacleList">
            ${OBSTACLES.map((o) => `
              <button class="option-row" data-key="${o.key}" type="button">
                <span class="option-check">${checkIconSvg()}</span>
                <span>${o.label}</span>
              </button>
            `).join("")}
          </div>
          <input type="text" class="other-input" id="obstacleOtherInput" placeholder="Conte com suas palavras…" hidden style="margin-bottom:24px;" />
          <div class="card-cta-row">
            <button class="btn btn-primary btn-full" id="obstacleContinue" type="button" disabled>CONTINUAR →</button>
          </div>
        </div>
      </div>
    `);
    bindExit();

    const otherInput = qs("#obstacleOtherInput");
    qsa(".option-row", qs("#obstacleList")).forEach((btn) => {
      btn.addEventListener("click", () => {
        qsa(".option-row", qs("#obstacleList")).forEach((b) => b.classList.remove("selected"));
        btn.classList.add("selected");
        const opt = OBSTACLES.find((o) => o.key === btn.dataset.key);
        state.answers.obstacle = opt.key;
        otherInput.hidden = opt.key !== "other";
        if (opt.key === "other") otherInput.focus();
        qs("#obstacleContinue").disabled = false;
      });
    });
    otherInput.addEventListener("input", () => { state.answers.obstacleOther = otherInput.value.trim(); });

    qs("#obstacleContinue").addEventListener("click", () => {
      track("obstacle_selected", { obstacle: state.answers.obstacle });
      renderBossBattle();
    });
  }

  /* ------------------------------------------------------------------
   * SCREEN: BOSS BATTLE
   * ------------------------------------------------------------------ */
  function renderBossBattle() {
    state.stage = "boss";
    setProgress(80);
    track("boss_battle_start");
    render(`
      <div class="stage-shell">
        <div class="boss-intro">
          <p class="eyebrow">FINAL CHALLENGE</p>
          <h2>Última missão antes do Protocolo.</h2>
          <p class="boss-scene">You're at a party in London.</p>
        </div>
        ${renderChatShell({ initial: "J", name: "James", location: "London, UK" }, "boss")}
      </div>
    `);
    setProgress(80);
    (async () => {
      await delay(300);
      await runScript(JAMES_SCRIPT);
      const finishWrap = document.createElement("div");
      finishWrap.className = "finish-cta-wrap";
      finishWrap.innerHTML = `<button class="btn btn-primary btn-full" id="finishBtn" type="button">FINISH DIAGNOSIS →</button>`;
      qs(".stage-shell").appendChild(finishWrap);
      qs("#finishBtn").addEventListener("click", () => {
        track("diagnosis_complete");
        renderAnalysis();
      });
    })();
  }

  /* ------------------------------------------------------------------
   * SCREEN: ANALYSIS LOADING
   * ------------------------------------------------------------------ */
  function renderAnalysis() {
    state.stage = "analysis";
    setProgress(96);
    const items = ["Communication", "Vocabulary", "Comprehension", "Spontaneity", "Learning profile"];
    render(`
      <div class="stage-shell">
        <div class="analysis-screen">
          <svg class="route-svg" width="120" height="60" viewBox="0 0 120 60" fill="none">
            <path class="route-path" d="M6 50 C 30 10, 50 50, 74 20 S 110 10, 114 30" stroke="#B88A46" stroke-width="1.6" fill="none" stroke-linecap="round"/>
          </svg>
          <h2>Analyzing your English…</h2>
          <p class="sub">Estamos comparando suas respostas, compreensão e perfil.</p>
          <div class="analysis-list" id="analysisList">
            ${items.map((it) => `
              <div class="analysis-item" data-item>
                <span class="analysis-check">${checkIconSvg()}</span>
                <span>${it}</span>
              </div>
            `).join("")}
          </div>
          <p class="analysis-building" id="buildingText" hidden>Building your English Map…</p>
        </div>
      </div>
    `);

    computeResults();
    saveResponseToSheet();

    (async () => {
      const nodes = qsa("[data-item]", qs("#analysisList"));
      for (const node of nodes) {
        await delay(rand(450, 700));
        node.classList.add("done");
      }
      await delay(300);
      qs("#buildingText").hidden = false;
      await delay(1000);
      renderResult();
    })();
  }

  /* ------------------------------------------------------------------
   * SCREEN: RESULT
   * ------------------------------------------------------------------ */
  const SKILL_LABELS = [
    { key: "communication", label: "Comunicação" },
    { key: "vocabulary", label: "Vocabulário" },
    { key: "listening", label: "Escuta" },
    { key: "spontaneity", label: "Naturalidade" },
  ];

  function renderResult() {
    state.stage = "result";
    setProgress(100);
    const p = state.profile;
    track("result_view");

    render(`
      <div class="stage-shell result-screen">
        <div class="result-badge">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.3"/><path d="M15.2 8.8L13 13L8.8 15.2L11 11L15.2 8.8Z" fill="currentColor"/></svg>
          YOUR ENGLISH PROFILE
        </div>
        <h1 class="result-title serif">${p.title}</h1>
        <div class="level-tag">Estimated level: <strong>${p.levelLabel}</strong></div>
        <p class="result-headline">${p.headline}</p>
        <p class="result-body">${p.body}</p>

        <div class="section-block">
          <h3 class="block-title">SKILL MAP</h3>
          <div class="skill-map" id="skillMap">
            ${SKILL_LABELS.map((s) => `
              <div class="skill-row">
                <div class="skill-row-label"><span>${s.label}</span><span class="score">${state.scores[s.key]}/10</span></div>
                <div class="skill-bar-track"><div class="skill-bar-fill" data-target="${state.scores[s.key] * 10}" style="width:0%"></div></div>
              </div>
            `).join("")}
          </div>
        </div>

        <div class="section-block">
          <h3 class="block-title">SEU PRINCIPAL GARGALO</h3>
          <div class="insight-card">
            <p class="insight-tag">"${p.bottleneckTitle}"</p>
            <p>${p.bottleneckDesc}</p>
          </div>
        </div>

        <div class="section-block">
          <h3 class="block-title">YOUR NEXT MISSION</h3>
          <div class="insight-card">
            <p style="font-family:var(--serif);font-style:italic;font-size:16px;color:var(--charcoal);margin-bottom:10px;">${p.missionBase}</p>
            <p>${missionSentence()}</p>
          </div>
        </div>

        <p class="disclaimer">Este é um diagnóstico orientativo, não uma certificação oficial de proficiência.</p>

        <div class="result-cta-wrap">
          <p class="prompt">Então… o que eu faço com isso agora?</p>
          <button class="btn btn-primary btn-full" id="lookSolutionsBtn" type="button">OLHAR SOLUÇÕES →</button>
        </div>
      </div>
    `);

    requestAnimationFrame(() => {
      qsa(".skill-bar-fill", qs("#skillMap")).forEach((el, i) => {
        setTimeout(() => { el.style.width = el.dataset.target + "%"; }, 150 + i * 120);
      });
    });

    qs("#lookSolutionsBtn").addEventListener("click", renderOffer);
  }

  /* ------------------------------------------------------------------
   * SCREEN: OFFER
   * ------------------------------------------------------------------ */
  function renderOffer() {
    state.stage = "offer";
    const variant = getOfferVariant();
    track("offer_view");
    render(`
      <div class="stage-shell offer-screen">
        <div class="offer-narrative">
          <p class="eyebrow">YOUR DIAGNOSIS</p>
          <h1 class="offer-headline serif">${variant.headlineLines.map(escapeHtml).join("<br>")}</h1>
          ${variant.paragraphs.map((t) => `<p>${escapeHtml(t)}</p>`).join("")}
        </div>

        <div class="offer-mission">
          <p class="eyebrow">YOUR NEXT MISSION</p>
          <h2 class="offer-mission-title serif">🗺️ English Roadmap</h2>
          <p class="offer-mission-tag">Pare de tentar descobrir sozinho o que estudar. Tenha um caminho para seguir.</p>
          <p class="offer-mission-desc">Um sistema passo a passo para transformar seu objetivo em uma rotina prática de inglês — sabendo o que fazer agora, o que fazer depois e como acompanhar sua evolução.</p>
        </div>

        <div class="offer-mockups">
          ${ROADMAP_MOCKUPS.map((m) => `
            <figure class="mockup-frame">
              <img src="${m.src}" alt="${escapeHtml(m.alt)}" loading="lazy" />
              <figcaption class="mockup-caption">${escapeHtml(m.caption)}</figcaption>
            </figure>
          `).join("")}
        </div>

        <div class="offer-card">
          <p class="eyebrow">TUDO QUE VOCÊ PRECISA DENTRO DO MAPA</p>

          <ul class="offer-benefits">
            ${OFFER_BENEFITS.map((b) => `
              <li class="${b.key === variant.highlight ? "featured" : ""}">
                <span class="tick">${checkIconSvg()}</span>
                <span><strong>${escapeHtml(b.title)}</strong><br><span class="benefit-desc">${escapeHtml(b.desc)}</span></span>
              </li>
            `).join("")}
          </ul>

          <p class="offer-includes-inline">Plano estruturado de até 12 meses • Sistema de imersão • Estratégias práticas de speaking, listening, reading e writing • 8 guias de vocabulário • Recomendações de filmes, séries, desenhos e canais organizadas por nível • Sistema de acompanhamento</p>

          <p class="offer-punch serif">Você já descobriu onde está.<br>Agora precisa de um caminho para avançar.</p>

          <div class="offer-price-block">
            <p class="offer-price-top-label">Acesso completo + permanente</p>
            <div class="offer-price-row">
              <span class="offer-price">R$ 9,90</span>
              <span class="offer-price-label">pagamento único</span>
            </div>
          </div>

          <button class="btn btn-primary btn-full" id="offerCta" type="button">🔓 DESBLOQUEAR MEU ROADMAP →</button>
          <p class="offer-microcopy">Acesso imediato · Sem mensalidade · Pagamento seguro</p>
        </div>
      </div>
      <footer class="site-footer">© MyLore — Diagnóstico orientativo, não é certificação oficial.</footer>
    `);

    qs("#offerCta").addEventListener("click", () => {
      track("offer_click", { obstacle_variant: state.answers.obstacle });
      window.location.href = "https://pay.kiwify.com.br/UGQ8j4e";
    });
  }

  /* ------------------------------------------------------------------
   * HEADER / MODAL WIRING
   * ------------------------------------------------------------------ */
  function wireGlobalUi() {
    qs("#brandHome").addEventListener("click", (e) => { e.preventDefault(); goToLanding(); });
    qs("#headerCta").addEventListener("click", startDiagnosis);
    const modal = qs("#howItWorksModal");
    qs("#howItWorksBtn").addEventListener("click", () => { modal.hidden = false; });
    qs("#modalClose").addEventListener("click", () => { modal.hidden = true; });
    modal.addEventListener("click", (e) => { if (e.target === modal) modal.hidden = true; });
    qs("#modalStart").addEventListener("click", () => { modal.hidden = true; startDiagnosis(); });
  }

  /* ------------------------------------------------------------------
   * INIT
   * ------------------------------------------------------------------ */
  wireGlobalUi();
  renderLanding();
})();
