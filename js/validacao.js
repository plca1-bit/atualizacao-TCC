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
    function validarEmail(emailBruto) {
        const email = String(emailBruto || "").trim();
        // Mais rígido que o "type=email" nativo: exige domínio com ponto,
        // sem espaços e sem pontos duplicados.
        const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)+$/;
        return regex.test(email) && !email.includes("..");
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
    function mostrarErroCampo(input, mensagem) {
        if (!input) return;
        input.classList.toggle("campo-invalido", Boolean(mensagem));
        let elErro = input.parentElement?.querySelector(".campo-erro-msg");
        if (!elErro) {
            elErro = document.createElement("small");
            elErro.className = "campo-erro-msg";
            input.closest(".form-group")?.appendChild(elErro);
        }
        elErro.textContent = mensagem || "";
        elErro.style.display = mensagem ? "block" : "none";
    }

    function limparErroCampo(input) {
        mostrarErroCampo(input, "");
    }

    window.PSValidacao = {
        apenasDigitos,
        validarCPF,
        validarCNPJ,
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
