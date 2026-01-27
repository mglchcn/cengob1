const app = {
    [cite_start]//  [cite: 16-25] DATOS BASE
    defaultData: [
        {
            title: "Economía para todos",
            desc: "Estabilidad y crecimiento.",
            icon: "paid",
            interventions: [
                {
                    name: "Shock de Inversión",
                    desc: "Reactivación obras públicas.",
                    indicator: 65, // Aguja
                    tasks: [
                        {name: "10 Acciones Cortas", ministry: "Min. Economía", progress: 80},
                        {name: "Créditos SiBolivia", ministry: "MDPyEP", progress: 40}
                    ]
                }
            ]
        },
        {
            title: "Bolivia 50/50",
            desc: "Nuevo pacto fiscal.",
            icon: "balance",
            interventions: [
                {
                    name: "Diálogo Nacional",
                    desc: "Mesas técnicas departamentales.",
                    indicator: 20,
                    tasks: [
                        {name: "Propuesta Técnica", ministry: "Autonomías", progress: 20}
                    ]
                }
            ]
        }
    ],

    data: [], 
    config: { script_url: localStorage.getItem('cengob_url') || '' },
    charts: [],

    init: function() {
        if(document.getElementById('url-script')) document.getElementById('url-script').value = this.config.script_url;
        
        const stored = localStorage.getItem('cengobData');
        this.data = stored ? JSON.parse(stored) : JSON.parse(JSON.stringify(this.defaultData));
        
        // Corrección Estructural (Migración)
        this.data.forEach(p => {
            if(!p.interventions) p.interventions = [];
        });

        this.renderDashboard();
        if(this.config.script_url) this.fetchFromCloud();
    },

    // --- RENDER DASHBOARD ---
    renderDashboard: function() {
        const container = document.getElementById('pillars-container');
        if(!container) return;
        container.innerHTML = '';
        this.charts.forEach(c => c.destroy());
        this.charts = [];

        let totalInter = 0, totalTasks = 0;

        this.data.forEach((p, pIdx) => {
            let interventionsHtml = '';
            
            p.interventions.forEach((inter, iIdx) => {
                totalInter++;
                totalTasks += (inter.tasks||[]).length;

                const tasksHtml = (inter.tasks||[]).map(t => `
                    <div class="task-row">
                        <div>
                            <span class="t-name">${t.name}</span>
                            <span class="t-badge">${t.ministry}</span>
                        </div>
                        <span class="t-val ${t.progress<50?'red':'green'}">${t.progress}%</span>
                    </div>
                `).join('');

                interventionsHtml += `
                    <div class="intervention-card">
                        <div class="intervention-info">
                            <h4>${inter.name}</h4>
                            <p>${inter.desc}</p>
                            <div class="tasks-list">${tasksHtml || '<small style="color:#aaa">Sin tareas</small>'}</div>
                        </div>
                        <div class="gauge-mini-wrapper">
                            <canvas id="gauge-p${pIdx}-i${iIdx}"></canvas>
                            <div class="gauge-mini-val">${inter.indicator}%</div>
                            <div class="gauge-label">INDICADOR</div>
                        </div>
                    </div>
                `;
            });

            const card = document.createElement('div');
            card.className = 'pillar-card';
            card.id = `pillar-${pIdx}`;
            card.innerHTML = `
                <div class="pillar-header" onclick="app.toggleAccordion(${pIdx})">
                    <div class="icon-box"><span class="material-icons-round">${p.icon}</span></div>
                    <div style="flex:1;">
                        <h3 style="margin:0 0 5px 0; font-size:1.1rem; color:var(--primary);">${p.title}</h3>
                        <p style="margin:0; font-size:0.85rem; color:var(--text-light);">${p.desc}</p>
                    </div>
                    <span class="material-icons-round accordion-icon">expand_more</span>
                </div>
                <div class="interventions-container">
                    ${interventionsHtml || '<div style="padding:20px; text-align:center; color:#aaa;">Sin intervenciones definidas</div>'}
                </div>
            `;
            container.appendChild(card);

            // Crear Gauges
            p.interventions.forEach((inter, iIdx) => {
                this.createGauge(`gauge-p${pIdx}-i${iIdx}`, inter.indicator);
            });
        });

        // Stats globales
        document.getElementById('stat-int').innerText = totalInter;
        document.getElementById('stat-task').innerText = totalTasks;
        
        // Calculo Global (Promedio de indicadores de intervención)
        let globalSum = 0;
        let globalCount = 0;
        this.data.forEach(p => p.interventions.forEach(i => { globalSum += (parseFloat(i.indicator)||0); globalCount++; }));
        const globalAvg = globalCount ? Math.round(globalSum/globalCount) : 0;
        
        document.getElementById('global-percent').innerText = globalAvg + '%';
        this.createGauge('chartGlobal', globalAvg, false);
    },

    toggleAccordion: function(idx) {
        document.getElementById(`pillar-${idx}`).classList.toggle('active');
    },

    // --- RENDER GESTIÓN (EDITOR ROBUSTO) ---
    renderGestion: function() {
        const container = document.getElementById('admin-container');
        if(!container) return;
        container.innerHTML = '';

        this.data.forEach((p, pIdx) => {
            let interventionsHtml = '';

            p.interventions.forEach((inter, iIdx) => {
                let tasksHtml = '';
                (inter.tasks || []).forEach((t, tIdx) => {
                    tasksHtml += `
                        <div class="admin-task-row">
                            <span class="material-icons-round" style="font-size:1rem; color:#cbd5e1;">subdirectory_arrow_right</span>
                            <input type="text" class="in-t-name" value="${t.name}" placeholder="Tarea">
                            <input type="text" class="in-t-min" value="${t.ministry}" placeholder="Ministerio">
                            <input type="number" class="in-t-prog" value="${t.progress}" placeholder="%">
                            <button class="btn-del" onclick="app.delTask(${pIdx}, ${iIdx}, ${tIdx})">×</button>
                        </div>
                    `;
                });

                interventionsHtml += `
                    <div class="admin-intervention-wrapper">
                        <div class="admin-intervention-header">
                            <input type="text" class="in-i-name input-bold" value="${inter.name}" placeholder="Nombre Intervención">
                            <input type="text" class="in-i-desc" value="${inter.desc}" placeholder="Descripción corta">
                            <input type="number" class="in-i-ind input-ind" value="${inter.indicator}" placeholder="%" title="Indicador Aguja">
                            <button class="btn-del" onclick="app.delIntervention(${pIdx}, ${iIdx})">🗑️</button>
                        </div>
                        <div>${tasksHtml}</div>
                        <button class="btn-add-task" onclick="app.addTask(${pIdx}, ${iIdx})">+ Añadir Tarea</button>
                    </div>
                `;
            });

            const div = document.createElement('div');
            div.className = 'admin-pilar-wrapper';
            div.innerHTML = `
                <div class="admin-pilar-header">
                    <div class="icon-box" style="width:36px; height:36px;"><span class="material-icons-round">${p.icon}</span></div>
                    <input type="text" class="in-p-title input-bold" value="${p.title}" style="font-size:1rem;">
                    <input type="text" class="in-p-desc" value="${p.desc}">
                    <input type="text" class="in-p-icon" value="${p.icon}" style="width:60px;" placeholder="Icono">
                    <button class="btn-del" style="background:#fee2e2; border-color:#fecaca; color:#b91c1c;" onclick="app.delPillar(${pIdx})">Borrar Pilar</button>
                </div>
                ${interventionsHtml}
                <button class="btn-add-inter" onclick="app.addIntervention(${pIdx})">+ Nueva Intervención</button>
            `;
            container.appendChild(div);
        });
    },

    // --- COSECHA DE DATOS (CRÍTICO: LEE EL DOM EXACTAMENTE) ---
    harvestData: function() {
        const container = document.getElementById('admin-container');
        if(!container || container.innerHTML === "") return;

        const pilarWrappers = container.getElementsByClassName('admin-pilar-wrapper');
        let newData = [];

        Array.from(pilarWrappers).forEach(pWrap => {
            let pObj = {
                title: pWrap.querySelector('.in-p-title').value,
                desc: pWrap.querySelector('.in-p-desc').value,
                icon: pWrap.querySelector('.in-p-icon').value,
                interventions: []
            };

            const interWrappers = pWrap.getElementsByClassName('admin-intervention-wrapper');
            Array.from(interWrappers).forEach(iWrap => {
                let iObj = {
                    name: iWrap.querySelector('.in-i-name').value,
                    desc: iWrap.querySelector('.in-i-desc').value,
                    indicator: parseFloat(iWrap.querySelector('.in-i-ind').value) || 0,
                    tasks: []
                };

                const taskRows = iWrap.getElementsByClassName('admin-task-row');
                Array.from(taskRows).forEach(tRow => {
                    iObj.tasks.push({
                        name: tRow.querySelector('.in-t-name').value,
                        ministry: tRow.querySelector('.in-t-min').value,
                        progress: parseFloat(tRow.querySelector('.in-t-prog').value) || 0
                    });
                });
                pObj.interventions.push(iObj);
            });
            newData.push(pObj);
        });
        this.data = newData;
    },

    // --- ACCIONES CRUD ---
    addPillar: function() { this.harvestData(); this.data.push({title:"Nuevo Eje", desc:"...", icon:"flag", interventions:[]}); this.renderGestion(); },
    delPillar: function(ix) { if(confirm("¿Eliminar Pilar?")) { this.harvestData(); this.data.splice(ix,1); this.renderGestion(); } },
    
    addIntervention: function(pix) { this.harvestData(); this.data[pix].interventions.push({name:"Nueva Intervención", desc:"...", indicator:0, tasks:[]}); this.renderGestion(); },
    delIntervention: function(pix, iix) { this.harvestData(); this.data[pix].interventions.splice(iix,1); this.renderGestion(); },

    addTask: function(pix, iix) { this.harvestData(); this.data[pix].interventions[iix].tasks.push({name:"", ministry:"", progress:0}); this.renderGestion(); },
    delTask: function(pix, iix, tix) { this.harvestData(); this.data[pix].interventions[iix].tasks.splice(tix,1); this.renderGestion(); },

    // --- GUARDADO ---
    saveData: async function() {
        this.harvestData();
        localStorage.setItem('cengobData', JSON.stringify(this.data));
        
        if(this.config.script_url) {
            document.getElementById('loader').classList.remove('hidden');
            try {
                await fetch(this.config.script_url, {
                    method: 'POST', mode: 'no-cors',
                    headers: {'Content-Type': 'text/plain'},
                    body: JSON.stringify({ cengob: this.data })
                });
                alert("✅ Guardado Nube y Local");
            } catch(e) { console.error(e); alert("⚠️ Guardado Local (Fallo Nube)"); }
            document.getElementById('loader').classList.add('hidden');
        } else {
            alert("✅ Guardado Local");
        }
        this.toggleView('dashboard');
    },

    fetchFromCloud: async function() {
        try {
            const res = await fetch(this.config.script_url);
            const json = await res.json();
            if(json && json.cengob) { this.data = json.cengob; this.renderDashboard(); }
        } catch(e) { console.log("Offline"); }
    },

    // --- UTILS ---
    toggleView: function(v) {
        const d = document.getElementById('view-dashboard');
        const g = document.getElementById('view-gestion');
        if(v==='gestion') { d.classList.add('hidden'); g.classList.remove('hidden'); this.renderGestion(); }
        else { g.classList.add('hidden'); d.classList.remove('hidden'); this.renderDashboard(); }
    },
    toggleConfig: () => document.getElementById('configModal').classList.toggle('hidden'),
    saveConfig: function() {
        const url = document.getElementById('url-script').value;
        this.config.script_url = url;
        localStorage.setItem('cengob_url', url);
        document.getElementById('configModal').classList.add('hidden');
        this.fetchFromCloud();
    },

    // --- CHART.JS ---
    createGauge: function(id, val, isMini) {
        const ctx = document.getElementById(id);
        if(!ctx) return;
        this.charts.push(new Chart(ctx, {
            type: 'doughnut',
            data: { datasets: [{ data: [val, 100-val], backgroundColor: [this.getColor(val), '#e2e8f0'], borderWidth:0, cutout: isMini?'70%':'85%', circumference:180, rotation:270 }] },
            options: { responsive:true, maintainAspectRatio:false, plugins:{tooltip:{enabled:false}} }
        }));
    },
    getColor: function(val) { return val < 40 ? '#ef4444' : (val < 80 ? '#f59e0b' : '#10b981'); }
};

document.addEventListener('DOMContentLoaded', () => app.init());
