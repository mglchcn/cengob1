const app = {
    data: {
        auth: false,
        macro: {
            pib: 2.1, pibTarget: 3.7, balanza: -450,
            deficit: -8.2, deficitTarget: -7.5,
            oficial: 6.96, paralelo: 10.50,
            ipc: [5.2, 3.1, 1.8, 0.5, 2.4],
            history: [30, 32, 35, 42, 48, 51]
        },
        cengob: []
    },
    
    config: {
        macro_csv: localStorage.getItem('sheet_macro') || '',
        cengob_csv: localStorage.getItem('sheet_cengob') || '',
        script_url: localStorage.getItem('script_url') || ''
    },

    charts: { brecha: null, ipc: null },

    init: function() {
        // Cargar datos locales si existen
        const stored = localStorage.getItem('sigepData');
        if(stored) this.data = JSON.parse(stored);
        
        // Si hay URLs configuradas, intentar actualizar desde la nube
        if(this.config.macro_csv && this.config.cengob_csv) {
            this.fetchFromCloud();
        } else {
            this.loadDemoData(false); // Cargar demo silenciosamente si no hay nada
        }

        // Rellenar inputs de configuración
        document.getElementById('url-macro').value = this.config.macro_csv;
        document.getElementById('url-cengob').value = this.config.cengob_csv;
        document.getElementById('url-script').value = this.config.script_url;

        this.renderAll();
    },

    // --- RENDERIZADO ---
    renderAll: function() {
        this.renderMacro();
        this.renderCengob();
        if(this.data.auth) this.renderAdmin();
    },

    renderMacro: function() {
        const m = this.data.macro;
        
        // Actualizar Textos
        document.getElementById('val-pib').innerText = m.pib + '%';
        document.getElementById('target-pib').innerText = 'Meta: ' + m.pibTarget + '%';
        this.updateBadge('card-pib', 'badge-pib', m.pib, m.pibTarget, true);

        document.getElementById('val-balanza').innerText = '$' + m.balanza + 'M';
        this.updateBadge('card-balanza', 'badge-balanza', m.balanza, 0, true);

        document.getElementById('val-deficit').innerText = m.deficit + '%';
        document.getElementById('target-deficit').innerText = 'Techo: ' + m.deficitTarget + '%';
        this.updateBadge('card-deficit', 'badge-deficit', m.deficit, m.deficitTarget, true);

        const brecha = ((m.paralelo - m.oficial) / m.oficial * 100).toFixed(1);
        document.getElementById('val-brecha').innerText = brecha + '%';
        document.getElementById('val-oficial').innerText = m.oficial;
        document.getElementById('val-paralelo').innerText = m.paralelo;
        this.updateBadge('card-brecha', 'badge-brecha', parseFloat(brecha), 30, false);

        this.renderCharts();
    },

    updateBadge: function(cardId, badgeId, val, target, higherIsBetter) {
        const card = document.getElementById(cardId);
        const badge = document.getElementById(badgeId);
        let status = 'red', text = 'Alerta';

        if (higherIsBetter) {
            if (val >= target) { status = 'green'; text = 'Cumple'; }
            else if (val >= target - 1.5) { status = 'yellow'; text = 'Riesgo'; }
        } else {
            if (val <= 15) { status = 'green'; text = 'Estable'; }
            else if (val <= target) { status = 'yellow'; text = 'Volátil'; }
        }

        card.className = `kpi-card status-${status}`;
        badge.className = `badge status-${status}`;
        badge.style.background = status === 'green' ? '#dcfce7' : (status === 'yellow' ? '#fef3c7' : '#fee2e2');
        badge.style.color = status === 'green' ? '#166534' : (status === 'yellow' ? '#92400e' : '#991b1b');
        badge.innerText = text;
    },

    renderCharts: function() {
        // Brecha
        const ctxB = document.getElementById('chartBrecha').getContext('2d');
        if (this.charts.brecha) this.charts.brecha.destroy();
        this.charts.brecha = new Chart(ctxB, {
            type: 'line',
            data: {
                labels: ['M1', 'M2', 'M3', 'M4', 'M5', 'Act'],
                datasets: [{
                    label: 'Brecha %', data: this.data.macro.history,
                    borderColor: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)', fill: true, tension: 0.4
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });

        // IPC
        const ctxI = document.getElementById('chartIPC').getContext('2d');
        if (this.charts.ipc) this.charts.ipc.destroy();
        this.charts.ipc = new Chart(ctxI, {
            type: 'bar',
            data: {
                labels: ['Alim.', 'Trans.', 'Salud', 'Edu.', 'Viv.'],
                datasets: [{ label: '%', data: this.data.macro.ipc, backgroundColor: '#1e3a8a', borderRadius: 4 }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });
    },

    renderCengob: function() {
        const container = document.getElementById('cengob-container');
        container.innerHTML = '';
        let total = 0, count = 0;

        this.data.cengob.forEach((p, idx) => {
            let pProg = 0;
            if(p.subtasks.length > 0) {
                pProg = Math.round(p.subtasks.reduce((acc, c) => acc + c.progress, 0) / p.subtasks.length);
            }
            total += pProg; count++;

            const tasksHtml = p.subtasks.map(t => `
                <div class="subtask-row">
                    <div>
                        <span class="material-icons-round" style="font-size:1rem; vertical-align:middle; color:var(--primary);">arrow_right</span>
                        ${t.name} <span class="ministry-tag">${t.ministry}</span>
                    </div>
                    <div style="font-weight:700; color:${t.progress < 50 ? 'var(--danger)' : 'var(--success)'}">${t.progress}%</div>
                </div>`).join('');

            container.innerHTML += `
                <div class="priority-item">
                    <div class="priority-header" onclick="document.getElementById('sub-${idx}').classList.toggle('open')">
                        <div class="p-icon"><span class="material-icons-round">${p.icon}</span></div>
                        <div style="flex:1;">
                            <div style="display:flex; justify-content:space-between;">
                                <h3 style="font-size:1.1rem; font-weight:700;">${p.title}</h3>
                                <span style="font-weight:800; color:var(--primary);">${pProg}%</span>
                            </div>
                            <div style="font-size:0.9rem; color:var(--secondary);">${p.desc}</div>
                            <div class="progress-bar"><div class="progress-fill" style="width:${pProg}%"></div></div>
                        </div>
                    </div>
                    <div id="sub-${idx}" class="subtasks-list">${tasksHtml || '<p style="padding:10px; font-size:0.9rem; color:#aaa">Sin tareas</p>'}</div>
                </div>`;
        });
        document.getElementById('global-progress').innerText = (count ? Math.round(total/count) : 0) + '%';
    },

    renderAdmin: function() {
        const m = this.data.macro;
        document.getElementById('in-pib').value = m.pib;
        document.getElementById('in-pib-target').value = m.pibTarget;
        document.getElementById('in-balanza').value = m.balanza;
        document.getElementById('in-deficit').value = m.deficit;
        document.getElementById('in-deficit-target').value = m.deficitTarget;
        document.getElementById('in-oficial').value = m.oficial;
        document.getElementById('in-paralelo').value = m.paralelo;
        document.getElementById('in-history').value = m.history.join(',');

        for(let i=0; i<5; i++) document.getElementById(`in-ipc-${i}`).value = m.ipc[i];

        const list = document.getElementById('admin-cengob-list');
        list.innerHTML = '';

        this.data.cengob.forEach((p, pIdx) => {
            const tasksHtml = p.subtasks.map((t, tIdx) => `
                <div style="display:grid; grid-template-columns:2fr 1fr 1fr auto; gap:5px; margin-bottom:5px;">
                    <input type="text" id="t-n-${pIdx}-${tIdx}" value="${t.name}">
                    <input type="text" id="t-m-${pIdx}-${tIdx}" value="${t.ministry}">
                    <input type="number" id="t-p-${pIdx}-${tIdx}" value="${t.progress}">
                    <button class="btn-del" onclick="app.delTask(${pIdx},${tIdx})">×</button>
                </div>`).join('');

            list.innerHTML += `
                <div class="subtask-editor">
                    <button class="btn-del" style="position:absolute; top:10px; right:10px;" onclick="app.delPriority(${pIdx})">🗑️</button>
                    <div style="font-weight:700; color:var(--primary); margin-bottom:10px;">Prioridad #${pIdx+1}</div>
                    <div class="row gap-10 mb-20">
                        <input type="text" id="p-title-${pIdx}" value="${p.title}" placeholder="Título">
                        <input type="text" id="p-icon-${pIdx}" value="${p.icon}" placeholder="Icono Material">
                    </div>
                    <input type="text" id="p-desc-${pIdx}" value="${p.desc}" style="margin-bottom:10px;" placeholder="Descripción">
                    <div style="background:#fff; padding:10px; border:1px solid var(--border); border-radius:8px;">
                        ${tasksHtml}
                        <button class="btn-secondary" style="font-size:0.8rem; margin-top:5px;" onclick="app.addTask(${pIdx})">+ Sub-tarea</button>
                    </div>
                </div>`;
        });
    },

    // --- ACCIONES ---
    addPriority: function() {
        this.data.cengob.push({ title: "Nueva Prioridad", desc: "...", icon: "flag", subtasks: [] });
        this.renderAdmin();
    },
    delPriority: function(idx) {
        if(confirm("¿Eliminar prioridad?")) { this.data.cengob.splice(idx,1); this.renderAdmin(); }
    },
    addTask: function(pIdx) {
        this.data.cengob[pIdx].subtasks.push({name:"Nueva", ministry:"Min.", progress:0});
        this.renderAdmin();
    },
    delTask: function(pIdx, tIdx) {
        this.data.cengob[pIdx].subtasks.splice(tIdx, 1);
        this.renderAdmin();
    },

    // --- GUARDADO & NUBE ---
    saveAllData: async function() {
        // Recoger datos del DOM
        const m = this.data.macro;
        m.pib = parseFloat(document.getElementById('in-pib').value);
        m.pibTarget = parseFloat(document.getElementById('in-pib-target').value);
        m.balanza = parseFloat(document.getElementById('in-balanza').value);
        m.deficit = parseFloat(document.getElementById('in-deficit').value);
        m.deficitTarget = parseFloat(document.getElementById('in-deficit-target').value);
        m.oficial = parseFloat(document.getElementById('in-oficial').value);
        m.paralelo = parseFloat(document.getElementById('in-paralelo').value);
        m.history = document.getElementById('in-history').value.split(',').map(Number);
        for(let i=0; i<5; i++) m.ipc[i] = parseFloat(document.getElementById(`in-ipc-${i}`).value);

        this.data.cengob.forEach((p, pIdx) => {
            p.title = document.getElementById(`p-title-${pIdx}`).value;
            p.icon = document.getElementById(`p-icon-${pIdx}`).value;
            p.desc = document.getElementById(`p-desc-${pIdx}`).value;
            p.subtasks.forEach((t, tIdx) => {
                t.name = document.getElementById(`t-n-${pIdx}-${tIdx}`).value;
                t.ministry = document.getElementById(`t-m-${pIdx}-${tIdx}`).value;
                t.progress = parseFloat(document.getElementById(`t-p-${pIdx}-${tIdx}`).value);
            });
        });

        // Guardado Local
        localStorage.setItem('sigepData', JSON.stringify(this.data));
        this.renderAll();

        // Guardado Nube (Si hay script)
        if(this.config.script_url) {
            document.getElementById('loader').classList.remove('hidden');
            try {
                // Preparar Payload para Google Sheets
                const payloadMacro = {
                    pib: m.pib, pibTarget: m.pibTarget, balanza: m.balanza,
                    deficit: m.deficit, deficitTarget: m.deficitTarget,
                    oficial: m.oficial, paralelo: m.paralelo,
                    ipc_alim: m.ipc[0], ipc_trans: m.ipc[1], ipc_salud: m.ipc[2], ipc_edu: m.ipc[3], ipc_viv: m.ipc[4],
                    history: m.history.join(',')
                };

                await fetch(this.config.script_url, {
                    method: "POST",
                    mode: "no-cors",
                    headers: { "Content-Type": "text/plain" },
                    body: JSON.stringify({ macro: payloadMacro, cengob: this.data.cengob })
                });
                alert("✅ Sincronizado con Google Sheets");
            } catch (e) {
                console.error(e);
                alert("⚠️ Guardado localmente, pero falló Google Sheets.");
            }
            document.getElementById('loader').classList.add('hidden');
        } else {
            alert("✅ Guardado localmente (Sin conexión a Sheets).");
        }
        
        this.switchTab('cengob');
    },

    fetchFromCloud: async function() {
        document.getElementById('loader').classList.remove('hidden');
        try {
            const [resM, resC] = await Promise.all([
                fetch(this.config.macro_csv),
                fetch(this.config.cengob_csv)
            ]);
            
            Papa.parse(await resM.text(), {
                header: true,
                complete: (res) => {
                    let obj = {};
                    res.data.forEach(r => { if(r.KEY) obj[r.KEY] = r.VALUE; });
                    // Mapeo
                    this.data.macro.pib = parseFloat(obj.pib);
                    this.data.macro.pibTarget = parseFloat(obj.pibTarget);
                    this.data.macro.balanza = parseFloat(obj.balanza);
                    this.data.macro.deficit = parseFloat(obj.deficit);
                    this.data.macro.deficitTarget = parseFloat(obj.deficitTarget);
                    this.data.macro.oficial = parseFloat(obj.oficial);
                    this.data.macro.paralelo = parseFloat(obj.paralelo);
                    if(obj.ipc_alim) this.data.macro.ipc = [obj.ipc_alim, obj.ipc_trans, obj.ipc_salud, obj.ipc_edu, obj.ipc_viv].map(Number);
                    if(obj.history) this.data.macro.history = obj.history.split(',').map(Number);
                    this.renderMacro();
                }
            });

            Papa.parse(await resC.text(), {
                header: true,
                complete: (res) => {
                    let map = {};
                    res.data.forEach(r => {
                        if(!r.PRIORIDAD) return;
                        if(!map[r.PRIORIDAD]) map[r.PRIORIDAD] = { title: r.PRIORIDAD, desc: r.DESC, icon: r.ICON||'flag', subtasks: [] };
                        map[r.PRIORIDAD].subtasks.push({ name: r.TAREA, ministry: r.MINISTERIO, progress: parseFloat(r.AVANCE||0) });
                    });
                    this.data.cengob = Object.values(map);
                    this.renderCengob();
                }
            });

        } catch (e) { console.error(e); }
        document.getElementById('loader').classList.add('hidden');
    },

    // --- UTILIDADES ---
    switchTab: function(tabId) {
        document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
        document.getElementById(tabId + '-tab').classList.remove('hidden');
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        
        // Logica simple para resaltar tabs
        const index = tabId === 'macro' ? 0 : (tabId === 'cengob' ? 1 : 2);
        document.querySelectorAll('.tab-btn')[index].classList.add('active');

        if(tabId === 'gestion' && this.data.auth) this.renderAdmin();
    },

    checkAuth: function() {
        if(this.data.auth) this.switchTab('gestion');
        else document.getElementById('authModal').classList.remove('hidden');
    },

    verifyAuth: function() {
        if(document.getElementById('adminPass').value === 'admin123') {
            this.data.auth = true;
            document.getElementById('authModal').classList.add('hidden');
            this.switchTab('gestion');
        } else alert("Credenciales incorrectas");
    },

    saveConfig: function() {
        this.config.macro_csv = document.getElementById('url-macro').value;
        this.config.cengob_csv = document.getElementById('url-cengob').value;
        this.config.script_url = document.getElementById('url-script').value;
        
        localStorage.setItem('sheet_macro', this.config.macro_csv);
        localStorage.setItem('sheet_cengob', this.config.cengob_csv);
        localStorage.setItem('script_url', this.config.script_url);
        
        document.getElementById('configModal').classList.add('hidden');
        location.reload();
    },

    loadDemoData: function(reload = true) {
        this.data.cengob = [
            {title: "Economía Demo", desc: "Datos de ejemplo", icon: "paid", subtasks: [{name: "Ley Fomento", ministry: "MEFP", progress: 80}]},
            {title: "Salud Digital", desc: "Integración de sistemas", icon: "health_and_safety", subtasks: [{name: "SUS Digital", ministry: "MSyD", progress: 30}]}
        ];
        if(reload) {
            this.renderAll();
            document.getElementById('configModal').classList.add('hidden');
        }
    },

    exportToCSV: function() {
        let rows = [];
        // Macro
        const m = this.data.macro;
        rows.push(`KEY,VALUE`);
        rows.push(`pib,${m.pib}`); rows.push(`pibTarget,${m.pibTarget}`);
        rows.push(`balanza,${m.balanza}`); rows.push(`deficit,${m.deficit}`);
        rows.push(`deficitTarget,${m.deficitTarget}`); rows.push(`oficial,${m.oficial}`);
        rows.push(`paralelo,${m.paralelo}`); rows.push(`history,"${m.history.join(',')}"`);
        rows.push(`ipc_alim,${m.ipc[0]}`); rows.push(`ipc_trans,${m.ipc[1]}`);
        rows.push(`ipc_salud,${m.ipc[2]}`); rows.push(`ipc_edu,${m.ipc[3]}`); rows.push(`ipc_viv,${m.ipc[4]}`);
        
        // Output Macro Link
        let csvContent = "data:text/csv;charset=utf-8," + rows.join("\n");
        let link = document.createElement("a");
        link.href = encodeURI(csvContent);
        link.download = "MACRO_BACKUP.csv";
        link.click();

        // Cengob
        rows = [];
        rows.push(`PRIORIDAD,DESC,ICON,TAREA,MINISTERIO,AVANCE`);
        this.data.cengob.forEach(p => {
            p.subtasks.forEach(t => {
                rows.push(`${p.title},${p.desc},${p.icon},${t.name},${t.ministry},${t.progress}`);
            });
        });
        
        csvContent = "data:text/csv;charset=utf-8," + rows.join("\n");
        link.href = encodeURI(csvContent);
        link.download = "CENGOB_BACKUP.csv";
        link.click();
    },
    
    importFromCSV: function(input) {
        const file = input.files[0];
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target.result;
            // Lógica simple de detección: Si tiene "PRIORIDAD", es Cengob, si tiene "KEY", es Macro
            if(text.includes("PRIORIDAD")) {
                Papa.parse(text, {header:true, complete: (r) => { 
                    // Procesar CENGOB localmente... (similar a fetchFromCloud)
                    let map = {};
                    r.data.forEach(row => {
                         if(!row.PRIORIDAD) return;
                         if(!map[row.PRIORIDAD]) map[row.PRIORIDAD] = { title: row.PRIORIDAD, desc: row.DESC, icon: row.ICON||'flag', subtasks: [] };
                         map[row.PRIORIDAD].subtasks.push({ name: row.TAREA, ministry: row.MINISTERIO, progress: parseFloat(row.AVANCE||0) });
                    });
                    this.data.cengob = Object.values(map);
                    this.renderAll();
                }});
            } else {
                Papa.parse(text, {header:true, complete: (r) => {
                    let obj = {};
                    r.data.forEach(row => { if(row.KEY) obj[row.KEY] = row.VALUE; });
                    // Actualizar Macro local
                    this.data.macro.pib = parseFloat(obj.pib);
                    // ... mapear resto ...
                    this.renderAll();
                }});
            }
            alert("CSV Importado. Recuerda guardar.");
        };
        reader.readAsText(file);
    }
};

// Arrancar
document.addEventListener('DOMContentLoaded', () => app.init());
