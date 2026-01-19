const app = {
    data: {
        auth: false,
        macro: {},
        cengob: []
    },
    
    config: {
        script_url: localStorage.getItem('script_url') || ''
    },

    charts: { brecha: null, ipc: null },

    init: function() {
        // Cargar URL guardada
        document.getElementById('url-script').value = this.config.script_url;
        
        // 1. Cargar datos del documento (Default)
        this.loadExampleData();
        
        // 2. Renderizar inicial
        this.renderAll();
    },

    // --- CARGA DE DATOS DE EJEMPLO (CENGOB1.PPTX) ---
    loadExampleData: function() {
        [cite_start]// [cite: 16-25] Datos extraídos de las 5 Promesas
        [cite_start]// [cite: 33-41] Fechas extraídas del Timeline de Enero
        this.data.macro = {
            pib: 2.2, pibTarget: 3.7, 
            deficit: -8.1, deficitTarget: -7.5,
            oficial: 6.96, paralelo: 11.50,
            history: [30,32,35,42,48,55], // Simulación tendencia
            ipc: [5.2, 3.1, 1.8, 0.5, 2.4]
        };

        this.data.cengob = [
            {
                title: "Economía para todos",
                desc: "Fomento del 'capitalismo para todos' y estabilidad.",
                [cite_start]icon: "paid", // [cite: 16]
                subtasks: [
                    [cite_start]{name: "10 Acciones Corto Plazo", ministry: "Min. Economía", progress: 80}, // [cite: 28]
                    {name: "Créditos SiBolivia 2.0", ministry: "MDPyEP", progress: 40}
                ]
            },
            {
                title: "Bolivia 50/50",
                desc: "Nuevo modelo de administración de autonomías.",
                [cite_start]icon: "balance", // [cite: 18]
                subtasks: [
                    {name: "Propuesta Pacto Fiscal", ministry: "Vicemin. Autonomías", progress: 20}
                ]
            },
            {
                title: "Bolivia Global",
                desc: "Apertura económica y diversificación de exportaciones.",
                [cite_start]icon: "public", // [cite: 20]
                subtasks: [
                    {name: "Rueda Negocios", ministry: "Cancillería", progress: 10}
                ]
            },
            {
                title: "Fin 'Estado-tranca'",
                desc: "Modernización, digitalización y lucha contra corrupción.",
                [cite_start]icon: "rocket_launch", // [cite: 22]
                subtasks: [
                    {name: "Ventanilla Única", ministry: "AGETIC", progress: 30},
                    {name: "Trámites Cero Papel", ministry: "Min. Presidencia", progress: 15}
                ]
            },
            {
                title: "Bolivia Sustentable",
                desc: "Cuidado ambiental, Litio y desarrollo verde.",
                [cite_start]icon: "forest", // [cite: 24]
                subtasks: [
                    {name: "Plan Litio 2026", ministry: "YLB", progress: 50}
                ]
            }
        ];
    },

    // --- RENDERIZADO (VISTAS) ---
    renderAll: function() {
        this.renderMacro();
        this.renderCengob();
        if(this.data.auth) this.renderAdmin();
    },

    renderMacro: function() {
        const m = this.data.macro;
        document.getElementById('val-pib').innerText = m.pib + '%';
        document.getElementById('target-pib').innerText = 'Meta: ' + m.pibTarget + '%';
        this.setStatus('card-pib', 'badge-pib', m.pib >= m.pibTarget, 'EN META', 'DESVÍO');

        document.getElementById('val-deficit').innerText = m.deficit + '%';
        document.getElementById('target-deficit').innerText = 'Techo: ' + m.deficitTarget + '%';
        this.setStatus('card-deficit', 'badge-deficit', m.deficit >= m.deficitTarget, 'CONTROLADO', 'ALERTA');

        const brecha = ((m.paralelo - m.oficial) / m.oficial * 100).toFixed(1);
        document.getElementById('val-brecha').innerText = brecha + '%';
        document.getElementById('val-oficial').innerText = m.oficial;
        document.getElementById('val-paralelo').innerText = m.paralelo;
        this.setStatus('card-brecha', 'badge-brecha', brecha < 20, 'ESTABLE', 'ALTA');

        this.renderCharts();
    },

    setStatus: function(cardId, badgeId, ok, textOk, textBad) {
        const card = document.getElementById(cardId);
        const badge = document.getElementById(badgeId);
        card.className = `kpi-card status-${ok ? 'green' : 'red'}`;
        badge.className = 'badge';
        badge.innerText = ok ? textOk : textBad;
        badge.style.background = ok ? '#dcfce7' : '#fee2e2';
        badge.style.color = ok ? '#166534' : '#991b1b';
    },

    renderCharts: function() {
        const ctxB = document.getElementById('chartBrecha').getContext('2d');
        if(this.charts.brecha) this.charts.brecha.destroy();
        this.charts.brecha = new Chart(ctxB, {
            type: 'line',
            data: {
                labels: ['Ago','Sep','Oct','Nov','Dic','Act'],
                datasets: [{label:'Brecha %', data: this.data.macro.history, borderColor:'#ef4444', backgroundColor:'rgba(239,68,68,0.1)', fill:true}]
            },
            options: {responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}}
        });

        const ctxI = document.getElementById('chartIPC').getContext('2d');
        if(this.charts.ipc) this.charts.ipc.destroy();
        this.charts.ipc = new Chart(ctxI, {
            type: 'bar',
            data: {
                labels: ['Alim','Trans','Salud','Edu','Viv'],
                datasets: [{label:'%', data: this.data.macro.ipc, backgroundColor:'#1e3a8a', borderRadius:4}]
            },
            options: {responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}}
        });
    },

    renderCengob: function() {
        const container = document.getElementById('cengob-container');
        container.innerHTML = '';
        let total = 0, count = 0;

        this.data.cengob.forEach((p, idx) => {
            let pProg = 0;
            if(p.subtasks.length > 0) pProg = Math.round(p.subtasks.reduce((a,b)=>a+b.progress,0)/p.subtasks.length);
            total += pProg; count++;

            const tasksHtml = p.subtasks.map(t => `
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
        document.getElementById('global-progress').innerText = (count ? Math.round(total/count) : 0) + '%';
    },

    // --- RENDERIZADO ADMIN (FORMULARIOS) ---
    renderAdmin: function() {
        const m = this.data.macro;
        document.getElementById('in-pib').value = m.pib;
        document.getElementById('in-pib-target').value = m.pibTarget;
        document.getElementById('in-deficit').value = m.deficit;
        document.getElementById('in-deficit-target').value = m.deficitTarget;
        document.getElementById('in-oficial').value = m.oficial;
        document.getElementById('in-paralelo').value = m.paralelo;
        document.getElementById('in-history').value = m.history.join(',');
        for(let i=0; i<5; i++) document.getElementById(`in-ipc-${i}`).value = m.ipc[i];

        const list = document.getElementById('admin-cengob-list');
        list.innerHTML = '';
        this.data.cengob.forEach((p, pIdx) => {
            const tasks = p.subtasks.map((t, tIdx) => `
                <div style="display:grid; grid-template-columns:2fr 1fr 1fr auto; gap:5px; margin-bottom:5px;">
                    <input type="text" id="t-n-${pIdx}-${tIdx}" value="${t.name}">
                    <input type="text" id="t-m-${pIdx}-${tIdx}" value="${t.ministry}">
                    <input type="number" id="t-p-${pIdx}-${tIdx}" value="${t.progress}">
                    <button class="btn-del" onclick="app.delTask(${pIdx},${tIdx})">×</button>
                </div>`).join('');

            list.innerHTML += `
                <div class="subtask-editor">
                    <button class="btn-del" style="position:absolute; top:10px; right:10px;" onclick="app.delPriority(${pIdx})">🗑️</button>
                    <div style="font-weight:700; color:var(--primary); margin-bottom:10px;">#${pIdx+1}</div>
                    <input type="text" id="p-title-${pIdx}" value="${p.title}" style="margin-bottom:5px; font-weight:700;">
                    <input type="text" id="p-desc-${pIdx}" value="${p.desc}" style="margin-bottom:5px;">
                    <input type="text" id="p-icon-${pIdx}" value="${p.icon}" placeholder="Icono">
                    <div style="background:#fff; padding:10px; border:1px solid #e2e8f0; border-radius:8px; margin-top:10px;">
                        ${tasks}
                        <button class="btn-secondary mt-10" style="font-size:0.8rem" onclick="app.addTask(${pIdx})">+ Tarea</button>
                    </div>
                </div>`;
        });
    },

    // --- ACCIONES ADMIN ---
    addPriority: function() { this.data.cengob.push({title:"Nueva", desc:"...", icon:"flag", subtasks:[]}); this.renderAdmin(); },
    delPriority: function(idx) { if(confirm("¿Eliminar?")) { this.data.cengob.splice(idx,1); this.renderAdmin(); } },
    addTask: function(idx) { this.data.cengob[idx].subtasks.push({name:"Nueva", ministry:"Min.", progress:0}); this.renderAdmin(); },
    delTask: function(pIdx, tIdx) { this.data.cengob[pIdx].subtasks.splice(tIdx,1); this.renderAdmin(); },

    // --- GUARDADO NUBE ---
    saveToCloud: async function() {
        if(!this.config.script_url) return alert("Configura la URL del Script primero (Engranaje)");
        
        // 1. Recoger datos de Inputs
        const m = this.data.macro;
        m.pib = parseFloat(document.getElementById('in-pib').value);
        m.pibTarget = parseFloat(document.getElementById('in-pib-target').value);
        m.deficit = parseFloat(document.getElementById('in-deficit').value);
        m.deficitTarget = parseFloat(document.getElementById('in-deficit-target').value);
        m.oficial = parseFloat(document.getElementById('in-oficial').value);
        m.paralelo = parseFloat(document.getElementById('in-paralelo').value);
        m.history = document.getElementById('in-history').value.split(',').map(Number);
        for(let i=0; i<5; i++) m.ipc[i] = parseFloat(document.getElementById(`in-ipc-${i}`).value);

        this.data.cengob.forEach((p, pIdx) => {
            p.title = document.getElementById(`p-title-${pIdx}`).value;
            p.desc = document.getElementById(`p-desc-${pIdx}`).value;
            p.icon = document.getElementById(`p-icon-${pIdx}`).value;
            p.subtasks.forEach((t, tIdx) => {
                t.name = document.getElementById(`t-n-${pIdx}-${tIdx}`).value;
                t.ministry = document.getElementById(`t-m-${pIdx}-${tIdx}`).value;
                t.progress = parseFloat(document.getElementById(`t-p-${pIdx}-${tIdx}`).value);
            });
        });

        // 2. Enviar
        document.getElementById('loader').classList.remove('hidden');
        try {
            await fetch(this.config.script_url, {
                method: 'POST',
                mode: 'no-cors',
                headers: {'Content-Type': 'text/plain'},
                body: JSON.stringify(this.data)
            });
            alert("✅ Datos enviados a Google Sheets.");
            this.renderAll();
            this.switchTab('cengob');
        } catch(e) {
            console.error(e);
            alert("❌ Error de conexión");
        }
        document.getElementById('loader').classList.add('hidden');
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
    },
    saveConfig: function() {
        const url = document.getElementById('url-script').value;
        localStorage.setItem('script_url', url);
        this.config.script_url = url;
        document.getElementById('configModal').classList.add('hidden');
    }
};

document.addEventListener('DOMContentLoaded', () => app.init());
