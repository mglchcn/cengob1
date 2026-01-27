const app = {
    // DATOS DE EJEMPLO (Se usarán si no hay nada en la nube)
    defaultData: [
        {
            title: "Economía para todos",
            desc: "Fomento del 'capitalismo para todos'.",
            icon: "paid",
            interventions: [
                {
                    name: "Shock de Inversión",
                    desc: "Reactivación de obras públicas.",
                    indName: "% Ejecución Física",
                    indicator: 65,
                    tasks: [{name: "Reglamento Ley 342", ministry: "Min. Economía", progress: 100}],
                    milestones: [{date: "20 Ene", desc: "Firma Convenio"}]
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
        
        // Normalización de datos para evitar errores
        this.data.forEach(p => {
            if(!p.interventions) p.interventions = [];
            p.interventions.forEach(i => {
                if(!i.tasks) i.tasks = [];
                if(!i.milestones) i.milestones = [];
                if(!i.indName) i.indName = "Indicador";
            });
        });

        this.renderDashboard();
        if(this.config.script_url) this.fetchFromCloud();
    },

    // --- VISTAS ---
    toggleView: function(view) {
        document.getElementById('view-dashboard').classList.toggle('hidden', view === 'gestion');
        document.getElementById('view-gestion').classList.toggle('hidden', view !== 'gestion');
        if(view === 'gestion') this.renderGestion();
        else this.renderDashboard();
    },

    toggleAccordion: function(idx) {
        document.getElementById(`pillar-${idx}`).classList.toggle('active');
    },

    // --- RENDER DASHBOARD (VISTA SOLO LECTURA) ---
    renderDashboard: function() {
        const container = document.getElementById('pillars-container');
        if(!container) return;
        container.innerHTML = '';
        this.charts.forEach(c => c.destroy());
        this.charts = [];

        let totalInter = 0, totalMilestones = 0;

        this.data.forEach((p, pIdx) => {
            let pilarSum = 0, pilarCount = 0;
            let interventionsHtml = '';
            
            p.interventions.forEach((inter, iIdx) => {
                totalInter++;
                totalMilestones += (inter.milestones||[]).length;
                pilarSum += parseFloat(inter.indicator) || 0;
                pilarCount++;

                const tasksHtml = (inter.tasks||[]).map(t => `
                    <div class="task-row">
                        <span>${t.name} <span class="t-badge">${t.ministry}</span></span>
                    </div>`).join('');

                const msHtml = (inter.milestones||[]).map(m => `
                    <div class="ms-row">
                        <span class="material-icons-round" style="font-size:1rem; color:var(--success);">check_circle</span>
                        <span class="ms-date">${m.date}</span>
                        <span>${m.desc}</span>
                    </div>`).join('');

                interventionsHtml += `
                    <div class="intervention-card">
                        <div class="intervention-info">
                            <h4>${inter.name}</h4>
                            <div class="indicator-highlight">
                                <span class="material-icons-round" style="font-size:1rem;">analytics</span>
                                ${inter.indName}: <strong>${inter.indicator}%</strong>
                            </div>
                            <p>${inter.desc}</p>
                            
                            <div class="sub-section-title">Tareas Clave</div>
                            <div class="tasks-list">${tasksHtml || '<small>Sin tareas</small>'}</div>

                            <div class="sub-section-title">Hitos</div>
                            <div class="milestones-list">${msHtml || '<small>-</small>'}</div>
                        </div>
                        <div class="gauge-mini-wrapper">
                            <canvas id="gauge-p${pIdx}-i${iIdx}"></canvas>
                            <div class="gauge-mini-val">${inter.indicator}%</div>
                            <div class="gauge-label">META</div>
                        </div>
                    </div>
                `;
            });

            const pilarAvg = pilarCount > 0 ? Math.round(pilarSum / pilarCount) : 0;
            const card = document.createElement('div');
            card.className = 'pillar-card';
            card.id = `pillar-${pIdx}`;
            card.innerHTML = `
                <div class="pillar-header" onclick="app.toggleAccordion(${pIdx})">
                    <div class="icon-box"><span class="material-icons-round">${p.icon}</span></div>
                    <div style="flex:1;">
                        <h3 style="margin:0; font-size:1.2rem; color:var(--primary);">${p.title}</h3>
                        <p style="margin:0; font-size:0.9rem; color:var(--text-light);">${p.desc}</p>
                    </div>
                    <div class="gauge-pillar-wrapper">
                        <canvas id="gauge-pillar-${pIdx}"></canvas>
                        <div class="gauge-pillar-val">${pilarAvg}%</div>
                    </div>
                    <span class="material-icons-round accordion-icon">expand_more</span>
                </div>
                <div class="interventions-container">
                    ${interventionsHtml || '<div style="padding:20px;text-align:center;">Sin intervenciones</div>'}
                </div>
            `;
            container.appendChild(card);
            this.createGauge(`gauge-pillar-${pIdx}`, pilarAvg, false);
            p.interventions.forEach((inter, iIdx) => {
                this.createGauge(`gauge-p${pIdx}-i${iIdx}`, inter.indicator, true);
            });
        });

        document.getElementById('stat-int').innerText = totalInter;
        document.getElementById('stat-milestones').innerText = totalMilestones;
    },

    // --- RENDER GESTIÓN (EDITOR MEJORADO CON ETIQUETAS) ---
    renderGestion: function() {
        const container = document.getElementById('admin-container');
        if(!container) return;
        container.innerHTML = '';

        this.data.forEach((p, pIdx) => {
            let interventionsHtml = '';

            p.interventions.forEach((inter, iIdx) => {
                let tasksHtml = (inter.tasks || []).map((t, tIdx) => `
                    <div class="admin-task-row">
                        <input type="text" class="in-t-name" value="${t.name}" placeholder="Nombre de Tarea">
                        <input type="text" class="in-t-min" value="${t.ministry}" placeholder="Responsable / Ministerio">
                        <button class="btn-del" onclick="app.delItem('task', ${pIdx}, ${iIdx}, ${tIdx})">×</button>
                    </div>
                `).join('');

                let msHtml = (inter.milestones || []).map((m, mIdx) => `
                    <div class="admin-ms-row">
                        <input type="text" class="in-m-date input-min" value="${m.date}" placeholder="Fecha (ej: 20 Oct)">
                        <input type="text" class="in-m-desc" value="${m.desc}" placeholder="Descripción del Hito">
                        <button class="btn-del" onclick="app.delItem('milestone', ${pIdx}, ${iIdx}, ${mIdx})">×</button>
                    </div>
                `).join('');

                // BLOQUE DE INTERVENCIÓN CON ETIQUETAS
                interventionsHtml += `
                    <div class="admin-intervention-wrapper">
                        <div class="admin-intervention-header">
                            <div class="admin-int-row-1">
                                <div style="flex:2;">
                                    <label class="lbl">Nombre Intervención</label>
                                    <input type="text" class="in-i-name input-bold" value="${inter.name}">
                                </div>
                                <div style="flex:1;">
                                    <label class="lbl">% Avance</label>
                                    <input type="number" class="in-i-ind input-min" value="${inter.indicator}">
                                </div>
                                <div style="display:flex; align-items:flex-end;">
                                    <button class="btn-del" onclick="app.delItem('intervention', ${pIdx}, ${iIdx})">Borrar</button>
                                </div>
                            </div>
                            <div class="admin-int-row-2">
                                <div style="flex:2;">
                                    <label class="lbl">Descripción detallada</label>
                                    <input type="text" class="in-i-desc" value="${inter.desc}">
                                </div>
                                <div style="flex:1;">
                                    <label class="lbl">Etiqueta Indicador</label>
                                    <input type="text" class="in-i-indname" value="${inter.indName}">
                                </div>
                            </div>
                        </div>
                        
                        <div class="edit-list-group">
                            <label class="lbl-small">Tareas y Responsables</label>
                            ${tasksHtml}
                            <button class="btn-add-mini" onclick="app.addItem('task', ${pIdx}, ${iIdx})">+ Añadir Tarea</button>
                        </div>
                        <div class="edit-list-group" style="margin-top:10px;">
                            <label class="lbl-small">Hitos y Fechas</label>
                            ${msHtml}
                            <button class="btn-add-mini" onclick="app.addItem('milestone', ${pIdx}, ${iIdx})">+ Añadir Hito</button>
                        </div>
                    </div>
                `;
            });

            // BLOQUE DE PILAR
            const div = document.createElement('div');
            div.className = 'admin-pilar-wrapper';
            div.innerHTML = `
                <div class="admin-pilar-header">
                    <div style="flex:1;">
                        <label class="lbl">Título del Pilar</label>
                        <input type="text" class="in-p-title input-bold" value="${p.title}">
                    </div>
                    <div style="flex:2;">
                        <label class="lbl">Descripción del Pilar</label>
                        <input type="text" class="in-p-desc" value="${p.desc}">
                    </div>
                    <div style="display:flex; align-items:flex-end;">
                        <button class="btn-del" onclick="app.delItem('pillar', ${pIdx})">×</button>
                    </div>
                </div>
                ${interventionsHtml}
                <button class="btn-dashed" style="padding:10px; margin-top:10px;" onclick="app.addItem('intervention', ${pIdx})">+ Añadir Nueva Intervención</button>
            `;
            container.appendChild(div);
        });
    },

    // --- COSECHA DATOS (SIN CAMBIOS) ---
    harvestData: function() {
        const container = document.getElementById('admin-container');
        if(!container || container.innerHTML === "") return;

        const pWrappers = container.getElementsByClassName('admin-pilar-wrapper');
        let newData = [];

        Array.from(pWrappers).forEach(pWrap => {
            let pObj = {
                title: pWrap.querySelector('.in-p-title').value,
                desc: pWrap.querySelector('.in-p-desc').value,
                icon: 'flag', // Icono por defecto
                interventions: []
            };

            const iWrappers = pWrap.getElementsByClassName('admin-intervention-wrapper');
            Array.from(iWrappers).forEach(iWrap => {
                let iObj = {
                    name: iWrap.querySelector('.in-i-name').value,
                    indName: iWrap.querySelector('.in-i-indname').value,
                    desc: iWrap.querySelector('.in-i-desc').value,
                    indicator: parseFloat(iWrap.querySelector('.in-i-ind').value) || 0,
                    tasks: [],
                    milestones: []
                };

                const tRows = iWrap.querySelectorAll('.admin-task-row');
                tRows.forEach(r => iObj.tasks.push({
                    name: r.querySelector('.in-t-name').value,
                    ministry: r.querySelector('.in-t-min').value,
                    progress: 0
                }));

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
    addPillar: function() { this.harvestData(); this.data.push({title:"Nuevo Pilar", desc:"Descripción corta", icon:"flag", interventions:[]}); this.renderGestion(); },
    addItem: function(type, pIdx, iIdx) {
        this.harvestData();
        if(type === 'intervention') this.data[pIdx].interventions.push({name:"Nueva Intervención", indName:"% Avance", desc:"", indicator:0, tasks:[], milestones:[]});
        if(type === 'task') this.data[pIdx].interventions[iIdx].tasks.push({name:"", ministry:""});
        if(type === 'milestone') this.data[pIdx].interventions[iIdx].milestones.push({date:"", desc:""});
        this.renderGestion();
    },
    delItem: function(type, pIdx, iIdx, xIdx) {
        this.harvestData();
        if(type === 'pillar' && confirm("¿Borrar todo el pilar?")) this.data.splice(pIdx, 1);
        if(type === 'intervention' && confirm("¿Borrar intervención?")) this.data[pIdx].interventions.splice(iIdx, 1);
        if(type === 'task') this.data[pIdx].interventions[iIdx].tasks.splice(xIdx, 1);
        if(type === 'milestone') this.data[pIdx].interventions[iIdx].milestones.splice(xIdx, 1);
        this.renderGestion();
    },

    // --- GUARDAR Y SINCRONIZAR ---
    saveData: async function() {
        this.harvestData();
        localStorage.setItem('cengobData', JSON.stringify(this.data));
        
        if(this.config.script_url) {
            document.getElementById('loader').classList.remove('hidden');
            try {
                // Enviamos los datos con 'no-cors' para evitar errores simples de CORS en GAS
                await fetch(this.config.script_url, {
                    method: 'POST',
                    mode: 'no-cors', 
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(this.data) // Enviamos el array directo
                });
                alert("✅ Sincronizado con Google Sheets");
            } catch(e) { 
                console.error(e);
                alert("⚠️ Guardado localmente. Error al conectar con Nube."); 
            }
            document.getElementById('loader').classList.add('hidden');
        } else {
            alert("✅ Guardado localmente");
        }
        this.toggleView('dashboard');
    },

    fetchFromCloud: async function() {
        try {
            const res = await fetch(this.config.script_url);
            const json = await res.json();
            // El script de Google debe devolver la estructura { data: [...] } o directo el array
            if(json.data) {
                 this.data = json.data; 
                 this.renderDashboard();
                 localStorage.setItem('cengobData', JSON.stringify(this.data));
            }
        } catch(e) { console.log("Modo Offline o Error de conexión"); }
    },

    toggleConfig: () => document.getElementById('configModal').classList.toggle('hidden'),
    saveConfig: function() {
        const url = document.getElementById('url-script').value;
        this.config.script_url = url;
        localStorage.setItem('cengob_url', url);
        document.getElementById('configModal').classList.add('hidden');
        this.fetchFromCloud(); // Intenta bajar datos al configurar
    },

    // --- GAUGE (GRÁFICOS) ---
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
