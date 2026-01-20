const app = {
    [cite_start]// [cite: 16-25] DATOS DE EJEMPLO DEL PDF (Base Inicial)
    defaultData: [
        {
            title: "Economía para todos",
            desc: "Fomento del 'capitalismo para todos' y estabilidad económica.",
            icon: "paid",
            subtasks: [
                [cite_start]{name: "10 Acciones Corto Plazo", ministry: "Min. Economía", progress: 80}, // [cite: 28]
                {name: "Créditos SiBolivia 2.0", ministry: "MDPyEP", progress: 40}
            ]
        },
        {
            title: "Bolivia 50/50",
            desc: "Nuevo modelo de administración de autonomías y descentralización.",
            icon: "balance",
            subtasks: [
                {name: "Propuesta Pacto Fiscal", ministry: "Vicemin. Autonomías", progress: 20},
                {name: "Censo Digital", ministry: "INE", progress: 10}
            ]
        },
        {
            title: "Bolivia Global",
            desc: "Apertura económica, diversificación de exportaciones e inversión.",
            icon: "public",
            subtasks: [
                {name: "Rueda de Negocios", ministry: "Cancillería", progress: 5}
            ]
        },
        {
            title: "Fin 'Estado-tranca'",
            desc: "Modernización, digitalización y lucha frontal contra la corrupción.",
            icon: "rocket_launch",
            subtasks: [
                {name: "Ventanilla Única Digital", ministry: "AGETIC", progress: 30},
                {name: "Trámites Cero Papel", ministry: "Min. Presidencia", progress: 15}
            ]
        },
        {
            title: "Bolivia Sustentable",
            desc: "Cuidado del medio ambiente, energías limpias (Litio) y desarrollo verde.",
            icon: "forest",
            subtasks: [
                {name: "Plan Litio 2026", ministry: "YLB", progress: 60}
            ]
        }
    ],

    data: [], // Aquí vivirán los datos activos
    config: { script_url: localStorage.getItem('cengob_url') || '' },
    charts: [], // Almacén de instancias Chart.js

    init: function() {
        if(document.getElementById('url-script')) {
            document.getElementById('url-script').value = this.config.script_url;
        }

        // 1. Cargar datos (Nube o Local)
        this.loadData();
    },

    loadData: async function() {
        const stored = localStorage.getItem('cengobData');
        
        // Estrategia: Si hay URL, intentamos traer de la nube (API JSON)
        // Si falla o no hay URL, usamos LocalStorage o Default
        if (this.config.script_url) {
            try {
                const res = await fetch(this.config.script_url); // doGet
                const cloudData = await res.json();
                if(cloudData && cloudData.cengob) {
                    this.data = cloudData.cengob;
                    console.log("Datos cargados de Nube");
                }
            } catch(e) {
                console.warn("Fallo nube, usando local", e);
                this.data = stored ? JSON.parse(stored) : JSON.parse(JSON.stringify(this.defaultData));
            }
        } else {
            this.data = stored ? JSON.parse(stored) : JSON.parse(JSON.stringify(this.defaultData));
        }

        this.renderDashboard();
    },

    renderDashboard: function() {
        const container = document.getElementById('pillars-container');
        container.innerHTML = '';
        this.charts = []; // Reset charts array

        let globalTotal = 0;
        let globalItems = 0;
        let risks = 0;
        let done = 0;

        // Renderizar los 5 Pilares
        this.data.forEach((p, idx) => {
            // Calcular avance del pilar
            let pVal = 0;
            if (p.subtasks.length > 0) {
                pVal = Math.round(p.subtasks.reduce((a,b)=>a+b.progress,0) / p.subtasks.length);
            }
            
            // Estadísticas globales
            globalTotal += pVal;
            globalItems++;
            if(pVal < 30) risks++;
            if(pVal === 100) done++;

            // Crear HTML de Tareas (Preview)
            const tasksHtml = p.subtasks.slice(0,3).map(t => `
                <div class="task-row">
                    <span class="task-name">${t.name}</span>
                    <span style="font-weight:700; color:${t.progress<50?'var(--danger)':'var(--success)'}">${t.progress}%</span>
                </div>
            `).join('');

            // Crear Tarjeta
            const card = document.createElement('div');
            card.className = 'pillar-card';
            card.innerHTML = `
                <div class="pillar-header">
                    <div class="icon-box"><span class="material-icons-round">${p.icon}</span></div>
                    <div class="chart-mini-container">
                        <canvas id="chart-pillar-${idx}"></canvas>
                        <div class="mini-percent">${pVal}%</div>
                    </div>
                </div>
                <div class="pillar-title">${p.title}</div>
                <div class="pillar-desc">${p.desc}</div>
                <div class="tasks-preview">
                    ${tasksHtml || '<span style="font-size:0.7rem; color:#aaa">Sin tareas asignadas</span>'}
                </div>
            `;
            container.appendChild(card);

            // Generar Gráfico de Anillo Individual
            this.createDonutChart(`chart-pillar-${idx}`, pVal);
        });

        // Actualizar Cabecera Global
        const globalAvg = globalItems ? Math.round(globalTotal / globalItems) : 0;
        document.getElementById('stat-total').innerText = this.data.reduce((a,b)=>a+b.subtasks.length, 0); // Total Tareas
        document.getElementById('stat-risk').innerText = risks;
        document.getElementById('stat-done').innerText = done;
        document.getElementById('global-percent').innerText = globalAvg + '%';
        
        // Gráfico Velocímetro Global
        this.createGaugeChart('chartGlobal', globalAvg);

        // Si estamos en modo gestión, renderizar el editor
        this.renderAdminPanel();
    },

    // --- GRÁFICOS (Chart.js) ---
    createDonutChart: function(canvasId, value) {
        new Chart(document.getElementById(canvasId), {
            type: 'doughnut',
            data: {
                labels: ['OK', 'Pendiente'],
                datasets: [{
                    data: [value, 100-value],
                    backgroundColor: [value < 40 ? '#ef4444' : (value < 80 ? '#f59e0b' : '#10b981'), '#e5e7eb'],
                    borderWidth: 0,
                    cutout: '75%'
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { enabled: false } } }
        });
    },

    createGaugeChart: function(canvasId, value) {
        new Chart(document.getElementById(canvasId), {
            type: 'doughnut',
            data: {
                labels: ['Avance', 'Restante'],
                datasets: [{
                    data: [value, 100-value],
                    backgroundColor: ['#1e3a8a', '#e5e7eb'],
                    borderWidth: 0,
                    cutout: '85%',
                    circumference: 180,
                    rotation: 270
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { enabled: false } } }
        });
    },

    // --- GESTIÓN Y EDICIÓN ---
    renderAdminPanel: function() {
        const container = document.getElementById('admin-list');
        container.innerHTML = '';

        this.data.forEach((p, pIdx) => {
            let tasksHtml = p.subtasks.map((t, tIdx) => `
                <div class="admin-task-row">
                    <input type="text" value="${t.name}" onchange="app.updateTask(${pIdx}, ${tIdx}, 'name', this.value)" placeholder="Nombre Tarea">
                    <input type="text" value="${t.ministry}" onchange="app.updateTask(${pIdx}, ${tIdx}, 'ministry', this.value)" placeholder="Ministerio">
                    <input type="number" value="${t.progress}" onchange="app.updateTask(${pIdx}, ${tIdx}, 'progress', this.value)" placeholder="%">
                </div>
            `).join('');

            container.innerHTML += `
                <div class="admin-item">
                    <div style="font-weight:700; color:var(--primary); margin-bottom:5px;">${p.title}</div>
                    <div style="font-size:0.8rem; color:var(--text-light); margin-bottom:10px;">${p.desc}</div>
                    <div style="background:#f9fafb; padding:10px; border-radius:8px;">
                        <div style="font-size:0.7rem; font-weight:700; color:var(--text-light); margin-bottom:5px;">TAREAS / MINISTERIOS</div>
                        ${tasksHtml}
                        <button class="btn-primary-sm" style="margin-top:10px; font-size:0.7rem;" onclick="app.addTask(${pIdx})">+ Agregar Tarea</button>
                    </div>
                </div>
            `;
        });
    },

    // --- LÓGICA DE ACTUALIZACIÓN DE DATOS ---
    updateTask: function(pIdx, tIdx, field, val) {
        if(field === 'progress') val = parseFloat(val);
        this.data[pIdx].subtasks[tIdx][field] = val;
        // No re-renderizamos todo para no perder foco del input, solo guardamos en memoria temporal
    },

    addTask: function(pIdx) {
        this.data[pIdx].subtasks.push({name: "Nueva Acción", ministry: "Pendiente", progress: 0});
        this.renderDashboard(); // Aquí sí re-renderizamos para ver el nuevo input
    },

    saveToCloud: async function() {
        // 1. Guardar Local
        localStorage.setItem('cengobData', JSON.stringify(this.data));

        // 2. Intentar Nube
        if (this.config.script_url) {
            document.getElementById('loader').classList.remove('hidden');
            try {
                // doPost
                await fetch(this.config.script_url, {
                    method: 'POST',
                    mode: 'no-cors',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ cengob: this.data }) // Solo enviamos estructura CENGOB
                });
                alert("✅ Sincronizado con Google Sheets");
            } catch(e) {
                console.error(e);
                alert("⚠️ Guardado localmente (Error conexión Sheets)");
            }
            document.getElementById('loader').classList.add('hidden');
        } else {
            alert("✅ Guardado localmente (Sin nube configurada)");
        }
        
        // Refrescar vista principal
        this.renderDashboard();
    },

    // --- UTILS ---
    toggleConfig: () => document.getElementById('configModal').classList.toggle('hidden'),
    
    saveConfig: function() {
        const url = document.getElementById('url-script').value;
        this.config.script_url = url;
        localStorage.setItem('cengob_url', url);
        document.getElementById('configModal').classList.add('hidden');
        this.loadData(); // Recargar con nueva fuente
    },

    checkAuth: function() {
        document.getElementById('authModal').classList.remove('hidden');
    },

    verifyAuth: function() {
        if(document.getElementById('adminPass').value === 'admin123') {
            document.getElementById('authModal').classList.add('hidden');
            document.getElementById('gestion-panel').classList.remove('hidden');
            // Scroll suave hacia abajo
            document.getElementById('gestion-panel').scrollIntoView({behavior: 'smooth'});
        } else {
            alert("Credencial inválida");
        }
    }
};

// Start
document.addEventListener('DOMContentLoaded', () => app.init());
