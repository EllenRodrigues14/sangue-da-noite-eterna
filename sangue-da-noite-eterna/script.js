    const telaInicial = document.getElementById("telaInicial");
    const telaJogo = document.getElementById("telaJogo");

    const nomeHeroiInput = document.getElementById("nomeHeroi");

    const btnNovoJogo = document.getElementById("btnNovoJogo");
    const btnContinuar = document.getElementById("btnContinuar");
    const btnReiniciar = document.getElementById("btnReiniciar");
    const btnNarracao = document.getElementById("btnNarracao");

    const tituloCapitulo = document.getElementById("tituloCapitulo");
    const subtituloCapitulo = document.getElementById("subtituloCapitulo");
    const textoJogo = document.getElementById("textoJogo");
    const opcoes = document.getElementById("opcoes");

    const statusNome = document.getElementById("statusNome");
    const statusVida = document.getElementById("statusVida");
    const statusMana = document.getElementById("statusMana");
    const statusCorrupcao = document.getElementById("statusCorrupcao");
    const inventarioTexto = document.getElementById("inventarioTexto");

    let dadosIntro = null;
    let dadosHistoria = null;

    let narracaoAtiva = true;
    let digitando = false;

    let jogador = {
    nome: "Herói Sem Nome",
    capituloAtual: 1,
    vida: 100,
    mana: 50,
    corrupcao: 0,
    inventario: ["Espada enferrujada", "Poção pequena"],
    flags: {}
    };

    window.addEventListener("load", iniciarApp);

    async function iniciarApp() {
    await carregarDados();

    const progresso = localStorage.getItem("sangue_noite_eterna_save");

    if (!progresso) {
        btnContinuar.disabled = true;
    }
    }

    async function carregarDados() {
    try {
        const respostaIntro = await fetch("data/intro.json");
        const respostaHistoria = await fetch("data/historia.json");

        if (!respostaIntro.ok || !respostaHistoria.ok) {
        throw new Error("Erro ao carregar arquivos JSON.");
        }

        dadosIntro = await respostaIntro.json();
        dadosHistoria = await respostaHistoria.json();
    } catch (erro) {
        console.error(erro);
        alert("Erro ao carregar os arquivos da história. Rode o projeto em um servidor local.");
    }
    }

    btnNovoJogo.addEventListener("click", async () => {
    const nomeDigitado = nomeHeroiInput.value.trim();

    jogador = {
        nome: nomeDigitado || "Herói Sem Nome",
        capituloAtual: 1,
        vida: 100,
        mana: 50,
        corrupcao: 0,
        inventario: ["Espada enferrujada", "Poção pequena"],
        flags: {}
    };

    salvarProgresso();

    trocarTela(telaInicial, telaJogo);

    await mostrarIntroducao();
    });

    btnContinuar.addEventListener("click", () => {
    carregarProgresso();
    trocarTela(telaInicial, telaJogo);
    mostrarCapitulo(jogador.capituloAtual);
    });

    btnReiniciar.addEventListener("click", () => {
    const confirmar = confirm("Deseja reiniciar a aventura? Todo o progresso será perdido.");

    if (!confirmar) return;

    pararNarracao();

    localStorage.removeItem("sangue_noite_eterna_save");

    location.reload();
    });

    btnNarracao.addEventListener("click", () => {
    narracaoAtiva = !narracaoAtiva;

    btnNarracao.textContent = narracaoAtiva ? "Narração: ON" : "Narração: OFF";

    if (!narracaoAtiva) {
        pararNarracao();
    }
    });

    function trocarTela(telaAtual, proximaTela) {
    telaAtual.classList.remove("tela-ativa");
    proximaTela.classList.add("tela-ativa");
    }

    async function mostrarIntroducao() {
    atualizarStatus();

    tituloCapitulo.textContent = dadosIntro.titulo;
    subtituloCapitulo.textContent = "Prólogo";

    textoJogo.innerHTML = "";
    opcoes.innerHTML = "";

    const textoCompleto = dadosIntro.texto
        .map(paragrafo => personalizarTexto(paragrafo))
        .join("\n\n");

    await escreverTexto(textoCompleto);

    criarBotaoOpcao({
        texto: "Despertar nas cinzas da floresta",
        proximoCapitulo: 1
    });
    }

    function mostrarCapitulo(numeroCapitulo) {
    const capitulo = dadosHistoria.capitulos.find(c => c.capitulo === numeroCapitulo);

    if (!capitulo) {
        mostrarFimAlternativo();
        return;
    }

    jogador.capituloAtual = numeroCapitulo;
    salvarProgresso();
    atualizarStatus();

    tituloCapitulo.textContent = `Capítulo ${capitulo.capitulo}: ${capitulo.titulo}`;
    subtituloCapitulo.textContent = capitulo.subtitulo || "Escolha seu caminho";

    textoJogo.innerHTML = "";
    opcoes.innerHTML = "";

    const textoCompleto = capitulo.texto
        .map(paragrafo => personalizarTexto(paragrafo))
        .join("\n\n");

    escreverTexto(textoCompleto, () => {
        capitulo.escolhas.forEach(escolha => criarBotaoOpcao(escolha));
    });
    }

    function criarBotaoOpcao(escolha) {
    const botao = document.createElement("button");

    botao.textContent = escolha.texto;

    botao.addEventListener("click", () => {
        if (digitando) return;

        aplicarEscolha(escolha);
    });

    opcoes.appendChild(botao);
    }

    async function aplicarEscolha(escolha) {
    opcoes.innerHTML = "";

    if (escolha.efeitos) {
        aplicarEfeitos(escolha.efeitos);
    }

    atualizarStatus();

    if (escolha.resposta) {
        textoJogo.innerHTML = "";

        await escreverTexto(personalizarTexto(escolha.resposta));
    }

    if (escolha.proximoCapitulo) {
        mostrarCapitulo(escolha.proximoCapitulo);
    } else {
        mostrarFimAlternativo();
    }
    }

    function aplicarEfeitos(efeitos) {
    if (typeof efeitos.vida === "number") {
        jogador.vida += efeitos.vida;
    }

    if (typeof efeitos.mana === "number") {
        jogador.mana += efeitos.mana;
    }

    if (typeof efeitos.corrupcao === "number") {
        jogador.corrupcao += efeitos.corrupcao;
    }

    if (efeitos.item) {
        if (!jogador.inventario.includes(efeitos.item)) {
        jogador.inventario.push(efeitos.item);
        }
    }

    if (efeitos.removerItem) {
        jogador.inventario = jogador.inventario.filter(item => item !== efeitos.removerItem);
    }

    if (efeitos.flag) {
        jogador.flags[efeitos.flag] = true;
    }

    jogador.vida = limitarValor(jogador.vida, 0, 100);
    jogador.mana = limitarValor(jogador.mana, 0, 100);
    jogador.corrupcao = limitarValor(jogador.corrupcao, 0, 100);

    if (jogador.vida <= 0) {
        mostrarMorte();
    }

    salvarProgresso();
    }

    function limitarValor(valor, minimo, maximo) {
    return Math.max(minimo, Math.min(maximo, valor));
    }

    function atualizarStatus() {
    statusNome.textContent = jogador.nome;
    statusVida.textContent = jogador.vida;
    statusMana.textContent = jogador.mana;
    statusCorrupcao.textContent = jogador.corrupcao;

    inventarioTexto.textContent = jogador.inventario.length
        ? jogador.inventario.join(", ")
        : "Vazio";
    }

    function escreverTexto(texto, callback) {
    return new Promise(resolve => {
        digitando = true;

        pararNarracao();

        textoJogo.innerHTML = "";

        let i = 0;
        const velocidade = 24;

        if (narracaoAtiva) {
        falarTexto(texto);
        }

        function digitar() {
        if (i < texto.length) {
            textoJogo.innerHTML += texto.charAt(i);
            i++;
            setTimeout(digitar, velocidade);
        } else {
            digitando = false;

            if (callback) callback();

            resolve();
        }
        }

        digitar();
    });
    }

    function falarTexto(texto) {
    if (!("speechSynthesis" in window)) return;

    const voz = new SpeechSynthesisUtterance(texto);

    voz.lang = "pt-BR";
    voz.rate = 0.95;
    voz.pitch = 0.8;
    voz.volume = 1;

    speechSynthesis.speak(voz);
    }

    function pararNarracao() {
    if ("speechSynthesis" in window) {
        speechSynthesis.cancel();
    }
    }

    function personalizarTexto(texto) {
    return texto.replaceAll("{heroi}", jogador.nome);
    }

    function salvarProgresso() {
    localStorage.setItem("sangue_noite_eterna_save", JSON.stringify(jogador));
    }

    function carregarProgresso() {
    const salvo = localStorage.getItem("sangue_noite_eterna_save");

    if (salvo) {
        jogador = JSON.parse(salvo);
    }
    }

    function mostrarMorte() {
    pararNarracao();

    tituloCapitulo.textContent = "Fim da Jornada";
    subtituloCapitulo.textContent = "A noite venceu";

    textoJogo.innerHTML = `
    ${jogador.nome} cai de joelhos.

    A Marca Sombria pulsa uma última vez, não como sinal de poder, mas como uma sentença.

    A floresta se cala.

    E, no silêncio, Nyxar sorri nas profundezas do mundo.
    `;

    opcoes.innerHTML = "";

    const botao = document.createElement("button");
    botao.textContent = "Recomeçar";
    botao.onclick = () => {
        localStorage.removeItem("sangue_noite_eterna_save");
        location.reload();
    };

    opcoes.appendChild(botao);
    }

    function mostrarFimAlternativo() {
    pararNarracao();

    tituloCapitulo.textContent = "Continua...";
    subtituloCapitulo.textContent = "O destino ainda não foi escrito";

    textoJogo.innerHTML = `
    A Marca Sombria ainda queima em seu braço.

    As respostas encontradas até agora apenas abriram novas perguntas.

    Nyxar desperta.

    O sangue antigo chama.

    E a próxima escolha poderá salvar Vharengar... ou condená-la para sempre.
    `;

    opcoes.innerHTML = "";

    const botao = document.createElement("button");
    botao.textContent = "Voltar ao início";
    botao.onclick = () => location.reload();

    opcoes.appendChild(botao);
    }