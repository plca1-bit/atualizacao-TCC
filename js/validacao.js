/* ==========================================================
   PONTE SOLIDÁRIA — VALIDAÇÃO DE DADOS DO CADASTRO
   ==========================================================
   Antes disso, o cadastro só verificava se os campos estavam
   preenchidos (atributo "required"). Nada impedia um CPF, CNPJ,
   telefone ou e-mail inventado. Este arquivo adiciona validação
   de verdade (dígitos verificadores de CPF/CNPJ, DDD e tamanho
   de celular, formato de e-mail e estrutura mínima de endereço)
   além de máscaras automáticas enquanto a pessoa digita.
   ========================================================== */

(function () {
    "use strict";

    function apenasDigitos(valor) {
        return String(valor || "").replace(/\D/g, "");
    }

    // ---------- CPF ----------
    function validarCPF(cpfBruto) {
        const cpf = apenasDigitos(cpfBruto);
        if (cpf.length !== 11) return false;
        if (/^(\d)\1{10}$/.test(cpf)) return false; // 000.000.000-00, 111.111.111-11 etc.

        let soma = 0;
        for (let i = 0; i < 9; i++) soma += parseInt(cpf.charAt(i), 10) * (10 - i);
        let resto = (soma * 10) % 11;
        if (resto === 10 || resto === 11) resto = 0;
        if (resto !== parseInt(cpf.charAt(9), 10)) return false;

        soma = 0;
        for (let i = 0; i < 10; i++) soma += parseInt(cpf.charAt(i), 10) * (11 - i);
        resto = (soma * 10) % 11;
        if (resto === 10 || resto === 11) resto = 0;
        return resto === parseInt(cpf.charAt(10), 10);
    }

    // ---------- CNPJ ----------
    function validarCNPJ(cnpjBruto) {
        const cnpj = apenasDigitos(cnpjBruto);
        if (cnpj.length !== 14) return false;
        if (/^(\d)\1{13}$/.test(cnpj)) return false;
        // Nº de ordem do estabelecimento (posições 9 a 12): "0000" não existe
        // (matriz é 0001). Muitos CNPJs "gerados" ao acaso caem aqui.
        if (cnpj.slice(8, 12) === "0000") return false;

        const calcularDigito = (base) => {
            const pesos = base.length === 12
                ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
                : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
            const soma = base.split("").reduce((acc, digito, i) => acc + parseInt(digito, 10) * pesos[i], 0);
            const resto = soma % 11;
            return resto < 2 ? 0 : 11 - resto;
        };

        const digito1 = calcularDigito(cnpj.slice(0, 12));
        const digito2 = calcularDigito(cnpj.slice(0, 12) + String(digito1));
        return cnpj.slice(12) === `${digito1}${digito2}`;
    }

    // ---------- CNPJ: consulta à Receita Federal ----------
    // Os dígitos verificadores só provam que o número "faz sentido" — qualquer
    // gerador de CNPJ na internet cria números que passam nessa conta. Aqui o
    // CNPJ é conferido de verdade em bases públicas da Receita (BrasilAPI e,
    // se ela falhar, CNPJ.ws): precisa existir E estar com situação "ATIVA".
    //
    // Resultado de consultarCNPJ():
    //   { status: "ok",              razaoSocial, nomeFantasia, situacao }
    //   { status: "nao_encontrado" }  → o CNPJ não existe na Receita
    //   { status: "inativa",         razaoSocial, situacao } → baixada/suspensa/inapta/nula
    //   { status: "invalido" }        → não passou nos dígitos verificadores
    //   { status: "indisponivel" }    → nenhuma base respondeu (rede, limite
    //                                   de consultas); o chamador decide o que fazer
    const cacheConsultaCNPJ = {};

    async function buscarJson(url, tempoMs) {
        const controle = new AbortController();
        const timer = setTimeout(() => controle.abort(), tempoMs);
        try {
            const resposta = await fetch(url, { signal: controle.signal, headers: { Accept: "application/json" } });
            let corpo = null;
            try { corpo = await resposta.json(); } catch (e) { /* corpo vazio/inválido */ }
            return { httpStatus: resposta.status, corpo };
        } finally {
            clearTimeout(timer);
        }
    }

    // Cada provedor devolve: {achou:true, razaoSocial, nomeFantasia, situacao}
    // | {achou:false} (404: não existe) | null (erro/indisponível).
    async function consultarBrasilApi(cnpj) {
        try {
            const { httpStatus, corpo } = await buscarJson(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`, 8000);
            if (httpStatus === 200 && corpo && (corpo.razao_social || corpo.cnpj)) {
                return {
                    achou: true,
                    razaoSocial: corpo.razao_social || "",
                    nomeFantasia: corpo.nome_fantasia || "",
                    situacao: String(corpo.descricao_situacao_cadastral || "").toUpperCase()
                };
            }
            if (httpStatus === 404) return { achou: false };
        } catch (e) { /* rede/timeout */ }
        return null;
    }

    async function consultarCnpjWs(cnpj) {
        try {
            const { httpStatus, corpo } = await buscarJson(`https://publica.cnpj.ws/cnpj/${cnpj}`, 8000);
            if (httpStatus === 200 && corpo && corpo.razao_social) {
                return {
                    achou: true,
                    razaoSocial: corpo.razao_social || "",
                    nomeFantasia: corpo.estabelecimento?.nome_fantasia || "",
                    situacao: String(corpo.estabelecimento?.situacao_cadastral || "").toUpperCase()
                };
            }
            if (httpStatus === 404) return { achou: false };
        } catch (e) { /* rede/timeout/limite */ }
        return null;
    }

    async function consultarCNPJ(cnpjBruto) {
        const cnpj = apenasDigitos(cnpjBruto);
        if (!validarCNPJ(cnpj)) return { status: "invalido" };
        // Só guarda no cache respostas conclusivas (nunca "indisponivel"),
        // para uma falha de rede passageira não ficar grudada.
        if (cacheConsultaCNPJ[cnpj]) return cacheConsultaCNPJ[cnpj];

        // Achou em qualquer base → usa. Nenhuma achou, mas alguma respondeu
        // "404 / não existe" → CNPJ inexistente. Ninguém respondeu → indisponível.
        const primeira = await consultarBrasilApi(cnpj);
        let dados = primeira && primeira.achou ? primeira : null;
        let algumaDisseNaoExiste = !!primeira && !primeira.achou;
        if (!dados) {
            const segunda = await consultarCnpjWs(cnpj);
            if (segunda && segunda.achou) dados = segunda;
            else if (segunda) algumaDisseNaoExiste = true;
        }

        let resultado;
        if (dados) {
            resultado = dados.situacao === "ATIVA"
                ? { status: "ok", razaoSocial: dados.razaoSocial, nomeFantasia: dados.nomeFantasia, situacao: "ATIVA" }
                : { status: "inativa", razaoSocial: dados.razaoSocial, situacao: dados.situacao || "NÃO ATIVA" };
        } else if (algumaDisseNaoExiste) {
            resultado = { status: "nao_encontrado" };
        } else {
            return { status: "indisponivel" };
        }
        cacheConsultaCNPJ[cnpj] = resultado;
        return resultado;
    }

    // Mensagem pronta para o usuário a partir do resultado de consultarCNPJ().
    function mensagemConsultaCNPJ(r) {
        if (!r) return "";
        if (r.status === "nao_encontrado") return "Este CNPJ não foi encontrado na Receita Federal. Confira os números.";
        if (r.status === "inativa") return `Este CNPJ consta como "${r.situacao}" na Receita Federal. Só CNPJs com situação ATIVA podem ser cadastrados.`;
        if (r.status === "invalido") return "CNPJ inválido. Confira os números digitados.";
        return "";
    }

    // ---------- Telefone (celular/WhatsApp brasileiro) ----------
    // O campo do cadastro é especificamente "Celular / WhatsApp", então exige
    // o formato de celular: 11 dígitos, com "9" como terceiro dígito.
    function validarTelefone(telBruto) {
        const tel = apenasDigitos(telBruto);
        if (tel.length !== 11) return false;
        const ddd = parseInt(tel.slice(0, 2), 10);
        if (ddd < 11 || ddd > 99) return false;
        if (tel.charAt(2) !== "9") return false;
        if (/^(\d)\1+$/.test(tel)) return false; // todos os dígitos iguais
        return true;
    }

    // ---------- E-mail ----------
    // Domínios de e-mail temporário/descartável (mailinator, tempmail,
    // guerrillamail etc.) e domínios de exemplo/placeholder que não recebem
    // e-mail de verdade (example.com/test.com são reservados pela IANA só
    // para documentação — RFC 2606). Cadastro com qualquer um destes é
    // recusado: são exatamente os "e-mails falsos" usados só para passar
    // pelo formulário. (A plataforma não envia link de confirmação de e-mail.)
    const DOMINIOS_EMAIL_DESCARTAVEL = new Set([
        "mailinator.com", "guerrillamail.com", "guerrillamail.info", "sharklasers.com",
        "10minutemail.com", "10minutemail.net", "temp-mail.org", "tempmail.com", "tempmail.net",
        "throwawaymail.com", "trashmail.com", "trashmail.net", "yopmail.com", "yopmail.net",
        "dispostable.com", "fakeinbox.com", "getnada.com", "maildrop.cc", "mailnesia.com",
        "mohmal.com", "moakt.com", "discard.email", "spamgourmet.com", "mintemail.com",
        "emailondeck.com", "nada.email", "33mail.com", "burnermail.io", "mailcatch.com",
        "example.com", "example.net", "example.org", "test.com", "teste.com", "exemplo.com",
        "email.test", "fake.com", "naotenho.com", "semdominio.com"
    ]);

    function validarEmail(emailBruto) {
        const email = String(emailBruto || "").trim();
        // Mais rígido que o "type=email" nativo: exige domínio com ponto,
        // sem espaços, sem pontos duplicados e com um TLD só de letras (2 a
        // 24 caracteres) — barra digitações claramente inválidas como
        // "fulano@empresa.c" ou "fulano@empresa.123" que o regex anterior,
        // sozinho, deixava passar.
        const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)*\.[a-zA-Z]{2,24}$/;
        if (!regex.test(email) || email.includes("..")) return false;

        const dominio = email.split("@")[1]?.toLowerCase() || "";
        if (DOMINIOS_EMAIL_DESCARTAVEL.has(dominio)) return false;

        return true;
    }

    // ---------- Endereço ----------
    // Não dá pra confirmar que um endereço realmente existe sem uma API de
    // CEP/mapa, mas dá pra recusar textos genéricos ou incompletos: exige
    // pelo menos um número (residência) e ao menos dois pedaços de texto
    // (rua + bairro/cidade), com comprimento mínimo razoável.
    function validarEndereco(enderecoBruto) {
        const endereco = String(enderecoBruto || "").trim();
        if (endereco.length < 10) return false;
        const temNumero = /\d/.test(endereco);
        const partes = endereco.split(/[,-]/).map((p) => p.trim()).filter(Boolean);
        return temNumero && partes.length >= 2;
    }

    // ---------- Máscaras (formatação ao digitar) ----------
    function mascaraCPF(valor) {
        return apenasDigitos(valor).slice(0, 11)
            .replace(/(\d{3})(\d)/, "$1.$2")
            .replace(/(\d{3})(\d)/, "$1.$2")
            .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    }

    function mascaraCNPJ(valor) {
        return apenasDigitos(valor).slice(0, 14)
            .replace(/(\d{2})(\d)/, "$1.$2")
            .replace(/(\d{3})(\d)/, "$1.$2")
            .replace(/(\d{3})(\d)/, "$1/$2")
            .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
    }

    function mascaraTelefone(valor) {
        const digitos = apenasDigitos(valor).slice(0, 11);
        if (digitos.length <= 10) {
            return digitos
                .replace(/(\d{2})(\d)/, "($1) $2")
                .replace(/(\d{4})(\d{1,4})$/, "$1-$2");
        }
        return digitos
            .replace(/(\d{2})(\d)/, "($1) $2")
            .replace(/(\d{5})(\d{1,4})$/, "$1-$2");
    }

    // ---------- Exibição de erro por campo ----------
    // Item 40 da revisão ("mensagens de erro associadas aos inputs"): a
    // mensagem de erro é criada como um elemento novo, mas em nenhum lugar
    // fica ligada ao campo — para quem usa leitor de tela, um input
    // "campo-invalido" (só uma borda vermelha via CSS) fica em silêncio,
    // sem nunca anunciar qual é o problema. Agora cada mensagem ganha um id
    // estável e o input aponta pra ela via aria-describedby + aria-invalid.
    function mostrarErroCampo(input, mensagem) {
        if (!input) return;
        const temErro = Boolean(mensagem);
        input.classList.toggle("campo-invalido", temErro);
        input.setAttribute("aria-invalid", temErro ? "true" : "false");

        let elErro = input.parentElement?.querySelector(".campo-erro-msg");
        if (!elErro) {
            elErro = document.createElement("small");
            elErro.className = "campo-erro-msg";
            elErro.setAttribute("role", "alert");
            input.closest(".form-group")?.appendChild(elErro);
        }
        if (!elErro.id) {
            elErro.id = `${input.id || "campo"}-erro-${Math.random().toString(36).slice(2, 8)}`;
        }
        elErro.textContent = mensagem || "";
        elErro.style.display = mensagem ? "block" : "none";

        // Preserva qualquer outro aria-describedby que já exista no campo
        // (ex.: um texto de ajuda), só acrescenta/remove o id do erro.
        const descIds = (input.getAttribute("aria-describedby") || "")
            .split(/\s+/)
            .filter((id) => id && id !== elErro.id);
        if (temErro) descIds.push(elErro.id);
        if (descIds.length) {
            input.setAttribute("aria-describedby", descIds.join(" "));
        } else {
            input.removeAttribute("aria-describedby");
        }
    }

    function limparErroCampo(input) {
        mostrarErroCampo(input, "");
    }

    window.PSValidacao = {
        apenasDigitos,
        validarCPF,
        validarCNPJ,
        consultarCNPJ,
        mensagemConsultaCNPJ,
        validarTelefone,
        validarEmail,
        validarEndereco,
        mascaraCPF,
        mascaraCNPJ,
        mascaraTelefone,
        mostrarErroCampo,
        limparErroCampo
    };
})();
