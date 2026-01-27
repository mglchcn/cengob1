const app = {
    // --- DATOS INICIALES (3 NIVELES) ---
    [cite_start]//  [cite: 16-25] Datos del CENGOB1.pptx reestructurados
    defaultData: [
        {
            title: "Economía para todos",
            desc: "Fomento del 'capitalismo para todos' y estabilidad.",
            icon: "paid",
            interventions: [
                {
                    name: "Shock de Inversión Pública",
                    desc: "Reactivación inmediata de obras.",
                    indicator: 60, // Valor de la aguja de esta intervención
                    tasks: [
                        {name: "10 Acciones Corto Plazo", ministry: "Min. Economía", progress: 80},
                        {name: "Créditos SiBolivia 2.0", ministry: "MDPyEP", progress: 40}
                    ]
                }
            ]
        },
        {
            title: "Bolivia 50/50",
            desc: "Nuevo modelo de administración de autonomías.",
            icon: "balance",
            interventions: [
                {
                    name: "Pacto Fiscal",
                    desc: "Mesa de diálogo nacional.",
                    indicator: 20,
                    tasks: [
                        {name: "Propuesta Técnica", ministry: "Vicemin. Autonomías", progress: 20}
                    ]
                }
            ]
        },
        {
            title: "Bolivia Global",
            desc: "Apertura económica y diversificación.",
            icon: "public",
            interventions: [
                {
                    name: "Atracción de Capitales",
                    desc: "Mejora del clima de inversión.",
                    indicator: 5,
                    tasks: [
                        {name: "Rueda de Negocios", ministry: "Cancillería", progress: 5}
                    ]
                }
            ]
        },
        {
            title: "Fin 'Estado-tranca'",
            desc: "Modernización y digitalización.",
            icon: "rocket_launch",
            interventions: [
                {
                    name: "Gobierno Electrónico",
                    desc: "Cero filas y cero papel.",
                    indicator: 25,
                    tasks: [
                        {name: "Ventanilla Única", ministry: "AGETIC", progress: 30},
                        {name: "Trámites Digitales", ministry: "Min. Presidencia", progress: 20}
                    ]
                }
            ]
        },
        {
            title: "Bolivia Sustentable",
            desc: "Cuidado ambiental y Litio.",
            icon: "forest",
            interventions: [
                {
                    name: "Industrialización Litio",
                    desc: "Aceleración de plantas.",
                    indicator: 55,
                    tasks: [
                        {name: "Plan Litio 2026", ministry: "YLB", progress: 55}
                    ]
                }
            ]
        }
    ],

    data: [], 
    config: { script_url: localStorage.getItem('cengob_url') || '' },
    charts: [], // Para almacenar instancias y destruirlas

    init: function() {
        if(document.getElementById('url-script')) document.getElementById('url-script').value = this.config.script_url;
        
        const stored = localStorage.getItem('cengobData');
        this.data = stored ? JSON.parse(stored) : JSON.parse(JSON.stringify(this.defaultData));

        // Migración de datos viejos (si el usuario tenía estructura antigua)
        // Esto evita errores si ya guardaste datos con la versión anterior
        this.data.forEach(p => {
            if(!p.interventions) {
                p.interventions = [{
                    name: "Intervención General", 
                    desc: "Acciones consolidadas", 
                    indicator: 0, 
                    tasks: p.subtasks || []
                }];
                delete p.subtasks; // Limpiar estructura vieja
            }
        });

        this.renderDashboard();
        if(this.config.script_url) this.fetchFromCloud();
    },

    // --- RENDER DASHBOARD (NUEVA ESTRUCTURA) ---
    renderDashboard: function() {
        const container = document.getElementById('pillars-container');
        if(!container) return;
        container.innerHTML = '';
        
        // Limpiar gráficos
        this.charts.forEach(c => c.destroy());
        this.charts = [];

        let totalInterventions = 0;
        let totalTasks = 0;
        let weightedSum = 0;

        this.data.forEach((p, pIdx) => {
            // Renderizar Intervenciones (Nivel 2)
            let interventionsHtml = '';
            
            p.interventions.forEach((inter, iIdx) => {
                totalInterventions++;
                weightedSum += parseFloat(inter.indicator) || 0;
                totalTasks += (inter.tasks || []).length;

                // Renderizar Tareas (Nivel 3)
                const tasksHtml = (inter.tasks || []).map(t => `
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
                            <div class="tasks-list">
                                ${tasksHtml || '<small style="color:#aaa">Sin tareas</small>'}
                            </div>
                        </div>
                        <div class="gauge-mini-wrapper">
                            <canvas id="gauge-p${pIdx}-i${iIdx}"></canvas>
                            <div class="gauge-mini-val">${inter.indicator}%</div>
                            <div class="gauge-label">Indicador</div>
                        </div>
                    </div>
                `;
            });

            // Tarjeta Pilar (Acordeón)
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
                    ${interventionsHtml}
                </div>
            `;
            container.appendChild(card);

            // Crear Gauges para cada intervención de este pilar
            p.interventions.forEach((inter, iIdx) => {
                this.createGauge(`gauge-p${pIdx}-i${iIdx}`, inter.indicator, true);
            });
        });

        // Global Stats
        const globalAvg = totalInterventions ? Math.round(weightedSum / totalInterventions) : 0;
        document.getElementById('stat-interventions').innerText = totalInterventions;
        document.getElementById('stat-tasks').innerText = totalTasks;
        document.getElementById('global-percent').innerText = globalAvg + '%';
        this.createGauge('chartGlobal', globalAvg, false);
    },

    toggleAccordion: function(idx) {
        document.getElementById(`pillar-${idx}`).classList.toggle('active');
    },

    // --- RENDER GESTIÓN (FORMULARIO 3 NIVELES) ---
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
                        <div class="task-edit">
                            <span class="material-icons-round" style="font-size:1rem; color:#ccc;">subdirectory_arrow_right</span>
                            <input type="text" class="in-task-name" value="${t.name}" placeholder="Tarea">
                            <input type="text" class="in-task-min" value="${t.ministry}" placeholder="Ministerio" style="width:100px;">
                            <input type="number" class="in-task-prog" value="${t.progress}" placeholder="%" style="width:60px;">
                            <button class="btn-del" onclick="app.delTask(${pIdx}, ${iIdx}, ${tIdx})">×</button>
                        </div>
                    `;
                });

                interventionsHtml += `
                    <div class="admin-intervention">
                        <div style="display:flex; gap:10px; margin-bottom:5px;">
                            <input type="text" class="in-inter-title" value="${inter.name}" placeholder="Nombre Intervención">
                            <input type="number" class="in-inter-ind" value="${inter.indicator}" placeholder="Ind %" style="width:70px;" title="Indicador Aguja">
                            <button class="btn-del" onclick="app.delIntervention(${pIdx}, ${iIdx})">🗑️</button>
                        </div>
                        <input type="text" class="in-inter-desc" value="${inter.desc}" placeholder="Descripción Intervención">
                        <div style="margin-top:10px;">${tasksHtml}</div>
                        <button class="btn-add-task" onclick="app.addTask(${pIdx}, ${iIdx})">+ Añadir Tarea</button>
                    </div>
                `;
            });

            const div = document.createElement('div');
            div.className = 'admin-card';
            div.innerHTML = `
                <div class="admin-header-pilar">
                    <div style="display:flex; gap:10px; margin-bottom:5px;">
                        <input type="text" class="in-p-title" value="${p.title}" style="font-weight:800;">
                        <input type="text" class="in-p-icon" value="${p.icon}" style="width:80px;" placeholder="Icono">
                        <button class="btn-del" onclick="app.delPillar(${pIdx})">×</button>
                    </div>
                    <input type="text" class="in-p-desc" value="${p.desc}">
                </div>
                <div style="padding:10px;">
                    ${interventionsHtml}
                    <button class="btn-add-inter" onclick="app.addIntervention(${pIdx})">+ Nueva Intervención</button>
                </div>
            `;
            container.appendChild(div);
        });
    },

    // --- COSECHA DE DATOS (3 NIVELES) ---
    harvestData: function() {
        const container = document.getElementById('admin-container');
        if(!container || container.innerHTML === "") return;

        const pillarCards = container.getElementsByClassName('admin-card');
        let newData = [];

        Array.from(pillarCards).forEach(pCard => {
            let pObj = {
                title: pCard.querySelector('.in-p-title').value,
                desc: pCard.querySelector('.in-p-desc').value,
                icon: pCard.querySelector('.in-p-icon').value,
                interventions: []
            };

            const interCards = pCard.getElementsByClassName('admin-intervention');
            Array.from(interCards).forEach(iCard => {
                let iObj = {
                    name: iCard.querySelector('.in-inter-title').value,
                    desc: iCard.querySelector('.in-inter-desc').value,
                    indicator: parseFloat(iCard.querySelector('.in-inter-ind').value) || 0,
                    tasks: []
                };

                const taskRows = iCard.getElementsByClassName('task-edit');
                Array.from(taskRows).forEach(tRow => {
                    iObj.tasks.push({
                        name: tRow.querySelector('.in-task-name').value,
                        ministry: tRow.querySelector('.in-task-min').value,
                        progress: parseFloat(tRow.querySelector('.in-task-prog').value) || 0
                    });
                });
                pObj.interventions.push(iObj);
            });
            newData.push(pObj);
        });
        this.data = newData;
    },

    // --- ACCIONES CRUD ---
    addPillar: function() { this.harvestData(); this.data.push({title:"Nuevo Pilar", desc:"...", icon:"flag", interventions:[]}); this.renderGestion(); },
    delPillar: function(ix) { if(confirm("¿Borrar?")) { this.harvestData(); this.data.splice(ix,1); this.renderGestion(); } },
    
    addIntervention: function(pIx) { this.harvestData(); this.data[pIx].interventions.push({name:"Nueva Intervención", desc:"...", indicator:0, tasks:[]}); this.renderGestion(); },
    delIntervention: function(pIx, iIx) { this.harvestData(); this.data[pIx].interventions.splice(iIx, 1); this.renderGestion(); },

    addTask: function(pIx, iIx) { this.harvestData(); this.data[pIx].interventions[iIx].tasks.push({name:"", ministry:"", progress:0}); this.renderGestion(); },
    delTask: function(pIx, iIx, tIx) { this.harvestData(); this.data[pIx].interventions[iIx].tasks.splice(tIx, 1); this.renderGestion(); },

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
                    body: JSON.stringify({ cengob: this.data }) // Envía la nueva estructura
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
            if(json && json.cengob) {
                // Adaptador si vienen datos viejos
                this.data = json.cengob; 
                this.renderDashboard();
            }
        } catch(e) { console.log("Offline/Sin Nube"); }
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

    // --- GRAFICOS (Gauge) ---
    createGauge: function(id, val, isMini) {
        const ctx = document.getElementById(id);
        if(!ctx) return;
        this.charts.push(new Chart(ctx, {
            type: 'doughnut',
            data: {
                datasets: [{
                    data: [val, 100-val],
                    backgroundColor: [this.getColor(val), '#e5e7eb'],
                    borderWidth: 0,
                    cutout: isMini ? '70%' : '85%',
                    circumference: 180,
                    rotation: 270
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { tooltip: { enabled: false } }
            }
        }));
    },
    getColor: function(val) { return val < 40 ? '#ef4444' : (val < 80 ? '#f59e0b' : '#10b981'); }
};

document.addEventListener('DOMContentLoaded', () => app.init());
