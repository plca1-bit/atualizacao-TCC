document.addEventListener("DOMContentLoaded", () => {
    const includes = document.querySelectorAll('[data-include]');
    let loadedCount = 0;

    if (includes.length === 0) {
        document.dispatchEvent(new Event("includesLoaded"));
        return;
    }

    includes.forEach(el => {
        const file = el.getAttribute('data-include');
        fetch(file)
            .then(response => {
                if (!response.ok) throw new Error(`Erro ao carregar: ${file}`);
                return response.text();
            })
            .then(data => {
                el.innerHTML = data;
            })
            .catch(err => console.error(err))
            .finally(() => {
                loadedCount++;
                // Quando o último arquivo terminar de carregar, dispara o evento global
                if (loadedCount === includes.length) {
                    document.dispatchEvent(new Event("includesLoaded"));
                }
            });
    });
});