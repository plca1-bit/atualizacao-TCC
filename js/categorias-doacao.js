/* ==========================================================
   PONTE SOLIDÁRIA — REGRAS DO FORMULÁRIO POR CATEGORIA
   ==========================================================
   Relatório do professor: "os campos seguintes precisam ser ajustados de
   acordo com o tipo de categoria que o usuário escolher. Ex.: alguns itens
   não podem ser seminovos ou usados, como remédios e alimentos".

   Este arquivo concentra, num único lugar, a regra de cada categoria
   (estado aceito, campos exigidos, avisos) e adapta o formulário
   "Nova Doação" (#donation-wizard-form), o formulário de campanha
   (#campaign-donation-form) e o de "Pedir ajuda" (#help-request-form).
   A mesma tabela é usada para VALIDAR no envio (PSCategorias.validar), então
   a regra não depende só de esconder campos na tela.
   ========================================================== */
(function () {
    const TODOS_ESTADOS = ["Novo", "Seminovo", "Usado - conservado", "Usado - com desgaste"];
    const SO_NOVO = ["Novo"];

    const CATEGORIAS = {
        "Alimentos": {
            estados: SO_NOVO,
            rotuloEstado: "Estado do produto (somente lacrado)",
            validade: "obrigatoria", validadeMinDias: 30,
            peso: true, tamanho: false,
            placeholderItem: "Ex.: Pacote de arroz 5 kg",
            aviso: "Alimentos só são aceitos lacrados, dentro da validade (mínimo de 30 dias) e sem sinais de violação. Não aceitamos itens abertos, caseiros ou perecíveis sem refrigeração.",
            palavras: /alimento|cesta|arroz|feij[aã]o|leite|macarr|[oó]leo|a[cç][uú]car|farinha|enlatad|n[aã]o perec[ií]vel/i
        },
        "Remédios": {
            estados: SO_NOVO,
            rotuloEstado: "Estado do produto (somente lacrado)",
            validade: "obrigatoria", validadeMinDias: 90,
            peso: false, tamanho: false,
            placeholderItem: "Ex.: Dipirona 500 mg — caixa com 10 comprimidos",
            aviso: "Remédios só podem ser doados na embalagem original, lacrados, com bula e validade de pelo menos 90 dias. Não aceitamos medicamentos abertos, fracionados, vencidos ou de uso controlado (tarja preta). Informe o nome e a dosagem.",
            palavras: /rem[eé]dio|medicament|comprimid|xarope|pomada|analg[eé]sic|antibi[oó]tic|vitamina/i
        },
        "Higiene": {
            estados: SO_NOVO,
            rotuloEstado: "Estado do produto (somente lacrado)",
            validade: "opcional", validadeMinDias: 30,
            peso: true, tamanho: false,
            placeholderItem: "Ex.: Kit com sabonete, creme dental e escova",
            aviso: "Itens de higiene pessoal e fraldas só podem ser doados novos e lacrados (sem uso). Se houver data de validade na embalagem, informe.",
            palavras: /higiene|sabonete|shampoo|xampu|creme dental|escova|fralda|absorvente|desodorante/i
        },
        "Roupas": {
            estados: ["Novo", "Seminovo", "Usado - conservado"],
            rotuloEstado: "Estado do produto",
            validade: "nenhuma",
            peso: false, tamanho: true,
            placeholderItem: "Ex.: Casaco de lã infantil, cor azul",
            aviso: "Roupas e calçados usados precisam estar limpos, sem rasgos e em condição de uso. Informe o tamanho/numeração. Roupas íntimas só novas.",
            palavras: /roupa|casaco|cobertor|agasalho|blusa|cal[cç]a|camis|sapato|t[eê]nis|cal[cç]ado|meia/i
        },
        "Móveis": {
            estados: TODOS_ESTADOS,
            rotuloEstado: "Estado do produto",
            validade: "nenhuma",
            peso: true, tamanho: true, rotuloTamanho: "Dimensões aproximadas",
            placeholderTamanho: "Ex.: 1,80 m x 0,60 m",
            placeholderItem: "Ex.: Fogão de 4 bocas, funcionando",
            aviso: "Móveis e eletrodomésticos usados devem estar funcionando e seguros. Informe as dimensões aproximadas para facilitar o transporte.",
            palavras: /m[oó]vel|sof[aá]|cama|guarda-roupa|geladeira|fog[aã]o|mesa|cadeira|colch[aã]o|eletrodom/i
        },
        "Outros": {
            estados: TODOS_ESTADOS,
            rotuloEstado: "Estado do produto",
            validade: "nenhuma",
            peso: true, tamanho: false,
            placeholderItem: "Ex.: Material escolar, brinquedos...",
            aviso: "",
            palavras: null
        }
    };

    // Descobre a categoria a partir de um texto livre (usado no formulário
    // de campanha, onde só existe o nome do item aceito).
    function categoriaPorTexto(texto) {
        const t = String(texto || "");
        for (const nome of ["Remédios", "Alimentos", "Higiene", "Roupas", "Móveis"]) {
            if (CATEGORIAS[nome].palavras.test(t)) return nome;
        }
        return "Outros";
    }

    function regra(categoria) { return CATEGORIAS[categoria] || null; }

    function diasAte(dataIso) {
        const alvo = new Date(dataIso + "T00:00:00");
        const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
        return Math.round((alvo - hoje) / 86400000);
    }
    function dataEmDias(dias) {
        const d = new Date(); d.setDate(d.getDate() + dias);
        return d.toISOString().slice(0, 10);
    }

    // Validação usada no envio (também protege contra campo escondido por
    // CSS/DevTools): devolve uma mensagem de erro ou "" se estiver tudo certo.
    function validar(categoria, { condicao, validade, tamanho }) {
        const r = regra(categoria);
        if (!r) return "";
        if (condicao && !r.estados.includes(condicao) && !(condicao === "Bom estado" && r.estados.includes("Seminovo"))) {
            return `Para a categoria "${categoria}" só é aceito: ${r.estados.join(", ")}.`;
        }
        if (r.validade === "obrigatoria" && !validade) return "Informe a data de validade do produto.";
        if (validade) {
            const dias = diasAte(validade);
            if (dias < r.validadeMinDias) return `O produto precisa ter validade de pelo menos ${r.validadeMinDias} dias.`;
        }
        if (r.tamanho && !tamanho && categoria === "Roupas") return "Informe o tamanho ou a numeração da peça.";
        return "";
    }

    function aplicarEstados(select, estados, rotuloEl, rotulo) {
        if (!select) return;
        const atual = select.value;
        // Mantém o rótulo original de cada <option> quando existe.
        const textos = {
            "Novo": estados.length === 1 ? "Novo (lacrado)" : "Novo (com etiqueta/lacrado)",
            "Seminovo": "Seminovo (pouco uso)",
            "Usado - conservado": "Usado - conservado",
            "Usado - com desgaste": "Usado - com desgaste"
        };
        select.innerHTML = `<option value="">Selecione</option>` +
            estados.map((e) => `<option value="${e}">${textos[e] || e}</option>`).join("");
        if (estados.includes(atual)) select.value = atual;
        else if (estados.length === 1) select.value = estados[0];
        if (rotuloEl && rotulo) rotuloEl.textContent = rotulo;
    }

    function mostrar(grupo, visivel) {
        if (!grupo) return;
        grupo.classList.toggle("hidden", !visivel);
        grupo.querySelectorAll("input, select, textarea").forEach((c) => { if (!visivel) c.value = ""; });
    }

    /* ---------- Wizard "Nova Doação" ---------- */
    function adaptarWizard() {
        const cat = document.getElementById("dw-category")?.value || "";
        const r = regra(cat);
        const hint = document.getElementById("dw-category-hint");
        const cond = document.getElementById("dw-condition");
        const condLabel = document.querySelector('label[for="dw-condition"]');
        const itemInput = document.getElementById("dw-item-name");
        const validadeGrupo = document.getElementById("dw-expiry-group");
        const validadeInput = document.getElementById("dw-expiry");
        const tamanhoGrupo = document.getElementById("dw-size-group");
        const tamanhoInput = document.getElementById("dw-size");
        const pesoGrupo = document.getElementById("dw-weight-group");

        if (!r) {
            // Nenhuma categoria escolhida ainda: estado de partida neutro.
            aplicarEstados(cond, TODOS_ESTADOS, condLabel, "Estado do produto");
            mostrar(validadeGrupo, false); mostrar(tamanhoGrupo, false);
            pesoGrupo?.classList.remove("hidden");
            if (hint) { hint.textContent = ""; hint.classList.add("hidden"); }
            return;
        }
        aplicarEstados(cond, r.estados, condLabel, r.rotuloEstado);
        if (itemInput) itemInput.placeholder = r.placeholderItem;

        // Validade
        const temValidade = r.validade !== "nenhuma";
        const eraVisivel = validadeGrupo && !validadeGrupo.classList.contains("hidden");
        mostrar(validadeGrupo, temValidade);
        if (validadeInput) {
            validadeInput.required = r.validade === "obrigatoria";
            validadeInput.min = dataEmDias(r.validadeMinDias || 0);
        }
        const lblVal = validadeGrupo?.querySelector("label");
        if (lblVal) lblVal.textContent = r.validade === "obrigatoria" ? "Data de validade *" : "Data de validade (se houver)";
        void eraVisivel;

        // Tamanho / dimensões
        mostrar(tamanhoGrupo, r.tamanho);
        if (tamanhoInput) {
            tamanhoInput.required = cat === "Roupas";
            tamanhoInput.placeholder = r.placeholderTamanho || "Ex.: M, 38, 2 anos";
        }
        const lblTam = tamanhoGrupo?.querySelector("label");
        if (lblTam) lblTam.textContent = r.rotuloTamanho || "Tamanho / numeração";

        // Peso só faz sentido para quem é transportado "por peso"
        if (pesoGrupo) {
            pesoGrupo.classList.toggle("hidden", !r.peso);
            if (!r.peso) { const p = pesoGrupo.querySelector("input"); if (p) p.value = ""; }
        }

        if (hint) {
            hint.textContent = r.aviso;
            hint.classList.toggle("hidden", !r.aviso);
        }
    }

    /* ---------- Formulário "Doar para a campanha" ---------- */
    function adaptarCampanha() {
        const itemTxt = document.getElementById("cd-item")?.value || "";
        const cat = itemTxt ? categoriaPorTexto(itemTxt) : "";
        const r = regra(cat);
        const cond = document.getElementById("cd-condition");
        const hint = document.getElementById("cd-category-hint");
        const validadeGrupo = document.getElementById("cd-expiry-group");
        const validadeInput = document.getElementById("cd-expiry");
        const estados = r ? (r.estados.length === 1 ? ["Novo"] : ["Novo", "Bom estado"]) : ["Novo", "Bom estado"];
        if (cond) {
            const atual = cond.value;
            cond.innerHTML = `<option value="">Selecione</option>` +
                estados.map((e) => `<option value="${e}">${e === "Novo" && estados.length === 1 ? "Novo (lacrado)" : e}</option>`).join("");
            if (estados.includes(atual)) cond.value = atual; else if (estados.length === 1) cond.value = estados[0];
        }
        const exigeValidade = r && r.validade === "obrigatoria";
        mostrar(validadeGrupo, !!exigeValidade);
        if (validadeInput) {
            validadeInput.required = !!exigeValidade;
            if (r) validadeInput.min = dataEmDias(r.validadeMinDias || 0);
        }
        if (hint) {
            hint.textContent = r ? r.aviso : "";
            hint.classList.toggle("hidden", !(r && r.aviso));
        }
    }

    /* ---------- Formulário "Pedir ajuda" ---------- */
    function adaptarPedido() {
        const cat = document.getElementById("req-family-type")?.value || "";
        const r = regra(cat);
        const hint = document.getElementById("req-category-hint");
        const item = document.getElementById("req-family-item");
        const mensagens = {
            "Remédios": "Informe o nome do medicamento e a dosagem. Medicamentos de uso controlado exigem receita e são entregues somente com orientação de um profissional de saúde.",
            "Alimentos": "Informe se há restrições alimentares (ex.: alergia a lactose, bebê, diabetes) para que a doação seja adequada.",
            "Roupas": "Informe tamanhos/numerações e a faixa etária de quem vai usar.",
            "Higiene": "Informe quantas pessoas serão atendidas e se há bebês (fraldas) ou idosos.",
            "Móveis": "Informe se há espaço e meio de transporte para receber o item."
        };
        if (item && r) item.placeholder = r.placeholderItem;
        if (hint) {
            hint.textContent = mensagens[cat] || "";
            hint.classList.toggle("hidden", !mensagens[cat]);
        }
    }

    document.addEventListener("change", (e) => {
        const id = e.target?.id;
        if (id === "dw-category") adaptarWizard();
        else if (id === "cd-item") adaptarCampanha();
        else if (id === "req-family-type") adaptarPedido();
    });
    // openDonationWizard() e abrirCampaignDonationModal() (js/doacoes.js) chamam
    // adaptarWizard()/adaptarCampanha() depois do reset() do formulário.
    document.addEventListener("includesLoaded", () => { adaptarWizard(); adaptarCampanha(); adaptarPedido(); });

    window.PSCategorias = { regra, validar, categoriaPorTexto, adaptarWizard, adaptarCampanha, adaptarPedido };
})();
