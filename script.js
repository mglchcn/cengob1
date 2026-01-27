const app = {
    // DATOS DE EJEMPLO (ESTRUCTURA COMPLETA)
    defaultData: [
        {
            title: "Economía para todos",
            desc: "Fomento del 'capitalismo para todos'.",
            icon: "paid",
            interventions: [
                {
                    name: "Shock de Inversión",
                    desc: "Reactivación de obras paralizadas.",
                    indicator: 65, // % de avance del indicador
                    tasks: [
                        {name: "Reglamento Ley 342", ministry: "Min. Economía", progress: 100},
                        {name: "Fideicomiso PyME", ministry: "MDPyEP", progress: 40}
                    ],
                    milestones: [
                        {date: "20 Ene", desc: "Firma Convenio"},
                        {date: "15 Feb", desc: "Primer Desembolso"}
                    ]
                }
            ]
        },
        {
            title: "Bolivia 50/50",
            desc: "Nuevo pacto fiscal y autonomías.",
            icon: "balance",
            interventions: [
                {
                    name: "Diálogo Nacional",
                    desc: "Mesas técnicas con Gobernaciones.",
                    indicator: 25,
                    tasks: [
                        {name: "Cronograma de visitas", ministry: "Vicemin. Autonomías", progress: 80}
                    ],
                    milestones: [
                        {date: "30 Ene", desc: "Instalación Mesa 1"}
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
        
        // Normalización de datos (Evitar errores si faltan arrays)
        this.data.forEach(p => {
            if(!p.interventions) p.interventions = [];
            p.interventions.forEach(i => {
                if(!i.tasks) i.tasks = [];
                if(!i.milestones) i.milestones = [];
            });
        });

        this.renderDashboard();
        if(this.config.script_url) this.fetchFromCloud();
    },

    // --- VISTAS ---
    toggleView: function(view) {
        const dash = document.getElementById('view-dashboard');
        const gest = document.getElementById('view-gestion');
        if(view === 'gestion') {
            dash.classList.add('hidden');
            gest.classList.remove('hidden');
            this.renderGestion();
        } else {
            gest.classList.add('hidden');
            dash.classList.remove('hidden');
            this.renderDashboard();
        }
    },

    toggleAccordion: function(idx) {
        document.getElementById(`pillar-${idx}`).classList.toggle('active');
    },

    // --- RENDER DASHBOARD ---
    renderDashboard: function() {
        const container = document.getElementById('pillars-container');
        if(!container) return;
        container.innerHTML = '';
        this.charts.forEach(c => c.destroy());
        this.charts = [];

        let totalInter = 0, totalTasks = 0, totalMilestones = 0;
        let weightedSum = 0;

        this.data.forEach((p, pIdx) => {
            let interventionsHtml = '';
            
            p.interventions.forEach((inter, iIdx) => {
                totalInter++;
                weightedSum += parseFloat(inter.indicator) || 0;
                totalTasks += (inter.tasks||[]).length;
                totalMilestones += (inter.milestones||[]).length;

                // Tareas
                const tasksHtml = (inter.tasks||[]).map(t => `
                    <div class="task-row">
                        <span>${t.name} <span class="t-badge">${t.ministry}</span></span>
                        <span class="t-val ${t.progress>=100?'green':(t.progress<50?'red':'')}">${t.progress}%</span>
                    </div>
                `).join('');

                // Hitos
                const msHtml = (inter.milestones||[]).map(m => `
                    <div class="milestone-row">
                        <span class="material-icons-round" style="font-size:1rem; color:var(--success);">check_circle_outline</span>
                        <span class="ms-date">${m.date}</span>
                        <span class="ms-desc">${m.desc}</span>
                    </div>
                `).join('');

                interventionsHtml += `
                    <div class="intervention-card">
                        <div class="intervention-info">
                            <h4>${inter.name}</h4>
                            <p>${inter.desc}</p>
                            
                            <div class="sub-section-title">Tareas</div>
                            <div class="tasks-list">${tasksHtml || '<small>Sin tareas</small>'}</div>

                            <div class="sub-section-title" style="margin-top:15px;">Hitos</div>
                            <div class="milestones-list">${msHtml || '<small>Sin hitos</small>'}</div>
                        </div>
                        <div class="gauge-mini-wrapper">
                            <canvas id="gauge-p${pIdx}-i${iIdx}"></canvas>
                            <div class="gauge-mini-val">${inter.indicator}%</div>
                            <div class="gauge-label">AVANCE</div>
                        </div>
                    </div>
                `;
            });

            // Tarjeta Pilar
            const card = document.createElement('div');
            card.className = 'pillar-card';
            card.id = `pillar-${pIdx}`;
            card.innerHTML = `
                <div class="pillar-header" onclick="app.toggleAccordion(${pIdx})">
                    <div class="icon-box"><span class="material-icons-round">${p.icon}</span></div>
                    <div style="flex:1;">
                        <h3 style="margin:0; font-size:1.1rem; color:var(--primary);">${p.title}</h3>
                        <p style="margin:0; font-size:0.85rem; color:var(--text-light);">${p.desc}</p>
                    </div>
                    <span class="material-icons-round accordion-icon">expand_more</span>
                </div>
                <div class="interventions-container">
                    ${interventionsHtml || '<div style="padding:20px;text-align:center;">Sin intervenciones</div>'}
                </div>
            `;
            container.appendChild(card);

            // Crear Gauges
            p.interventions.forEach((inter, iIdx) => this.createGauge(`gauge-p${pIdx}-i${iIdx}`, inter.indicator, true));
        });

        // Global Stats
        const globalAvg = totalInter ? Math.round(weightedSum / totalInter) : 0;
        document.getElementById('stat-int').innerText = totalInter;
        document.getElementById('stat-milestones').innerText = totalMilestones;
        document.getElementById('global-percent').innerText = globalAvg + '%';
        this.createGauge('chartGlobal', globalAvg, false);
    },

    // --- RENDER GESTIÓN (EDITOR COMPLETO) ---
    renderGestion: function() {
        const container = document.getElementById('admin-container');
        if(!container) return;
        container.innerHTML = '';

        this.data.forEach((p, pIdx) => {
            let interventionsHtml = '';

            p.interventions.forEach((inter, iIdx) => {
                // Editor de Tareas
                let tasksHtml = (inter.tasks || []).map((t, tIdx) => `
                    <div class="admin-task-row">
                        <span class="material-icons-round" style="font-size:1rem; color:#ccc;">task</span>
                        <input type="text" class="in-t-name" value="${t.name}" placeholder="Tarea">
                        <input type="text" class="in-t-min" value="${t.ministry}" placeholder="Ministerio">
                        <input type="number" class="in-t-prog input-min-width" value="${t.progress}" placeholder="%">
                        <button class="btn-del" onclick="app.delItem('task', ${pIdx}, ${iIdx}, ${tIdx})">×</button>
                    </div>
                `).join('');

                // Editor de Hitos
                let msHtml = (inter.milestones || []).map((m, mIdx) => `
                    <div class="admin-ms-row">
                        <span class="material-icons-round" style="font-size:1rem; color:#ccc;">flag</span>
                        <input type="text" class="in-m-date input-min-width" value="${m.date}" placeholder="Fecha">
                        <input type="text" class="in-m-desc" value="${m.desc}" placeholder="Descripción Hito">
                        <button class="btn-del" onclick="app.delItem('milestone', ${pIdx}, ${iIdx}, ${mIdx})">×</button>
                    </div>
                `).join('');

                interventionsHtml += `
                    <div class="admin-intervention-wrapper">
                        <div class="admin-intervention-header">
                            <input type="text" class="in-i-name input-bold" value="${inter.name}" placeholder="Nombre Intervención">
                            <input type="text" class="in-i-desc" value="${inter.desc}" placeholder="Desc. Intervención">
                            <input type="number" class="in-i-ind input-min-width" value="${inter.indicator}" placeholder="% Ind">
                            <button class="btn-del" onclick="app.delItem('intervention', ${pIdx}, ${iIdx})">🗑️</button>
                        </div>
                        
                        <div class="edit-list-group">
                            <div style="font-size:0.7rem; font-weight:700; color:#94a3b8;">TAREAS</div>
                            ${tasksHtml}
                            <button class="btn-add-mini" onclick="app.addItem('task', ${pIdx}, ${iIdx})">+ Añadir Tarea</button>
                        </div>

                        <div class="edit-list-group" style="margin-top:10px;">
                            <div style="font-size:0.7rem; font-weight:700; color:#94a3b8;">HITOS</div>
                            ${msHtml}
                            <button class="btn-add-mini" onclick="app.addItem('milestone', ${pIdx}, ${iIdx})">+ Añadir Hito</button>
                        </div>
                    </div>
                `;
            });

            // Bloque Pilar
            const div = document.createElement('div');
            div.className = 'admin-pilar-wrapper';
            div.innerHTML = `
                <div class="admin-pilar-header">
                    <span class="material-icons-round" style="color:var(--primary);">${p.icon}</span>
                    <input type="text" class="in-p-title input-bold" value="${p.title}" placeholder="Título Pilar">
                    <input type="text" class="in-p-desc" value="${p.desc}" placeholder="Descripción Pilar">
                    <input type="text" class="in-p-icon input-min-width" value="${p.icon}" placeholder="Icono">
                    <button class="btn-del" onclick="app.delItem('pillar', ${pIdx})">×</button>
                </div>
                ${interventionsHtml}
                <button class="btn-dashed" style="padding:10px; margin-top:10px;" onclick="app.addItem('intervention', ${pIdx})">+ Nueva Intervención</button>
            `;
            container.appendChild(div);
        });
    },

    // --- HARVESTING (LECTURA DEL DOM) ---
    harvestData: function() {
        const container = document.getElementById('admin-container');
        if(!container || container.innerHTML === "") return;

        const pWrappers = container.getElementsByClassName('admin-pilar-wrapper');
        let newData = [];

        Array.from(pWrappers).forEach(pWrap => {
            let pObj = {
                title: pWrap.querySelector('.in-p-title').value,
                desc: pWrap.querySelector('.in-p-desc').value,
                icon: pWrap.querySelector('.in-p-icon').value,
                interventions: []
            };

            const iWrappers = pWrap.getElementsByClassName('admin-intervention-wrapper');
            Array.from(iWrappers).forEach(iWrap => {
                let iObj = {
                    name: iWrap.querySelector('.in-i-name').value,
                    desc: iWrap.querySelector('.in-i-desc').value,
                    indicator: parseFloat(iWrap.querySelector('.in-i-ind').value) || 0,
                    tasks: [],
                    milestones: []
                };

                // Tareas
                const tRows = iWrap.querySelectorAll('.admin-task-row');
                tRows.forEach(r => iObj.tasks.push({
                    name: r.querySelector('.in-t-name').value,
                    ministry: r.querySelector('.in-t-min').value,
                    progress: parseFloat(r.querySelector('.in-t-prog').value) || 0
                }));

                // Hitos
                const mRows = iWrap.querySelectorAll('.admin-ms-row');
                mRows.forEach(r => iObj.milestones.push({
                    date: r.querySelector('.in-m-date').value,
                    desc: r.querySelector('.in-m-desc').value
                }));

                pObj.interventions.push(iObj);
            });
            newData.push(pObj);
        });
        this.data = newData;
    },

    // --- ACCIONES CRUD ---
    addPillar: function() { this.harvestData(); this.data.push({title:"Nuevo Pilar", desc:"...", icon:"flag", interventions:[]}); this.renderGestion(); },
    
    addItem: function(type, pIdx, iIdx) {
        this.harvestData();
        if(type === 'intervention') this.data[pIdx].interventions.push({name:"Nueva Intervención", desc:"", indicator:0, tasks:[], milestones:[]});
        if(type === 'task') this.data[pIdx].interventions[iIdx].tasks.push({name:"", ministry:"", progress:0});
        if(type === 'milestone') this.data[pIdx].interventions[iIdx].milestones.push({date:"", desc:""});
        this.renderGestion();
    },

    delItem: function(type, pIdx, iIdx, xIdx) {
        this.harvestData();
        if(type === 'pillar' && confirm("¿Borrar Pilar?")) this.data.splice(pIdx, 1);
        if(type === 'intervention' && confirm("¿Borrar Intervención?")) this.data[pIdx].interventions.splice(iIdx, 1);
        if(type === 'task') this.data[pIdx].interventions[iIdx].tasks.splice(xIdx, 1);
        if(type === 'milestone') this.data[pIdx].interventions[iIdx].milestones.splice(xIdx, 1);
        this.renderGestion();
    },

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
                alert("✅ Guardado en Nube y Local");
            } catch(e) { console.error(e); alert("⚠️ Guardado solo local"); }
            document.getElementById('loader').classList.add('hidden');
        } else {
            alert("✅ Guardado local");
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
    toggleConfig: () => document.getElementById('configModal').classList.toggle('hidden'),
    saveConfig: function() {
        const url = document.getElementById('url-script').value;
        this.config.script_url = url;
        localStorage.setItem('cengob_url', url);
        document.getElementById('configModal').classList.add('hidden');
        this.fetchFromCloud();
    },

    // --- GRAFICOS ---
    createGauge: function(id, val, isMini) {
        const ctx = document.getElementById(id);
        if(!ctx) return;
        this.charts.push(new Chart(ctx, {
            type: 'doughnut',
            data: { datasets: [{ data: [val, 100-val], backgroundColor: [this.getColor(val), '#e2e8f0'], borderWidth:0, cutout: isMini?'75%':'85%', circumference:180, rotation:270 }] },
            options: { responsive:true, maintainAspectRatio:false, plugins:{tooltip:{enabled:false}} }
        }));
    },
    getColor: function(val) { return val < 40 ? '#ef4444' : (val < 80 ? '#f59e0b' : '#10b981'); }
};

document.addEventListener('DOMContentLoaded', () => app.init());
