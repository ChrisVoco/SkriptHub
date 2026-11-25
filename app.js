const SKRIPTIDE_KAUST = "skriptid/";
let projektid = [];

const listContainer = document.getElementById('script-list');
const searchInput = document.getElementById('search-input');
const adminToggle = document.getElementById('admin-toggle');
const adminPanel = document.getElementById('admin-panel');
const postBtn = document.getElementById('post-script-btn');

let adminParool = sessionStorage.getItem('adminParool') || null;

// Kontrollib parooli serveri kaudu
async function kontrolliParooli(parool) {
    try {
        const res = await fetch("api.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                parool: parool,
                tegevus: "kontrolli"
            })
        });
        return res.ok;
    } catch {
        return false;
    }
}

// Laeb projektid serverist (api.php)
async function laeProjektid() {
    try {
        const res = await fetch("api.php?v=" + Date.now(), { cache: "no-store" });
        const andmed = await res.json();
        if (res.ok && Array.isArray(andmed)) {
            projektid = andmed;
        } else {
            alert(andmed.error || "Viga projektide laadimisel!");
        }
    } catch {
        alert("Ei saanud serveriga (api.php) ühendust!");
    }
    uuendaStatistikat();
    renderProjects(searchInput.value);
}

function uuendaStatistikat() {
    document.getElementById('total-count').textContent = projektid.length;
    document.getElementById('working-count').textContent = projektid.filter(p => !p.patched).length;
}

function uuendaAdminVaadet() {
    if (adminParool) {
        adminToggle.textContent = "🔓";
        adminPanel.style.display = "block";
    } else {
        adminToggle.textContent = "🔒";
        adminPanel.style.display = "none";
    }
    renderProjects(searchInput.value);
}

// Admin sisselogimine / väljalogimine
adminToggle.addEventListener('click', async () => {
    if (adminParool) {
        adminParool = null;
        sessionStorage.removeItem('adminParool');
        uuendaAdminVaadet();
        return;
    }

    const sisestatud = prompt("Sisesta admin parool:");
    if (!sisestatud) return;

    adminToggle.textContent = "⏳";
    const onOige = await kontrolliParooli(sisestatud);

    if (onOige) {
        adminParool = sisestatud;
        sessionStorage.setItem('adminParool', sisestatud);
        uuendaAdminVaadet();
    } else {
        adminToggle.textContent = "🔒";
        alert("Vale parool! Ligipääs keelatud.");
    }
});

// Uue skripti postitamine
postBtn.addEventListener('click', async () => {
    const nimi = document.getElementById('new-name').value.trim();
    const kategooria = document.getElementById('new-cat').value.trim() || "JavaScript";
    const fail = document.getElementById('new-file').value.trim();
    const kirjeldus = document.getElementById('new-desc').value.trim();
    const kood = document.getElementById('new-code').value;

    if (!nimi || !fail || !kood) {
        alert("Täida vähemalt skripti nimi, faili nimi ja koodi kast!");
        return;
    }

    const btnSpan = postBtn.querySelector('span');
    btnSpan.textContent = "Salvestan serverisse...";

    try {
        const res = await fetch("api.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                parool: adminParool,
                tegevus: "lisa",
                nimi,
                kategooria,
                fail,
                kirjeldus,
                kood
            })
        });

        const vastus = await res.json();
        if (!res.ok) {
            alert(vastus.error || "Salvestamine ebaõnnestus!");
            if (res.status === 403) {
                adminParool = null;
                sessionStorage.removeItem('adminParool');
                uuendaAdminVaadet();
            }
            btnSpan.textContent = "Postita skript lehele";
            return;
        }

        document.getElementById('new-name').value = "";
        document.getElementById('new-cat').value = "";
        document.getElementById('new-file').value = "";
        document.getElementById('new-desc').value = "";
        document.getElementById('new-code').value = "";

        projektid = vastus.projektid;
        uuendaStatistikat();
        renderProjects(searchInput.value);
        btnSpan.textContent = "Postita skript lehele";
    } catch {
        alert("Serveriga ei saanud ühendust!");
        btnSpan.textContent = "Postita skript lehele";
    }
});

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
                    ${adminParool ? `
                        <button class="btn preview-btn toggle-status-btn">
                            <span>${projekt.patched ? '✅ Märgi töötavaks' : '🛑 Märgi patched'}</span>
                        </button>
                        <button class="btn preview-btn delete-btn" style="color: #f87171;">
                            <span>🗑️ Kustuta</span>
                        </button>
                    ` : ''}
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
        const toggleStatusBtn = card.querySelector('.toggle-status-btn');
        const deleteBtn = card.querySelector('.delete-btn');

        if (toggleStatusBtn) {
            toggleStatusBtn.addEventListener('click', async () => {
                toggleStatusBtn.querySelector('span').textContent = "Salvestan...";
                const res = await fetch("api.php", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        parool: adminParool,
                        tegevus: "staatus",
                        fail: projekt.fail,
                        patched: !projekt.patched
                    })
                });
                const vastus = await res.json();
                if (res.ok) {
                    projektid = vastus.projektid;
                    uuendaStatistikat();
                    renderProjects(searchInput.value);
                } else {
                    alert(vastus.error || "Viga!");
                }
            });
        }

        if (deleteBtn) {
            deleteBtn.addEventListener('click', async () => {
                if (!confirm(`Kas oled kindel, et soovid skripti "${projekt.nimi}" kustutada?`)) return;
                const res = await fetch("api.php", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        parool: adminParool,
                        tegevus: "kustuta",
                        fail: projekt.fail
                    })
                });
                const vastus = await res.json();
                if (res.ok) {
                    projektid = vastus.projektid;
                    uuendaStatistikat();
                    renderProjects(searchInput.value);
                } else {
                    alert(vastus.error || "Viga kustutamisel!");
                }
            });
        }

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
                alert("Ei suutnud faili kopeerida.");
            }
        });

        previewBtn.addEventListener('click', () => {
            const isOpen = drawer.classList.toggle('open');
            previewBtn.querySelector('span').textContent = isOpen ? "Peida kood" : "Vaata koodi";
        });
    });
}

searchInput.addEventListener('input', (e) => renderProjects(e.target.value));

// Kui lehte värskendatakse ja sessioonis on parool, kontrollib igaks juhuks üle
(async () => {
    if (adminParool) {
        const kehtib = await kontrolliParooli(adminParool);
        if (kehtib) {
            adminToggle.textContent = "🔓";
            adminPanel.style.display = "block";
        } else {
            adminParool = null;
            sessionStorage.removeItem('adminParool');
        }
    }
    laeProjektid();
})();