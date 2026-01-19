const app = {
    data: {
        auth: false,
        macro: {},
        cengob: []
    },
    
    config: {
        master_url: localStorage.getItem('sheet_master') || ''
    },

    charts: { brecha: null, ipc: null },

    init: function() {
        // Cargar configuración
        document.getElementById('url-master').value = this.config.master_url;

        if(this.config.master_url) {
            this.fetchData();
        } else {
            this.loadDefaultData(); // Carga datos del PDF si no hay Sheet
        }
    },

    // --- CARGA DE DATOS (PDF "CENGOB1.pptx") ---
    loadDefaultData: function() {
        [cite_start]// Datos extraídos del documento CENGOB1.pptx [cite: 16-25]
        this.data.macro = {
            pib: 2.1, pibTarget: 3.7, balanza: -450,
            deficit: -8.2, deficitTarget: -7.5,
            oficial: 6.96, paralelo: 10.80,
            history: [30,32,35,40,45,55], // Simulado
            ipc: [5.2, 3.1, 1.8, 0.5, 2.4] // Simulado
        };

        this.data.cengob = [
            {
                title: "Economía para todos",
                [cite_start]desc: "Fomento del 'capitalismo para todos' y estabilidad económica. [cite: 17]",
                icon: "paid",
                subtasks: [
                    {name: "10 Acciones Corto Plazo", ministry: "Min. [cite_start]Economía", progress: 10} // [cite: 28]
                ]
            },
            {
                title: "Bolivia 50/50",
                [cite_start]desc: "Nuevo modelo de administración de autonomías y descentralización. [cite: 19]",
                icon: "balance",
                subtasks: [
                    {name: "Propuesta Pacto Fiscal", ministry: "Vicemin. Autonomías", progress: 0}
                ]
            },
            {
                title: "Bolivia Global",
                [cite_start]desc: "Apertura económica, diversificación de exportaciones e inversión. [cite: 21]",
                icon: "public",
                subtasks: [
                    {name: "Rueda de Negocios", ministry: "Cancillería", progress: 0}
                ]
            },
            {
                title: "Fin 'Estado-tranca'",
                [cite_start]desc: "Modernización, digitalización y lucha frontal contra la corrupción. [cite: 23]",
                icon: "rocket_launch",
                subtasks: [
                    {name: "Ventanilla Única", ministry: "AGETIC", progress: 30}
                ]
            },
            {
                title: "Bolivia Sustentable",
                [cite_start]desc: "Cuidado del medio ambiente, energías limpias (Litio) y desarrollo verde. [cite: 25]",
                icon: "forest",
                subtasks: [
                    {name: "Plan Litio 2026", ministry: "YLB", progress: 15}
                ]
            }
        ];
        
        this.renderAll();
        document.getElementById('configModal').classList.add('hidden');
    },

    // --- FETCH DESDE GOOGLE SHEETS (SINGLE LINK) ---
    fetchData: function() {
        document.getElementById('loader').classList.remove('hidden');
        
        Papa.parse(this.config.master_url, {
            download: true,
            header: true,
            complete: (results) => {
                this.processSheetData(results.data);
                document.getElementById('loader').classList.add('hidden');
            },
            error: (err) => {
                console.error(err);
                alert("Error cargando CSV. Verifica el enlace.");
                this.loadDefaultData(); // Fallback
                document.getElementById('loader').classList.add('hidden');
            }
        });
    },

    processSheetData: function(rows) {
        // Reiniciar datos
        let macro = { pib:0, pibTarget:0, balanza:0, deficit:0, deficitTarget:0, oficial:0, paralelo:0, history:[], ipc:[] };
        let prioritiesMap = {};

        rows.forEach(row => {
            const tipo = row.TIPO ? row.TIPO.toUpperCase().trim() : '';
            
            // 1. PROCESAR MACRO
            if (tipo === 'MACRO') {
                const key = row.CLAVE;
                const val = parseFloat(row.VALOR);
                
                if(key === 'history') macro.history = row.VALOR.split(',').map(Number);
                else if(key.startsWith('ipc_')) macro.ipc.push(val);
                else if(key === 'pib') { macro.pib = val; macro.pibTarget = parseFloat(row.META_DESC); }
                else if(key === 'deficit') { macro.deficit = val; macro.deficitTarget = parseFloat(row.META_DESC); }
                else if(macro.hasOwnProperty(key)) macro[key] = val;
                
                // Mapeo directo para valores simples
                if(!macro[key] && key !== 'history' && !key.startsWith('ipc_')) macro[key] = val;
            }

            // 2. PROCESAR PRIORIDADES
            else if (tipo === 'PRIORIDAD') {
                const name = row.CLAVE;
                prioritiesMap[name] = {
                    title: name,
                    desc: row.META_DESC,
                    icon: row.EXTRA || 'flag',
                    subtasks: []
                };
            }

            // 3. PROCESAR TAREAS
            else if (tipo === 'TAREA') {
                const parent = row.CLAVE; // La clave de la tarea es el nombre de la prioridad padre
                if (prioritiesMap[parent]) {
                    prioritiesMap[parent].subtasks.push({
                        name: row.META_DESC, // Usamos META_DESC para nombre tarea
                        ministry: row.EXTRA, // EXTRA para ministerio
                        progress: parseFloat(row.VALOR || 0)
                    });
                }
            }
        });

        // Asignar y Renderizar
        this.data.macro = macro;
        this.data.cengob = Object.values(prioritiesMap);
        this.renderAll();
    },

    // --- RENDERIZADO ---
    renderAll: function() {
        this.renderMacro();
        this.renderCengob();
    },

    renderMacro: function() {
        const m = this.data.macro;
        
        // Asignar Textos
        document.getElementById('val-pib').innerText = (m.pib||0) + '%';
        document.getElementById('target-pib').innerText = 'Meta: ' + (m.pibTarget||0) + '%';
        this.setStatus('card-pib', 'badge-pib', m.pib >= m.pibTarget, 'EN META', 'DESVÍO');

        document.getElementById('val-balanza').innerText = '$' + (m.balanza||0) + 'M';
        this.setStatus('card-balanza', 'badge-balanza', m.balanza > 0, 'SUPERÁVIT', 'DÉFICIT');

        document.getElementById('val-deficit').innerText = (m.deficit||0) + '%';
        document.getElementById('target-deficit').innerText = 'Techo: ' + (m.deficitTarget||0) + '%';
        this.setStatus('card-deficit', 'badge-deficit', m.deficit >= m.deficitTarget, 'CUMPLE', 'ALERTA');

        const brecha = m.oficial ? ((m.paralelo - m.oficial) / m.oficial * 100).toFixed(1) : 0;
        document.getElementById('val-brecha').innerText = brecha + '%';
        document.getElementById('val-oficial').innerText = m.oficial;
        document.getElementById('val-paralelo').innerText = m.paralelo;
        this.setStatus('card-brecha', 'badge-brecha', brecha < 20, 'ESTABLE', 'ALTA');

        this.renderCharts(m);
    },

    setStatus: function(cardId, badgeId, condition, textGood, textBad) {
        const card = document.getElementById(cardId);
        const badge = document.getElementById(badgeId);
        const color = condition ? 'green' : 'red';
        
        card.className = `kpi-card status-${color}`;
        badge.className = `badge`;
        badge.style.background = condition ? '#dcfce7' : '#fee2e2';
        badge.style.color = condition ? '#166534' : '#991b1b';
        badge.innerText = condition ? textGood : textBad;
    },

    renderCharts: function(m) {
        const ctxB = document.getElementById('chartBrecha').getContext('2d');
        if (this.charts.brecha) this.charts.brecha.destroy();
        this.charts.brecha = new Chart(ctxB, {
            type: 'line',
            data: {
                labels: ['M1','M2','M3','M4','M5','Act'],
                datasets: [{ label: 'Brecha %', data: m.history || [], borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.1)', fill:true }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });

        const ctxI = document.getElementById('chartIPC').getContext('2d');
        if (this.charts.ipc) this.charts.ipc.destroy();
        this.charts.ipc = new Chart(ctxI, {
            type: 'bar',
            data: {
                labels: ['Alim','Trans','Salud','Edu','Viv'],
                datasets: [{ label: '%', data: m.ipc || [], backgroundColor: '#1e3a8a', borderRadius:4 }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });
    },

    renderCengob: function() {
        const container = document.getElementById('cengob-container');
        container.innerHTML = '';
        let total = 0; let count = 0;

        this.data.cengob.forEach((p, idx) => {
            // Calcular promedio
            let pProg = 0;
            if (p.subtasks.length > 0) {
                pProg = Math.round(p.subtasks.reduce((a,b)=>a+b.progress,0) / p.subtasks.length);
            }
            total += pProg; count++;

            // HTML Tareas
            const tasksHtml = p.subtasks.map(t => `
                <div class="subtask-row">
                    <div>
                        <span class="material-icons-round" style="font-size:1rem; vertical-align:middle; color:var(--primary);">arrow_right</span>
                        ${t.name} <span class="ministry-tag">${t.ministry}</span>
                    </div>
                    <div style="font-weight:700; color:${t.progress<50?'#ef4444':'#10b981'}">${t.progress}%</div>
                </div>
            `).join('');

            // HTML Tarjeta
            container.innerHTML += `
                <div class="priority-item">
                    <div class="priority-header" onclick="document.getElementById('sub-${idx}').classList.toggle('open')">
                        <span class="material-icons-round" style="font-size:2rem; color:var(--primary); margin-right:15px;">${p.icon}</span>
                        <div style="flex:1;">
                            <div style="display:flex; justify-content:space-between;">
                                <h3 style="font-size:1.1rem; font-weight:700;">${p.title}</h3>
                                <span style="font-weight:800; color:var(--primary);">${pProg}%</span>
                            </div>
                            <div style="font-size:0.85rem; color:var(--secondary); margin-top:4px;">${p.desc}</div>
                            <div class="progress-bar"><div class="progress-fill" style="width:${pProg}%"></div></div>
                        </div>
                    </div>
                    <div id="sub-${idx}" class="subtasks-list">${tasksHtml || '<p style="padding:10px; font-size:0.8rem; color:#aaa">Sin tareas definidas (Misión BID pendiente)</p>'}</div>
                </div>
            `;
        });
        
        document.getElementById('global-progress').innerText = (count ? Math.round(total/count) : 0) + '%';
    },

    // --- UTILIDADES ---
    saveConfig: function() {
        const url = document.getElementById('url-master').value;
        localStorage.setItem('sheet_master', url);
        this.config.master_url = url;
        document.getElementById('configModal').classList.add('hidden');
        this.fetchData();
    },
    
    switchTab: function(id) {
        document.querySelectorAll('.tab-content').forEach(e => e.classList.add('hidden'));
        document.getElementById(id+'-tab').classList.remove('hidden');
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        event.target.classList.add('active');
    },

    checkAuth: function() {
        document.getElementById('authModal').classList.remove('hidden');
    },

    verifyAuth: function() {
        if(document.getElementById('adminPass').value === 'admin123') {
            document.getElementById('authModal').classList.add('hidden');
            this.switchTab('gestion');
        } else {
            alert('Pass incorrecto');
        }
    }
};

// Start
document.addEventListener('DOMContentLoaded', () => app.init());
