const app = {
    // 1. DATOS DE EJEMPLO DEL DOCUMENTO CENGOB (Pre-cargados)
    // Estos datos aparecerán siempre por defecto si no hay nada guardado.
    defaultData: {
        auth: false,
        macro: {
            pib: 2.2, pibTarget: 3.7, 
            deficit: -8.1, deficitTarget: -7.5,
            oficial: 6.96, paralelo: 11.50,
            balanza: -450,
            history: [30, 32, 35, 42, 48, 55], 
            ipc: [5.2, 3.1, 1.8, 0.5, 2.4]
        },
        cengob: [
            {
                title: "Economía para todos",
                desc: "Fomento del 'capitalismo para todos' y estabilidad.",
                icon: "paid", 
                subtasks: [
                    {name: "10 Acciones Corto Plazo", ministry: "Min. Economía", progress: 80}, 
                    {name: "Créditos SiBolivia 2.0", ministry: "MDPyEP", progress: 40}
                ]
            },
            {
                title: "Bolivia 50/50",
                desc: "Nuevo modelo de administración de autonomías.",
                icon: "balance", 
                subtasks: [
                    {name: "Propuesta Pacto Fiscal", ministry: "Vicemin. Autonomías", progress: 20}
                ]
            },
            {
                title: "Bolivia Global",
                desc: "Apertura económica y diversificación de exportaciones.",
                icon: "public", 
                subtasks: [
                    {name: "Rueda Negocios", ministry: "Cancillería", progress: 10}
                ]
            },
            {
                title: "Fin 'Estado-tranca'",
                desc: "Modernización, digitalización y lucha contra corrupción.",
                icon: "rocket_launch", 
                subtasks: [
                    {name: "Ventanilla Única", ministry: "AGETIC", progress: 30},
                    {name: "Trámites Cero Papel", ministry: "Min. Presidencia", progress: 15}
                ]
            },
            {
                title: "Bolivia Sustentable",
                desc: "Cuidado ambiental, Litio y desarrollo verde.",
                icon: "forest", 
                subtasks: [
                    {name: "Plan Litio 2026", ministry: "YLB", progress: 50}
                ]
            }
        ]
    },

    data: {}, // Aquí se cargarán los datos finales
    
    config: {
        script_url: localStorage.getItem('script_url') || ''
    },

    charts: { brecha: null, ipc: null },

    // --- INICIALIZACIÓN ---
    init: function() {
        // Cargar URL guardada si existe
        if(document.getElementById('url-script')) {
            document.getElementById('url-script').value = this.config.script_url;
        }

        // Recuperar datos locales o usar los de ejemplo (Fallback)
        const stored = localStorage.getItem('sigepData');
        if (stored) {
            this.data = JSON.parse(stored);
            console.log("Cargado desde LocalStorage");
        } else {
            // CLONAR los datos por defecto para no modificar el original
            this.data = JSON.parse(JSON.stringify(this.defaultData));
            console.log("Cargado desde Default (PDF)");
        }

        // Renderizar inmediatamente
        this.renderAll();
    },

    // --- RENDERIZADO (VISTAS) ---
    renderAll: function() {
        try {
            this.renderMacro();
            this.renderCengob();
            if(this.data.auth) this.renderAdmin();
        } catch(e) {
            console.error("Error renderizando:", e);
        }
    },

    renderMacro: function() {
        const m = this.data.macro;
        if(!m) return; // Protección

        // Asignación segura de textos
        this.setText('val-pib', (m.pib || 0) + '%');
        this.setText('target-pib', 'Meta: ' + (m.pibTarget || 0) + '%');
        this.setStatus('card-pib', 'badge-pib', m.pib >= m.pibTarget, 'EN META', 'DESVÍO');

        this.setText('val-deficit', (m.deficit || 0) + '%');
        this.setText('target-deficit', 'Techo: ' + (m.deficitTarget || 0) + '%');
        this.setStatus('card-deficit', 'badge-deficit', m.deficit >= m.deficitTarget, 'CONTROLADO', 'ALERTA');

        const brecha = m.oficial ? ((m.paralelo - m.oficial) / m.oficial * 100).toFixed(1) : 0;
        this.setText('val-brecha', brecha + '%');
        this.setText('val-oficial', m.oficial);
        this.setText('val-paralelo', m.paralelo);
        this.setStatus('card-brecha', 'badge-brecha', brecha < 20, 'ESTABLE', 'ALTA');

        this.renderCharts();
    },

    setText: function(id, text) {
        const el = document.getElementById(id);
        if(el) el.innerText = text;
    },

    setStatus: function(cardId, badgeId, ok, textOk, textBad) {
        const card = document.getElementById(cardId);
        const badge = document.getElementById(badgeId);
        if(!card || !badge) return;

        card.className = `kpi-card status-${ok ? 'green' : 'red'}`;
        badge.className = 'badge';
        badge.innerText = ok ? textOk : textBad;
        badge.style.background = ok ? '#dcfce7' : '#fee2e2';
        badge.style.color = ok ? '#166534' : '#991b1b';
    },

    renderCharts: function() {
        const ctxB = document.getElementById('chartBrecha');
        const ctxI = document.getElementById('chartIPC');
        if(!ctxB || !ctxI) return;

        if(this.charts.brecha) this.charts.brecha.destroy();
        this.charts.brecha = new Chart(ctxB.getContext('2d'), {
            type: 'line',
            data: {
                labels: ['Ago','Sep','Oct','Nov','Dic','Act'],
                datasets: [{label:'Brecha %', data: this.data.macro.history || [], borderColor:'#ef4444', backgroundColor:'rgba(239,68,68,0.1)', fill:true}]
            },
            options: {responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}}
        });

        if(this.charts.ipc) this.charts.ipc.destroy();
        this.charts.ipc = new Chart(ctxI.getContext('2d'), {
            type: 'bar',
            data: {
                labels: ['Alim','Trans','Salud','Edu','Viv'],
                datasets: [{label:'%', data: this.data.macro.ipc || [], backgroundColor:'#1e3a8a', borderRadius:4}]
            },
            options: {responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}}
        });
    },

    renderCengob: function() {
        const container = document.getElementById('cengob-container');
        if(!container) return;
        
        container.innerHTML = '';
        let total = 0, count = 0;

        if(!this.data.cengob) return;

        this.data.cengob.forEach((p, idx) => {
            let pProg = 0;
            if(p.subtasks && p.subtasks.length > 0) {
                pProg = Math.round(p.subtasks.reduce((a,b)=>a+b.progress,0)/p.subtasks.length);
            }
            total += pProg; count++;

            const tasksHtml = (p.subtasks || []).map(t => `
                <div class="subtask-row">
                    <div><span class="material-icons-round" style="font-size:1rem; vertical-align:middle; color:var(--primary)">arrow_right</span> ${t.name} <span class="ministry-tag">${t.ministry}</span></div>
                    <div style="font-weight:700; color:${t.progress<50?'#ef4444':'#10b981'}">${t.progress}%</div>
                </div>`).join('');

            container.innerHTML += `
                <div class="priority-item">
                    <div class="priority-header" onclick="document.getElementById('sub-${idx}').classList.toggle('open')">
                        <span class="material-icons-round" style="font-size:2rem; color:var(--primary); margin-right:15px;">${p.icon}</span>
                        <div style="flex:1">
                            <div style="display:flex; justify-content:space-between"><h3>${p.title}</h3><span style="font-weight:800; color:var(--primary)">${pProg}%</span></div>
                            <div style="font-size:0.9rem; color:var(--secondary)">${p.desc}</div>
                            <div class="progress-bar"><div class="progress-fill" style="width:${pProg}%"></div></div>
                        </div>
                    </div>
                    <div id="sub-${idx}" class="subtasks-list">${tasksHtml || '<p style="padding:10px; color:#aaa">Sin tareas</p>'}</div>
                </div>`;
        });
        
        const globalEl = document.getElementById('global-progress');
        if(globalEl) globalEl.innerText = (count ? Math.round(total/count) : 0) + '%';
    },

    // --- RENDERIZADO ADMIN (FORMULARIOS) ---
    renderAdmin: function() {
        const m = this.data.macro;
        // Rellenar valores de forma segura
        const setVal = (id, val) => { if(document.getElementById(id)) document.getElementById(id).value = val; };

        setVal('in-pib', m.pib);
        setVal('in-pib-target', m.pibTarget);
        setVal('in-deficit', m.deficit);
        setVal('in-deficit-target', m.deficitTarget);
        setVal('in-oficial', m.oficial);
        setVal('in-paralelo', m.paralelo);
        setVal('in-history', (m.history || []).join(','));
        
        if(m.ipc) {
            for(let i=0; i<5; i++) setVal(`in-ipc-${i}`, m.ipc[i]);
        }

        const list = document.getElementById('admin-cengob-list');
        if(list) {
            list.innerHTML = '';
            (this.data.cengob || []).forEach((p, pIdx) => {
                const tasks = (p.subtasks || []).map((t, tIdx) => `
                    <div style="display:grid; grid-template-columns:2fr 1fr 1fr auto; gap:5px; margin-bottom:5px;">
                        <input type="text" id="t-n-${pIdx}-${tIdx}" value="${t.name}" onchange="app.tempSave()">
                        <input type="text" id="t-m-${pIdx}-${tIdx}" value="${t.ministry}" onchange="app.tempSave()">
                        <input type="number" id="t-p-${pIdx}-${tIdx}" value="${t.progress}" onchange="app.tempSave()">
                        <button class="btn-del" onclick="app.delTask(${pIdx},${tIdx})">×</button>
                    </div>`).join('');

                list.innerHTML += `
                    <div class="subtask-editor">
                        <button class="btn-del" style="position:absolute; top:10px; right:10px;" onclick="app.delPriority(${pIdx})">🗑️</button>
                        <div style="font-weight:700; color:var(--primary); margin-bottom:10px;">#${pIdx+1}</div>
                        <input type="text" id="p-title-${pIdx}" value="${p.title}" style="margin-bottom:5px; font-weight:700;" onchange="app.tempSave()">
                        <input type="text" id="p-desc-${pIdx}" value="${p.desc}" style="margin-bottom:5px;" onchange="app.tempSave()">
                        <input type="text" id="p-icon-${pIdx}" value="${p.icon}" placeholder="Icono" onchange="app.tempSave()">
                        <div style="background:#fff; padding:10px; border:1px solid #e2e8f0; border-radius:8px; margin-top:10px;">
                            ${tasks}
                            <button class="btn-secondary mt-10" style="font-size:0.8rem" onclick="app.addTask(${pIdx})">+ Tarea</button>
                        </div>
                    </div>`;
            });
        }
    },

    // --- ACCIONES ADMIN ---
    // Guardado Temporal en memoria para no perder datos al añadir tareas
    tempSave: function() {
        this.harvestDataFromDOM(); 
    },

    harvestDataFromDOM: function() {
        // Recoger datos del DOM al objeto data
        const m = this.data.macro;
        const getVal = (id) => parseFloat(document.getElementById(id).value) || 0;
        const getStr = (id) => document.getElementById(id).value || "";

        m.pib = getVal('in-pib');
        m.pibTarget = getVal('in-pib-target');
        m.deficit = getVal('in-deficit');
        m.deficitTarget = getVal('in-deficit-target');
        m.oficial = getVal('in-oficial');
        m.paralelo = getVal('in-paralelo');
        m.history = getStr('in-history').split(',').map(Number);
        
        for(let i=0; i<5; i++) m.ipc[i] = getVal(`in-ipc-${i}`);

        this.data.cengob.forEach((p, pIdx) => {
            const titleEl = document.getElementById(`p-title-${pIdx}`);
            if(titleEl) { // Solo si el elemento existe (estamos en modo edición)
                p.title = getStr(`p-title-${pIdx}`);
                p.desc = getStr(`p-desc-${pIdx}`);
                p.icon = getStr(`p-icon-${pIdx}`);
                p.subtasks.forEach((t, tIdx) => {
                    t.name = getStr(`t-n-${pIdx}-${tIdx}`);
                    t.ministry = getStr(`t-m-${pIdx}-${tIdx}`);
                    t.progress = getVal(`t-p-${pIdx}-${tIdx}`);
                });
            }
        });
    },

    addPriority: function() { this.harvestDataFromDOM(); this.data.cengob.push({title:"Nueva", desc:"...", icon:"flag", subtasks:[]}); this.renderAdmin(); },
    delPriority: function(idx) { if(confirm("¿Eliminar?")) { this.harvestDataFromDOM(); this.data.cengob.splice(idx,1); this.renderAdmin(); } },
    addTask: function(idx) { this.harvestDataFromDOM(); this.data.cengob[idx].subtasks.push({name:"Nueva", ministry:"Min.", progress:0}); this.renderAdmin(); },
    delTask: function(pIdx, tIdx) { this.harvestDataFromDOM(); this.data.cengob[pIdx].subtasks.splice(tIdx,1); this.renderAdmin(); },

    // --- GUARDADO NUBE ---
    saveToCloud: async function() {
        this.harvestDataFromDOM(); // 1. Recoger últimos cambios
        
        // 2. Guardar Localmente (Siempre funciona)
        localStorage.setItem('sigepData', JSON.stringify(this.data));
        
        // 3. Intentar Nube
        if(!this.config.script_url) {
            alert("✅ Guardado SOLO en este navegador. \n(Para guardar en Nube, configura la URL en el engranaje)");
            this.renderAll();
            this.switchTab('cengob');
            return;
        }

        document.getElementById('loader').classList.remove('hidden');
        try {
            await fetch(this.config.script_url, {
                method: 'POST',
                mode: 'no-cors', // Importante para Google Scripts
                headers: {'Content-Type': 'text/plain'},
                body: JSON.stringify(this.data)
            });
            alert("✅ Datos guardados y enviados a Google Sheets.");
        } catch(e) {
            console.error(e);
            alert("⚠️ Error de conexión con la nube. Se guardó localmente.");
        }
        document.getElementById('loader').classList.add('hidden');
        this.renderAll();
        this.switchTab('cengob');
    },

    saveConfig: function() {
        const url = document.getElementById('url-script').value;
        this.config.script_url = url;
        localStorage.setItem('script_url', url);
        document.getElementById('configModal').classList.add('hidden');
        alert("Configuración guardada.");
    },

    // --- UTILIDADES ---
    switchTab: function(id) {
        document.querySelectorAll('.tab-content').forEach(e => e.classList.add('hidden'));
        document.getElementById(id+'-tab').classList.remove('hidden');
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        event.target.classList.add('active');
        if(id === 'gestion' && this.data.auth) this.renderAdmin();
    },
    checkAuth: function() { this.data.auth ? this.switchTab('gestion') : document.getElementById('authModal').classList.remove('hidden'); },
    verifyAuth: function() { 
        if(document.getElementById('adminPass').value === 'admin123') {
            this.data.auth = true; document.getElementById('authModal').classList.add('hidden'); this.switchTab('gestion');
        } else alert("Error");
    }
};

document.addEventListener('DOMContentLoaded', () => app.init());
