const app = {
    defaultData: [
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
            desc: "Apertura económica y diversificación exportadora.",
            icon: "public",
            subtasks: [
                {name: "Rueda de Negocios", ministry: "Cancillería", progress: 10}
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
            desc: "Cuidado del medio ambiente, energías limpias (Litio).",
            icon: "forest",
            subtasks: [
                {name: "Plan Litio 2026", ministry: "YLB", progress: 60}
            ]
        }
    ],

    data: [], 
    config: { script_url: localStorage.getItem('cengob_url') || '' },
    charts: [],

    init: function() {
        console.log("Iniciando App...");
        if(document.getElementById('url-script')) document.getElementById('url-script').value = this.config.script_url;

        const stored = localStorage.getItem('cengobData');
        this.data = stored ? JSON.parse(stored) : JSON.parse(JSON.stringify(this.defaultData));

        this.renderDashboard();
        if(this.config.script_url) this.fetchFromCloud();
    },

    toggleView: function(viewName) {
        const dashboard = document.getElementById('view-dashboard');
        const gestion = document.getElementById('view-gestion');
        if (viewName === 'gestion') {
            dashboard.classList.add('hidden');
            gestion.classList.remove('hidden');
            this.renderGestion(); 
        } else {
            gestion.classList.add('hidden');
            dashboard.classList.remove('hidden');
            this.renderDashboard(); 
        }
    },

    // --- RENDER DASHBOARD (CON ACORDEÓN) ---
    renderDashboard: function() {
        const container = document.getElementById('pillars-container');
        if(!container) return;
        container.innerHTML = '';
        this.charts.forEach(c => c.destroy());
        this.charts = [];

        let totalProgress = 0, count = 0, risks = 0, done = 0, totalTasks = 0;

        this.data.forEach((p, idx) => {
            let pVal = 0;
            if (p.subtasks.length > 0) {
                pVal = Math.round(p.subtasks.reduce((a,b)=>a+(parseFloat(b.progress)||0),0) / p.subtasks.length);
            }
            totalProgress += pVal; count++; totalTasks += p.subtasks.length;
            if(pVal < 30) risks++; if(pVal >= 90) done++;

            const tasksHtml = p.subtasks.map(t => `
                <div class="task-row">
                    <div>
                        <span class="t-name">${t.name}</span>
                        <div style="font-size:0.7rem; color:#6b7280; margin-top:2px;">${t.ministry}</div>
                    </div>
                    <span class="t-val ${t.progress<50?'red':'green'}">${t.progress}%</span>
                </div>
            `).join('');

            const card = document.createElement('div');
            card.className = 'pillar-card';
            card.id = `pillar-card-${idx}`;
            
            // Estructura Acordeón
            card.innerHTML = `
                <div class="pillar-header" onclick="app.toggleAccordion(${idx})">
                    <div class="icon-box"><span class="material-icons-round">${p.icon}</span></div>
                    <div style="flex:1;">
                        <h3 style="margin:0 0 5px 0; font-size:1rem; color:var(--primary);">${p.title}</h3>
                        <p style="margin:0; font-size:0.85rem; color:var(--text-light); line-height:1.3;">${p.desc}</p>
                        <div class="progress-bar"><div class="progress-fill" style="width:${pVal}%"></div></div>
                    </div>
                    <div class="chart-mini">
                        <canvas id="chart-p-${idx}"></canvas>
                        <div class="chart-val">${pVal}%</div>
                    </div>
                    <span class="material-icons-round accordion-icon">expand_more</span>
                </div>
                <div class="tasks-list">${tasksHtml || '<small style="display:block;text-align:center">Sin tareas</small>'}</div>
            `;
            container.appendChild(card);
            this.createChart(`chart-p-${idx}`, pVal);
        });

        const globalAvg = count ? Math.round(totalProgress/count) : 0;
        document.getElementById('stat-total').innerText = totalTasks;
        document.getElementById('stat-risk').innerText = risks;
        document.getElementById('stat-done').innerText = done;
        document.getElementById('global-percent').innerText = globalAvg + '%';
        this.createGauge('chartGlobal', globalAvg);
    },

    // --- ACCIÓN ACORDEÓN ---
    toggleAccordion: function(idx) {
        const card = document.getElementById(`pillar-card-${idx}`);
        card.classList.toggle('active');
    },

    // --- RENDER GESTIÓN ---
    renderGestion: function() {
        const container = document.getElementById('admin-container');
        if(!container) return;
        container.innerHTML = '';

        this.data.forEach((p, pIdx) => {
            let tasksHtml = '';
            p.subtasks.forEach((t, tIdx) => {
                tasksHtml += `
                    <div class="edit-row task-edit">
                        <span class="material-icons-round icon-drag">subdirectory_arrow_right</span>
                        <input type="text" class="in-task-name" value="${t.name}" placeholder="Nombre Tarea">
                        <input type="text" class="in-task-min" value="${t.ministry}" placeholder="Ministerio">
                        <input type="number" class="in-task-prog" value="${t.progress}" placeholder="%">
                        <button class="btn-del" onclick="app.deleteTask(${pIdx}, ${tIdx})">×</button>
                    </div>`;
            });

            const div = document.createElement('div');
            div.className = 'admin-card';
            div.innerHTML = `
                <div class="edit-header">
                    <div class="edit-row">
                        <span class="material-icons-round">folder</span>
                        <input type="text" class="in-p-title bold" value="${p.title}" placeholder="Título Pilar">
                        <input type="text" class="in-p-icon" value="${p.icon}" placeholder="Icono" style="width:100px;">
                        <button class="btn-del-pilar" onclick="app.deletePillar(${pIdx})">Borrar</button>
                    </div>
                    <input type="text" class="in-p-desc full" value="${p.desc}" placeholder="Descripción">
                </div>
                <div class="edit-body">
                    ${tasksHtml}
                    <button class="btn-add-task" onclick="app.addTask(${pIdx})">+ Añadir Tarea</button>
                </div>`;
            container.appendChild(div);
        });
    },

    // --- COSECHA DATOS (CRUD) ---
    harvestData: function() {
        const adminContainer = document.getElementById('admin-container');
        if(!adminContainer || adminContainer.innerHTML === "") return; 
        
        const pillarCards = adminContainer.getElementsByClassName('admin-card');
        let newData = [];
        Array.from(pillarCards).forEach((card) => {
            let pObj = {
                title: card.querySelector('.in-p-title').value,
                desc: card.querySelector('.in-p-desc').value,
                icon: card.querySelector('.in-p-icon').value,
                subtasks: []
            };
            const taskRows = card.getElementsByClassName('task-edit');
            Array.from(taskRows).forEach((row) => {
                pObj.subtasks.push({
                    name: row.querySelector('.in-task-name').value,
                    ministry: row.querySelector('.in-task-min').value,
                    progress: parseFloat(row.querySelector('.in-task-prog').value) || 0
                });
            });
            newData.push(pObj);
        });
        this.data = newData;
    },

    addTask: function(pIdx) { this.harvestData(); this.data[pIdx].subtasks.push({name: "", ministry: "", progress: 0}); this.renderGestion(); },
    deleteTask: function(pIdx, tIdx) { this.harvestData(); this.data[pIdx].subtasks.splice(tIdx, 1); this.renderGestion(); },
    addPillar: function() { this.harvestData(); this.data.push({title: "Nuevo Eje", desc: "", icon: "flag", subtasks: []}); this.renderGestion(); },
    deletePillar: function(pIdx) { if(!confirm("¿Borrar pilar?")) return; this.harvestData(); this.data.splice(pIdx, 1); this.renderGestion(); },

    saveData: async function() {
        this.harvestData();
        localStorage.setItem('cengobData', JSON.stringify(this.data));
        if(this.config.script_url) {
            document.getElementById('loader').classList.remove('hidden');
            try {
                await fetch(this.config.script_url, { method: 'POST', mode: 'no-cors', headers: {'Content-Type': 'text/plain'}, body: JSON.stringify({ cengob: this.data }) });
                alert("✅ Guardado en Nube");
            } catch(e) { console.error(e); alert("⚠️ Guardado solo local"); }
            document.getElementById('loader').classList.add('hidden');
        } else { alert("✅ Guardado local"); }
        this.toggleView('dashboard');
    },

    fetchFromCloud: async function() {
        try {
            const res = await fetch(this.config.script_url);
            const json = await res.json();
            if(json && json.cengob) { this.data = json.cengob; this.renderDashboard(); }
        } catch(e) { console.log("Sin conexión nube"); }
    },

    toggleConfig: () => document.getElementById('configModal').classList.toggle('hidden'),
    saveConfig: function() {
        const url = document.getElementById('url-script').value;
        this.config.script_url = url;
        localStorage.setItem('cengob_url', url);
        document.getElementById('configModal').classList.add('hidden');
        alert("Configuración guardada.");
        this.fetchFromCloud();
    },

    createChart: function(id, val) {
        new Chart(document.getElementById(id), { type: 'doughnut', data: { datasets: [{ data: [val, 100-val], backgroundColor: [this.getColor(val), '#e5e7eb'], borderWidth:0, cutout:'75%' }] }, options: {responsive:true, maintainAspectRatio:false, plugins:{tooltip:{enabled:false}}} });
    },
    createGauge: function(id, val) {
        new Chart(document.getElementById(id), { type: 'doughnut', data: { datasets: [{ data: [val, 100-val], backgroundColor: ['#1e3a8a', '#e5e7eb'], borderWidth:0, cutout:'85%', circumference:180, rotation:270 }] }, options: {responsive:true, maintainAspectRatio:false, plugins:{tooltip:{enabled:false}}} });
    },
    getColor: function(val) { return val < 40 ? '#ef4444' : (val < 80 ? '#f59e0b' : '#10b981'); }
};

document.addEventListener('DOMContentLoaded', () => app.init());
