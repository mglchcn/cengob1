const app = {
    // DATOS DE EJEMPLO
    defaultData: [
        {
            title: "Reactivación Económica",
            desc: "Impulso a la industria nacional y empleo.",
            icon: "trending_up",
            interventions: [
                {
                    name: "Crédito SI-BOLIVIA",
                    desc: "Sustitución de importaciones.",
                    indName: "% Colocación",
                    indicator: 85,
                    indResultado: "Bs 1.200M colocados",
                    indProducto: "4.500 PyMEs beneficiadas",
                    criticalPath: "Fondeo Fideicomiso",
                    tasks: [], milestones: []
                }
            ]
        }
    ],

    data: [], 
    config: { script_url: localStorage.getItem('cengob_url') || '' },
    charts: [],
    carouselInterval: null,
    carouselIndex: 0,
    isCarouselMode: false,

    init: function() {
        if(document.getElementById('url-script')) document.getElementById('url-script').value = this.config.script_url;
        
        const stored = localStorage.getItem('cengobData');
        this.data = stored ? JSON.parse(stored) : JSON.parse(JSON.stringify(this.defaultData));
        this.normalizeData();

        this.renderDashboard();
        this.updateGlobalKPIs();
        
        if(this.config.script_url) this.fetchFromCloud();

        // Escuchar teclado para salir de carrusel (ESC)
        document.addEventListener('keydown', (e) => {
            if(e.key === 'Escape' && this.isCarouselMode) this.toggleCarousel();
        });
    },

    normalizeData: function() {
        this.data.forEach(p => {
            if(!p.interventions) p.interventions = [];
            p.interventions.forEach(i => {
                if(!i.tasks) i.tasks = [];
                if(!i.milestones) i.milestones = [];
                if(!i.indName) i.indName = "Avance";
                if(!i.indResultado) i.indResultado = "";
                if(!i.indProducto) i.indProducto = "";
                if(!i.criticalPath) i.criticalPath = "";
            });
        });
    },

    // --- LÓGICA DE VISTAS ---
    toggleView: function(view) {
        if(this.isCarouselMode) this.toggleCarousel(); // Apagar carrusel si cambia vista
        document.getElementById('view-dashboard').classList.toggle('hidden', view === 'gestion');
        document.getElementById('view-gestion').classList.toggle('hidden', view !== 'gestion');
        if(view === 'gestion') this.renderGestion();
        else { this.renderDashboard(); this.updateGlobalKPIs(); }
    },

    toggleConfig: () => document.getElementById('configModal').classList.toggle('hidden'),

    // --- CARRUSEL AUTOMÁTICO ---
    toggleCarousel: function() {
        const btn = document.getElementById('icon-play');
        const container = document.getElementById('view-dashboard');
        const bar = document.getElementById('carousel-status-bar');
        
        this.isCarouselMode = !this.isCarouselMode;
        
        if(this.isCarouselMode) {
            btn.innerText = "stop_circle";
            container.classList.add('carousel-mode');
            bar.classList.remove('hidden');
            // Fullscreen opcional
            if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen();
            this.startCarouselLoop();
        } else {
            btn.innerText = "play_circle";
            container.classList.remove('carousel-mode');
            bar.classList.add('hidden');
            if (document.exitFullscreen) document.exitFullscreen();
            this.stopCarouselLoop();
            // Mostrar todos de nuevo
            document.querySelectorAll('.pillar-card').forEach(c => c.classList.remove('active-slide'));
        }
    },

    startCarouselLoop: function() {
        this.carouselIndex = 0;
        this.showSlide(0);
        
        // Loop cada 10 seg
        this.carouselInterval = setInterval(() => {
            this.carouselIndex = (this.carouselIndex + 1) % this.data.length;
            this.showSlide(this.carouselIndex);
        }, 10000); // 10 segundos
    },

    stopCarouselLoop: function() {
        clearInterval(this.carouselInterval);
        document.getElementById('carousel-bar').style.width = '0%';
    },

    showSlide: function(idx) {
        const cards = document.querySelectorAll('.pillar-card');
        cards.forEach((c, i) => {
            c.classList.toggle('active-slide', i === idx);
        });
        
        // Reiniciar barra de progreso css
        const bar = document.getElementById('carousel-bar');
        bar.style.transition = 'none';
        bar.style.width = '0%';
        setTimeout(() => {
            bar.style.transition = 'width 10s linear';
            bar.style.width = '100%';
        }, 50);
    },

    // --- KPIS GLOBALES ---
    updateGlobalKPIs: function() {
        let totalSum = 0, count = 0, alerts = 0;
        this.data.forEach(p => {
            p.interventions.forEach(i => {
                let val = parseFloat(i.indicator) || 0;
                totalSum += val;
                count++;
                if(i.criticalPath && val < 50) alerts++; // Lógica simple de alerta
            });
        });
        const globalAvg = count > 0 ? Math.round(totalSum / count) : 0;
        document.getElementById('kpi-global').innerText = globalAvg + "%";
        document.getElementById('kpi-alerts').innerText = alerts;
    },

    // --- RENDER DASHBOARD (MASTER GRID) ---
    renderDashboard: function() {
        const container = document.getElementById('pillars-container');
        if(!container) return;
        container.innerHTML = '';
        this.charts.forEach(c => c.destroy());
        this.charts = [];

        this.data.forEach((p, pIdx) => {
            let pilarSum = 0, pilarCount = 0;
            let interventionsHtml = '';
            
            p.interventions.forEach((inter, iIdx) => {
                pilarSum += parseFloat(inter.indicator) || 0;
                pilarCount++;
                
                // Tags dinámicos
                let tags = '';
                if(inter.indResultado) tags += `<span class="tag res"><span class="material-icons-round" style="font-size:10px">ads_click</span> ${inter.indResultado}</span>`;
                if(inter.indProducto) tags += `<span class="tag prod"><span class="material-icons-round" style="font-size:10px">inventory_2</span> ${inter.indProducto}</span>`;
                if(inter.criticalPath) tags += `<span class="tag crit"><span class="material-icons-round" style="font-size:10px">warning</span> ${inter.criticalPath}</span>`;

                interventionsHtml += `
                    <div class="int-row">
                        <div class="int-chart">
                            <canvas id="chart-p${pIdx}-i${iIdx}"></canvas>
                            <div class="int-val-center">${inter.indicator}%</div>
                        </div>
                        <div class="int-details">
                            <h4>${inter.name}</h4>
                            <p>${inter.desc}</p>
                            <div class="strategic-tags">${tags}</div>
                        </div>
                    </div>
                `;
            });

            const pilarAvg = pilarCount > 0 ? Math.round(pilarSum / pilarCount) : 0;
            const color = this.getColor(pilarAvg);

            const card = document.createElement('div');
            card.className = 'pillar-card';
            card.innerHTML = `
                <div class="p-header">
                    <div class="p-title-box">
                        <div class="p-icon"><span class="material-icons-round">${p.icon}</span></div>
                        <div>
                            <h3 style="margin:0; font-size:1.1rem; color:var(--primary);">${p.title}</h3>
                            <span style="font-size:0.8rem; color:var(--text-muted);">${p.interventions.length} Intervenciones</span>
                        </div>
                    </div>
                    <div class="p-gauge-box">
                        <canvas id="gauge-pillar-${pIdx}"></canvas>
                        <div class="p-gauge-val">${pilarAvg}%</div>
                    </div>
                </div>
                <div class="p-body">
                    ${interventionsHtml || '<div style="text-align:center;color:#ccc;font-size:0.8rem;">Sin datos</div>'}
                </div>
            `;
            container.appendChild(card);

            // Renderizar Gráficos
            this.createGauge(`gauge-pillar-${pIdx}`, pilarAvg, true);
            p.interventions.forEach((inter, iIdx) => {
                this.createGauge(`chart-p${pIdx}-i${iIdx}`, inter.indicator, false);
            });
        });
    },

    // --- RENDER EDITOR (FORMULARIO) ---
    renderGestion: function() {
        const container = document.getElementById('admin-container');
        if(!container) return;
        container.innerHTML = '';

        this.data.forEach((p, pIdx) => {
            let interventionsHtml = '';
            p.interventions.forEach((inter, iIdx) => {
                interventionsHtml += `
                    <div class="admin-intervention-wrapper" style="border-left:4px solid var(--accent); padding:15px; margin-top:15px; background:#f8fafc;">
                        <div style="display:grid; grid-template-columns: 2fr 1fr auto; gap:10px; margin-bottom:10px;">
                            <div><label>Nombre Intervención</label><input type="text" class="in-i-name" value="${inter.name}"></div>
                            <div><label>% Avance</label><input type="number" class="in-i-ind" value="${inter.indicator}"></div>
                            <div style="display:flex; align-items:flex-end;"><button class="icon-btn" onclick="app.delItem('intervention', ${pIdx}, ${iIdx})" style="color:var(--danger)">delete</button></div>
                        </div>
                        <div style="margin-bottom:10px;"><label>Descripción</label><input type="text" class="in-i-desc" value="${inter.desc}"></div>
                        
                        <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:10px;">
                            <div><label style="color:#059669">Ind. Resultado</label><input type="text" class="in-i-res" value="${inter.indResultado}"></div>
                            <div><label style="color:#2563eb">Ind. Producto</label><input type="text" class="in-i-prod" value="${inter.indProducto}"></div>
                            <div><label style="color:#dc2626">Ruta Crítica</label><input type="text" class="in-i-path" value="${inter.criticalPath}"></div>
                        </div>
                    </div>
                `;
            });

            const div = document.createElement('div');
            div.className = 'admin-pilar-wrapper';
            div.innerHTML = `
                <div style="display:flex; gap:15px; align-items:center; border-bottom:1px solid #eee; padding-bottom:15px;">
                    <span class="material-icons-round" style="color:var(--text-muted); cursor:pointer;">${p.icon}</span>
                    <div style="flex:1;">
                        <label>Título del Pilar</label>
                        <input type="text" class="in-p-title" style="font-weight:700;" value="${p.title}">
                    </div>
                    <button class="icon-btn" onclick="app.delItem('pillar', ${pIdx})" style="color:var(--text-muted)">close</button>
                </div>
                ${interventionsHtml}
                <button class="btn-dashed-lg" style="margin-top:10px; padding:8px; font-size:0.8rem;" onclick="app.addItem('intervention', ${pIdx})">+ Intervención</button>
            `;
            container.appendChild(div);
        });
    },

    // --- GUARDADO Y SYNC (SIN CAMBIOS ESTRUCTURALES, SOLO SELECTORES) ---
    harvestData: function() {
        const container = document.getElementById('admin-container');
        if(!container || container.innerHTML === "") return;
        const pWrappers = container.getElementsByClassName('admin-pilar-wrapper');
        let newData = [];

        Array.from(pWrappers).forEach(pWrap => {
            let pObj = {
                title: pWrap.querySelector('.in-p-title').value,
                desc: "", // Simplificado para este diseño
                icon: "label_important",
                interventions: []
            };

            const iWrappers = pWrap.getElementsByClassName('admin-intervention-wrapper');
            Array.from(iWrappers).forEach(iWrap => {
                pObj.interventions.push({
                    name: iWrap.querySelector('.in-i-name').value,
                    desc: iWrap.querySelector('.in-i-desc').value,
                    indicator: parseFloat(iWrap.querySelector('.in-i-ind').value) || 0,
                    indResultado: iWrap.querySelector('.in-i-res').value,
                    indProducto: iWrap.querySelector('.in-i-prod').value,
                    criticalPath: iWrap.querySelector('.in-i-path').value,
                    tasks: [], milestones: [] // Se mantienen vacíos en esta vista simplificada
                });
            });
            newData.push(pObj);
        });
        this.data = newData;
    },

    addPillar: function() { this.harvestData(); this.data.push({title:"Nuevo Eje", icon:"flag", interventions:[]}); this.renderGestion(); },
    addItem: function(type, pIdx, iIdx) {
        this.harvestData();
        if(type === 'intervention') this.data[pIdx].interventions.push({name:"Nueva Meta", indicator:0, desc:"", indResultado:"", indProducto:"", criticalPath:""});
        else if(type === 'pillar') this.data.splice(pIdx, 1);
        else if(type === 'intervention_del') this.data[pIdx].interventions.splice(iIdx, 1);
        this.renderGestion();
    },
    delItem: function(type, pIdx, iIdx) {
        if(confirm("¿Confirmar eliminación?")) {
            if(type=='pillar') this.addItem('pillar', pIdx);
            if(type=='intervention') this.addItem('intervention_del', pIdx, iIdx);
        }
    },

    saveData: async function() {
        this.harvestData();
        localStorage.setItem('cengobData', JSON.stringify(this.data));
        if(this.config.script_url) {
            document.getElementById('loader').classList.remove('hidden');
            try {
                await fetch(this.config.script_url, { method: 'POST', mode: 'no-cors', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(this.data) });
                alert("Sincronizado");
            } catch(e) { alert("Error de conexión"); }
            document.getElementById('loader').classList.add('hidden');
        }
        this.toggleView('dashboard');
    },

    saveConfig: function() {
        this.config.script_url = document.getElementById('url-script').value;
        localStorage.setItem('cengob_url', this.config.script_url);
        this.toggleConfig();
        this.fetchFromCloud();
    },

    fetchFromCloud: async function() {
        try {
            const res = await fetch(this.config.script_url);
            const json = await res.json();
            if(json.data) { this.data = json.data; this.renderDashboard(); this.updateGlobalKPIs(); }
        } catch(e) { console.log("Offline"); }
    },

    // --- GRÁFICOS OPTIMIZADOS ---
    createGauge: function(id, val, isPillar) {
        const ctx = document.getElementById(id);
        if(!ctx) return;
        
        // Colores profesionales
        let color = val < 40 ? '#ef4444' : (val < 80 ? '#f59e0b' : '#10b981');
        let cutout = isPillar ? '85%' : '75%';
        
        this.charts.push(new Chart(ctx, {
            type: 'doughnut',
            data: { 
                datasets: [{ 
                    data: [val, 100-val], 
                    backgroundColor: [color, '#e2e8f0'], 
                    borderWidth: 0, 
                    borderRadius: 20 // Bordes redondeados en la barra
                }] 
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false, 
                cutout: cutout, 
                circumference: 360, // Círculo completo para estilo moderno
                rotation: 0,
                plugins: { tooltip: { enabled: false } },
                animation: { animateScale: true, animateRotate: true }
            }
        }));
    },
    getColor: function(val) { return val < 40 ? '#ef4444' : (val < 80 ? '#f59e0b' : '#10b981'); }
};

document.addEventListener('DOMContentLoaded', () => app.init());
