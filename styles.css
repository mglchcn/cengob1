const app = {
    [cite_start]// DATOS INICIALES (Backup) [cite: 16-25]
    defaultData: [
        {
            title: "Economía para todos",
            desc: "Fomento del capitalismo popular y estabilidad.",
            icon: "paid",
            subtasks: [
                {name: "10 Acciones Corto Plazo", ministry: "Min. Economía", progress: 80}, 
                {name: "Créditos SiBolivia 2.0", ministry: "MDPyEP", progress: 40}
            ]
        },
        {
            title: "Bolivia 50/50",
            desc: "Nuevo modelo de autonomías.",
            icon: "balance",
            subtasks: [
                {name: "Propuesta Pacto Fiscal", ministry: "Vicemin. Autonomías", progress: 20}
            ]
        },
        {
            title: "Bolivia Global",
            desc: "Apertura y diversificación exportadora.",
            icon: "public",
            subtasks: [
                {name: "Rueda de Negocios", ministry: "Cancillería", progress: 10}
            ]
        },
        {
            title: "Fin 'Estado-tranca'",
            desc: "Digitalización y lucha contra corrupción.",
            icon: "rocket_launch",
            subtasks: [
                {name: "Ventanilla Única", ministry: "AGETIC", progress: 30},
                {name: "Trámites Cero Papel", ministry: "Min. Presidencia", progress: 15}
            ]
        },
        {
            title: "Bolivia Sustentable",
            desc: "Litio y desarrollo verde.",
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
        if(document.getElementById('url-script')) {
            document.getElementById('url-script').value = this.config.script_url;
        }
        
        // Carga inicial: Intenta LocalStorage, si no, usa Default
        const stored = localStorage.getItem('cengobData');
        if (stored) {
            this.data = JSON.parse(stored);
        } else {
            this.data = JSON.parse(JSON.stringify(this.defaultData));
        }

        this.renderDashboard();
        
        // Si hay URL, intentamos actualizar en segundo plano
        if(this.config.script_url) this.fetchFromCloud();
    },

    // --- RENDERIZADO VISUAL (DASHBOARD) ---
    renderDashboard: function() {
        const container = document.getElementById('pillars-container');
        container.innerHTML = '';
        
        let totalProgress = 0;
        let count = 0;
        let risks = 0;
        let done = 0;
        let totalTasks = 0;

        // Limpiar gráficos anteriores para evitar fugas de memoria
        this.charts.forEach(c => c.destroy());
        this.charts = [];

        this.data.forEach((p, idx) => {
            // Cálculos
            let pVal = 0;
            if (p.subtasks.length > 0) {
                pVal = Math.round(p.subtasks.reduce((a,b)=>a+(parseFloat(b.progress)||0),0) / p.subtasks.length);
            }
            totalProgress += pVal;
            count++;
            totalTasks += p.subtasks.length;
            if(pVal < 30) risks++;
            if(pVal >= 90) done++;

            // HTML Tareas (Preview)
            const tasksHtml = p.subtasks.map(t => `
                <div class="task-row">
                    <span class="t-name">${t.name}</span>
                    <span class="t-val ${t.progress<50?'red':'green'}">${t.progress}%</span>
                </div>
            `).join('');

            const card = document.createElement('div');
            card.className = 'pillar-card';
            card.innerHTML = `
                <div class="pillar-header">
                    <div class="icon-box"><span class="material-icons-round">${p.icon}</span></div>
                    <div class="chart-mini">
                        <canvas id="chart-p-${idx}"></canvas>
                        <div class="chart-val">${pVal}%</div>
                    </div>
                </div>
                <h3>${p.title}</h3>
                <p>${p.desc}</p>
                <div class="tasks-list">${tasksHtml || '<small>Sin tareas</small>'}</div>
            `;
            container.appendChild(card);

            // Gráfico Donut Individual
            this.createChart(`chart-p-${idx}`, pVal);
        });

        // Actualizar Cabecera
        const globalAvg = count ? Math.round(totalProgress/count) : 0;
        document.getElementById('stat-total').innerText = totalTasks;
        document.getElementById('stat-risk').innerText = risks;
        document.getElementById('stat-done').innerText = done;
        document.getElementById('global-percent').innerText = globalAvg + '%';
        this.createGauge('chartGlobal', globalAvg);
    },

    // --- RENDERIZADO GESTIÓN (EDITOR) ---
    renderGestion: function() {
        const container = document.getElementById('admin-container');
        container.innerHTML = '';

        this.data.forEach((p, pIdx) => {
            // Generar filas de tareas
            let tasksHtml = '';
            p.subtasks.forEach((t, tIdx) => {
                tasksHtml += `
                    <div class="edit-row task-edit">
                        <span class="material-icons-round icon-drag">subdirectory_arrow_right</span>
                        <input type="text" class="in-task-name" value="${t.name}" placeholder="Tarea">
                        <input type="text" class="in-task-min" value="${t.ministry}" placeholder="Ministerio">
                        <input type="number" class="in-task-prog" value="${t.progress}" placeholder="%">
                        <button class="btn-del" onclick="app.deleteTask(${pIdx}, ${tIdx})">×</button>
                    </div>
                `;
            });

            // Generar bloque del pilar
            const div = document.createElement('div');
            div.className = 'admin-card';
            div.innerHTML = `
                <div class="edit-header">
                    <div class="edit-row">
                        <span class="material-icons-round">folder</span>
                        <input type="text" class="in-p-title bold" value="${p.title}" placeholder="Título Pilar">
                        <input type="text" class="in-p-icon" value="${p.icon}" placeholder="Icono" style="width:80px;">
                        <button class="btn-del-pilar" onclick="app.deletePillar(${pIdx})">Eliminar</button>
                    </div>
                    <input type="text" class="in-p-desc full" value="${p.desc}" placeholder="Descripción">
                </div>
                <div class="edit-body">
                    ${tasksHtml}
                    <button class="btn-add-task" onclick="app.addTask(${pIdx})">+ Añadir Tarea</button>
                </div>
            `;
            container.appendChild(div);
        });
    },

    // --- LÓGICA DE GUARDADO (LA CLAVE) ---
    saveData: async function() {
        // 1. RECOLECCIÓN (Harvesting)
        // Leemos el DOM actual del panel de gestión para actualizar 'this.data'
        const adminContainer = document.getElementById('admin-container');
        const pillarCards = adminContainer.getElementsByClassName('admin-card');
        
        let newData = [];

        // Iterar sobre cada tarjeta de pilar en el DOM
        Array.from(pillarCards).forEach((card) => {
            let pObj = {
                title: card.querySelector('.in-p-title').value,
                desc: card.querySelector('.in-p-desc').value,
                icon: card.querySelector('.in-p-icon').value,
                subtasks: []
            };

            // Iterar sobre las tareas dentro de este pilar
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

        // 2. ACTUALIZAR MEMORIA Y LOCALSTORAGE
        this.data = newData;
        localStorage.setItem('cengobData', JSON.stringify(this.data));

        // 3. INTENTAR NUBE
        if(this.config.script_url) {
            document.getElementById('loader').classList.remove('hidden');
            try {
                await fetch(this.config.script_url, {
                    method: 'POST',
                    mode: 'no-cors',
                    headers: {'Content-Type': 'text/plain'}, // Cambio a text/plain para evitar preflight
                    body: JSON.stringify({ cengob: this.data })
                });
                alert("✅ Guardado en Local y Nube (Sheets)");
            } catch(e) {
                console.error(e);
                alert("⚠️ Guardado en Local, pero falló la Nube.");
            }
            document.getElementById('loader').classList.add('hidden');
        } else {
            alert("✅ Guardado en Local (Configura la nube en el engranaje)");
        }

        // 4. VOLVER AL DASHBOARD
        this.showDashboard();
    },

    // --- ACCIONES DE GESTIÓN ---
    addTask: function(pIdx) {
        // Guardamos temporalmente lo que hay en pantalla antes de añadir (para no perder textos)
        this.tempSaveDOM();
        this.data[pIdx].subtasks.push({name: "", ministry: "", progress: 0});
        this.renderGestion();
    },
    deleteTask: function(pIdx, tIdx) {
        this.tempSaveDOM();
        this.data[pIdx].subtasks.splice(tIdx, 1);
        this.renderGestion();
    },
    addPillar: function() {
        this.tempSaveDOM();
        this.data.push({title: "Nuevo Pilar", desc: "", icon: "flag", subtasks: []});
        this.renderGestion();
    },
    deletePillar: function(pIdx) {
        if(!confirm("¿Borrar pilar completo?")) return;
        this.tempSaveDOM();
        this.data.splice(pIdx, 1);
        this.renderGestion();
    },

    // Función auxiliar para no perder datos al refrescar la vista de gestión
    tempSaveDOM: function() {
        // Similar a saveData pero sin persistir, solo actualiza this.data
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

    // --- NUBE (GET) ---
    fetchFromCloud: async function() {
        try {
            const res = await fetch(this.config.script_url);
            const json = await res.json();
            if(json && json.cengob) {
                this.data = json.cengob;
                this.renderDashboard(); // Actualizar si llegaron datos nuevos
                console.log("Datos actualizados desde nube");
            }
        } catch(e) {
            console.log("No se pudo conectar a la nube o formato inválido");
        }
    },

    // --- NAVEGACIÓN ---
    showDashboard: function() {
        document.getElementById('view-gestion').classList.add('hidden');
        document.getElementById('view-dashboard').classList.remove('hidden');
        this.renderDashboard();
    },
    showGestion: function() {
        // Pedir contraseña simple
        let pass = prompt("Contraseña de Ministro:");
        if(pass !== "admin123") return alert("Acceso denegado");

        document.getElementById('view-dashboard').classList.add('hidden');
        document.getElementById('view-gestion').classList.remove('hidden');
        this.renderGestion();
    },
    toggleConfig: function() { document.getElementById('configModal').classList.toggle('hidden'); },
    saveConfig: function() {
        const url = document.getElementById('url-script').value;
        this.config.script_url = url;
        localStorage.setItem('cengob_url', url);
        document.getElementById('configModal').classList.add('hidden');
        alert("URL guardada. Recarga la página si deseas probar la conexión.");
    },

    // --- GRÁFICOS ---
    createChart: function(id, val) {
        this.charts.push(new Chart(document.getElementById(id), {
            type: 'doughnut',
            data: {
                datasets: [{ data: [val, 100-val], backgroundColor: [this.getColor(val), '#e5e7eb'], borderWidth:0, cutout:'75%' }]
            },
            options: {responsive:true, maintainAspectRatio:false, plugins:{tooltip:{enabled:false}}}
        }));
    },
    createGauge: function(id, val) {
        this.charts.push(new Chart(document.getElementById(id), {
            type: 'doughnut',
            data: {
                datasets: [{ data: [val, 100-val], backgroundColor: ['#1e3a8a', '#e5e7eb'], borderWidth:0, cutout:'85%', circumference:180, rotation:270 }]
            },
            options: {responsive:true, maintainAspectRatio:false, plugins:{tooltip:{enabled:false}}}
        }));
    },
    getColor: function(val) { return val < 40 ? '#ef4444' : (val < 80 ? '#f59e0b' : '#10b981'); }
};

document.addEventListener('DOMContentLoaded', () => app.init());
