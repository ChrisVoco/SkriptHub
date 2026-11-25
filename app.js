// Kausta nimi, kus hoiad kõiki oma skripte:
const SKRIPTIDE_KAUST = "skriptid/";

// SIIA LISA OMA PROJEKTID (kirjuta ainult faili nimi, kaust lisatakse automaatselt):
const projektid = [
    {
        nimi: "Guessr OP SKRIPT!",
        kategooria: "JavaScript",
        kirjeldus: "Täisfunktsionaalne abiskript, mis töötab nii OpenGuessr kui ka GeoGuessr keskkonnas.",
        fail: "guessr.js",
        patched: false
    }
];

const listContainer = document.getElementById('script-list');
const searchInput = document.getElementById('search-input');

document.getElementById('total-count').textContent = projektid.length;
document.getElementById('working-count').textContent = projektid.filter(p => !p.patched).length;

function renderProjects(filterText = "") {
    listContainer.innerHTML = "";
    const query = filterText.toLowerCase();

    const filtered = projektid.filter(p => 
        p.nimi.toLowerCase().includes(query) || 
        p.kirjeldus.toLowerCase().includes(query) ||
        (p.kategooria && p.kategooria.toLowerCase().includes(query))
    );

    if (filtered.length === 0) {
        listContainer.innerHTML = `<div class="empty-msg">Otsingule vastavaid skripte ei leitud.</div>`;
        return;
    }

    filtered.forEach(async (projekt) => {
        const card = document.createElement('div');
        card.className = 'script-card';

        const failiTee = SKRIPTIDE_KAUST + projekt.fail;
        const statusClass = projekt.patched ? 'status-patched' : 'status-working';
        const statusText = projekt.patched ? 'Patched' : 'Töötab';

        card.innerHTML = `
            <div class="card-top">
                <div class="script-info">
                    <div class="title-row">
                        <span class="script-title">${projekt.nimi}</span>
                        ${projekt.kategooria ? `<span class="tag-badge">${projekt.kategooria}</span>` : ''}
                        <span class="status-badge ${statusClass}">
                            <span class="dot"></span>${statusText}
                        </span>
                    </div>
                    <div class="script-desc">${projekt.kirjeldus}</div>
                    <div class="meta-row">
                        <span class="meta-item">📄 ${projekt.fail}</span>
                        <span class="meta-item meta-lines">⏳ Loen ridu...</span>
                        <span class="meta-item meta-updated">🕒 Kontrollin aega...</span>
                    </div>
                </div>
                <div class="actions">
                    <button class="btn copy-btn">
                        <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                        <span>Kopeeri kood</span>
                    </button>
                    <button class="btn preview-btn">
                        <span>Vaata koodi</span>
                    </button>
                </div>
            </div>
            <div class="code-drawer">
                <pre>Laen eelvaadet...</pre>
            </div>
        `;

        listContainer.appendChild(card);

        const updatedEl = card.querySelector('.meta-updated');
        const linesEl = card.querySelector('.meta-lines');
        const copyBtn = card.querySelector('.copy-btn');
        const copyBtnText = copyBtn.querySelector('span');
        const previewBtn = card.querySelector('.preview-btn');
        const drawer = card.querySelector('.code-drawer');
        const preBlock = drawer.querySelector('pre');

        try {
            const vastus = await fetch(failiTee + "?v=" + Date.now(), { cache: "no-store" });
            if (vastus.ok) {
                const lastMod = vastus.headers.get("Last-Modified");
                if (lastMod) {
                    const kp = new Date(lastMod).toLocaleString("et-EE", {
                        day: "2-digit", month: "2-digit", year: "numeric",
                        hour: "2-digit", minute: "2-digit"
                    });
                    updatedEl.textContent = `🕒 Uuendatud: ${kp}`;
                } else {
                    updatedEl.textContent = "🕒 Uuendatud: hiljuti";
                }

                const codeText = await vastus.text();
                const ridadeArv = codeText.split('\n').length;
                linesEl.textContent = `📏 ${ridadeArv} rida`;
                preBlock.textContent = codeText;
            } else {
                updatedEl.textContent = "🕒 Fail puudub serveris";
                linesEl.textContent = "📏 0 rida";
            }
        } catch {
            updatedEl.textContent = "🕒 Serveri viga";
            linesEl.textContent = "📏 -";
        }

        copyBtn.addEventListener('click', async () => {
            try {
                copyBtnText.textContent = "Laen...";
                const res = await fetch(failiTee + "?v=" + Date.now(), { cache: "no-store" });
                if (!res.ok) throw new Error("Faili ei leitud");
                const kood = await res.text();

                await navigator.clipboard.writeText(kood);

                copyBtnText.textContent = "Kopeeritud!";
                copyBtn.classList.add('copied');
                setTimeout(() => {
                    copyBtnText.textContent = "Kopeeri kood";
                    copyBtn.classList.remove('copied');
                }, 2000);
            } catch {
                copyBtnText.textContent = "Viga!";
                alert("Ei suutnud faili kopeerida. Kontrolli, kas fail asub skriptid/ kaustas.");
            }
        });

        previewBtn.addEventListener('click', () => {
            const isOpen = drawer.classList.toggle('open');
            previewBtn.querySelector('span').textContent = isOpen ? "Peida kood" : "Vaata koodi";
        });
    });
}

searchInput.addEventListener('input', (e) => renderProjects(e.target.value));
renderProjects();