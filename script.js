const app = {
    // --- DATOS POR DEFECTO ---
    defaultData: [
        {
            title: "Industrialización con Sustitución",
            icon: "factory",
            interventions: [
                {
                    name: "Complejo Siderúrgico del Mutún",
                    desc: "Producción de acero y laminados.",
                    indicator: 85,
                    indResultado: "Reducción importaciones 50%",
                    indProducto: "Planta operativa Fase 1",
                    criticalPath: "Suministro Gas",
                    tasks: [], milestones: []
                }
            ]
        }
    ],

    data: [],
    config: { script_url: localStorage.getItem('cengob_url') || '' },
    charts: [], // Almacén de instancias Chart.js
    
    // Variables Carrusel
    carouselInterval: null,
    slideTime: 10000, // 10 segundos
    currentIndex: 0,
    isCarousel: false,

    // --- INICIALIZACIÓN ---
    init: function() {
        console.log("Iniciando S.I.G.E.P...");
        
        // Cargar Config
        if(document.getElementById('url-script')) document.getElementById('url-script').value = this.config.script_url;

        // Cargar Datos
        const stored = localStorage.getItem('cengobData');
        this.data = stored ? JSON.parse(stored) : JSON.parse(JSON.stringify(this.defaultData));
        
        // Renderizar Inicial
        this.renderDashboard();
        this.updateGlobalStats();

        // Intentar Sync Nube si hay URL
        if(this.config.script_url) this.fetchFromCloud();

        // Listeners
        document.addEventListener('keydown', (e) => {
            if(e.key === 'Escape' && this.isCarousel) this.toggleCarousel();
        });
    },

    // --- VISTAS Y NAVEGACIÓN ---
    toggleView: function(viewName) {
        if(this.isCarousel && viewName === 'gestion') this.toggleCarousel(); // Salir de carrusel al editar

        document.getElementById('view-dashboard').classList.toggle('active', viewName === 'dashboard');
        document.getElementById('view-dashboard').classList.toggle('hidden', viewName !== 'dashboard');
        
        document.getElementById('view-gestion').classList.toggle('active', viewName === 'gestion');
        document.getElementById('view-gestion').classList.toggle('hidden', viewName !== 'gestion');

        if(viewName === 'gestion') this.renderEditor();
        else this.renderDashboard();
    },

    toggleConfig: function() {
        document.getElementById('configModal').classList.toggle('hidden');
    },

    // --- MODO CARRUSEL (PRESENTACIÓN) ---
    toggleCarousel: function() {
        this.isCarousel = !this.isCarousel;
        const grid = document.getElementById('view-dashboard');
        const dots = document.getElementById('carousel-dots');
        const btnText = document.getElementById('btn-play-text');
        const btnIcon = document.getElementById('btn-play-icon');

        if(this.isCarousel) {
            grid.classList.add('carousel-mode');
            dots.classList.remove('hidden');
            btnText.innerText = "Detener";
            btnIcon.innerText = "stop_circle";
            if(document.documentElement.requestFullscreen) document.documentElement.requestFullscreen();
            this.startCarouselLoop();
        } else {
            grid.classList.remove('carousel-mode');
            dots.classList.add('hidden');
            btnText.innerText = "Presentar";
            btnIcon.innerText = "play_circle_outline";
            if(document.exitFullscreen) document.exitFullscreen();
            this.stopCarouselLoop();
            
            // Restaurar visibilidad de todas las tarjetas
            document.querySelectorAll('.pillar-card').forEach(c => c.classList.remove('active-slide'));
        }
    },

    startCarouselLoop: function() {
        this.currentIndex = 0;
        this.showSlide(0);
        this.renderDots();
        this.resetTimer();
    },

    stopCarouselLoop: function() {
        clearInterval(this.carouselInterval);
        document.getElementById('time-progress-bar').style.width = '0%';
    },

    resetTimer: function() {
        clearInterval(this.carouselInterval);
        const bar = document.getElementById('time-progress-bar');
        
        // Reset animación CSS
        bar.style.transition = 'none';
        bar.style.width = '0%';
        
        setTimeout(() => {
            bar.style.transition = `width ${this.slideTime}ms linear`;
            bar.style.width = '100%';
        }, 50);

        this.carouselInterval = setInterval(() => {
            this.nextSlide();
        }, this.slideTime);
    },

    nextSlide: function() {
        this.currentIndex = (this.currentIndex + 1) % this.data.length;
        this.showSlide(this.currentIndex);
        this.renderDots(); // Actualizar activo
        this.resetTimer();
    },

    showSlide: function(idx) {
        const cards = document.querySelectorAll('.pillar-card');
        cards.forEach((c, i) => {
            if(i === idx) c.classList.add('active-slide');
            else c.classList.remove('active-slide');
        });
        this.currentIndex = idx;
    },

    renderDots: function() {
        const container = document.getElementById('carousel-dots');
        container.innerHTML = '';
        this.data.forEach((_, i) => {
            const dot = document.createElement('div');
            dot.className = `dot ${i === this.currentIndex ? 'active' : ''}`;
            dot.onclick = () => { this.showSlide(i); this.renderDots(); this.resetTimer(); };
            container.appendChild(dot);
        });
    },

    // --- RENDER DASHBOARD ---
    renderDashboard: function() {
        const container = document.getElementById('dashboard-grid');
        if(!container) return;
        
        // Limpiar Charts Viejos
        this.charts.forEach(c => c.destroy());
        this.charts = [];
        container.innerHTML = '';

        this.data.forEach((p, pIdx) => {
            let sum = 0, count = 0;
            let rowsHtml = '';

            p.interventions.forEach((inter, iIdx) => {
                let val = parseFloat(inter.indicator) || 0;
                sum += val; count++;
                
                rowsHtml += `
                    <div class="intervention-row">
                        <div class="mini-chart-box">
                            <canvas id="chart-mini-${pIdx}-${iIdx}"></canvas>
                            <div class="mini-val">${Math.round(val)}%</div>
                        </div>
                        <div class="int-data">
                            <h4>${inter.name}</h4>
                            <p>${inter.desc || ''}</p>
                            <div class="tags-row">
                                ${inter.indResultado ? `<span class="tag res">RES: ${inter.indResultado}</span>` : ''}
                                ${inter.indProducto ? `<span class="tag">PROD: ${inter.indProducto}</span>` : ''}
                                ${inter.criticalPath ? `<span class="tag" style="color:#f87171;border-color:#ef4444;">CRIT: ${inter.criticalPath}</span>` : ''}
                            </div>
                        </div>
                    </div>
                `;
            });

            let pilarAvg = count > 0 ? Math.round(sum/count) : 0;

            const card = document.createElement('div');
            card.className = 'pillar-card';
            card.innerHTML = `
                <div class="card-header">
                    <div class="card-title-group">
                        <span class="material-icons-round" style="color:var(--accent); font-size:1.5rem;">${p.icon||'flag'}</span>
                        <h3>${p.title}</h3>
                    </div>
                    <div class="gauge-wrapper">
                        <canvas id="gauge-pillar-${pIdx}"></canvas>
                        <div class="gauge-val-abs">${pilarAvg}%</div>
                    </div>
                </div>
                <div class="card-body">
                    ${rowsHtml || '<div style="text-align:center; padding:20px; color:#666;">Sin Intervenciones</div>'}
                </div>
            `;
            container.appendChild(card);

            // Crear Gráficos (IMPORTANTE: Después de insertar en DOM)
            this.createGauge(`gauge-pillar-${pIdx}`, pilarAvg, true);
            p.interventions.forEach((inter, iIdx) => {
                this.createGauge(`chart-mini-${pIdx}-${iIdx}`, inter.indicator, false);
            });
        });
    },

    // --- EDITOR (GESTIÓN) ---
    renderEditor: function() {
        const container = document.getElementById('editor-content');
        container.innerHTML = '';

        this.data.forEach((p, pIdx) => {
            let intsHtml = '';
            p.interventions.forEach((inter, iIdx) => {
                intsHtml += `
                    <div style="border-top:1px dashed #ccc; padding-top:10px; margin-top:10px;">
                        <div style="display:grid; grid-template-columns: 2fr 1fr auto; gap:10px;">
                            <input type="text" value="${inter.name}" class="i-name" placeholder="Nombre Intervención">
                            <input type="number" value="${inter.indicator}" class="i-val" placeholder="%">
                            <button onclick="app.delItem('int', ${pIdx}, ${iIdx})" style="color:red; border:none; background:none; cursor:pointer;">×</button>
                        </div>
                        <input type="text" value="${inter.desc}" class="i-desc" placeholder="Descripción">
                        <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:5px;">
                            <input type="text" value="${inter.indResultado}" class="i-res" placeholder="Ind. Resultado">
                            <input type="text" value="${inter.indProducto}" class="i-prod" placeholder="Ind. Producto">
                            <input type="text" value="${inter.criticalPath}" class="i-crit" placeholder="Ruta Crítica">
                        </div>
                    </div>
                `;
            });

            const div = document.createElement('div');
            div.className = 'editor-item';
            div.innerHTML = `
                <div style="display:flex; justify-content:space-between;">
                    <input type="text" value="${p.title}" class="p-title" style="font-weight:bold; font-size:1.1rem; width:80%;">
                    <button onclick="app.delItem('pillar', ${pIdx})" style="color:red; background:none; border:none; cursor:pointer;">Borrar Pilar</button>
                </div>
                <div class="ints-container">${intsHtml}</div>
                <button onclick="app.addItem('int', ${pIdx})" style="margin-top:10px; background:#f1f5f9; border:1px solid #ccc; padding:5px; width:100%; cursor:pointer;">+ Añadir Intervención</button>
            `;
            container.appendChild(div);
        });
    },

    // --- COSECHA Y GUARDADO ---
    harvestData: function() {
        const container = document.getElementById('editor-content');
        if(container.innerHTML === "") return; // Evitar borrar si no se renderizó

        const pItems = container.getElementsByClassName('editor-item');
        let newData = [];

        Array.from(pItems).forEach(item => {
            let pObj = {
                title: item.querySelector('.p-title').value,
                icon: 'flag',
                interventions: []
            };
            
            // Buscar inputs relativos a este pilar
            const names = item.getElementsByClassName('i-name');
            const vals = item.getElementsByClassName('i-val');
            const descs = item.getElementsByClassName('i-desc');
            const ress = item.getElementsByClassName('i-res');
            const prods = item.getElementsByClassName('i-prod');
            const crits = item.getElementsByClassName('i-crit');

            for(let i=0; i<names.length; i++) {
                pObj.interventions.push({
                    name: names[i].value,
                    indicator: parseFloat(vals[i].value) || 0,
                    desc: descs[i].value,
                    indResultado: ress[i].value,
                    indProducto: prods[i].value,
                    criticalPath: crits[i].value,
                    tasks: [], milestones: []
                });
            }
            newData.push(pObj);
        });
        this.data = newData;
    },

    addPillar: function() { this.harvestData(); this.data.push({title:"Nuevo Eje", interventions:[]}); this.renderEditor(); },
    addItem: function(type, pIdx) { this.harvestData(); this.data[pIdx].interventions.push({name:"Nueva Meta", indicator:0, desc:"", indResultado:"", indProducto:"", criticalPath:""}); this.renderEditor(); },
    delItem: function(type, pIdx, iIdx) { 
        this.harvestData();
        if(type==='pillar') { if(confirm("¿Eliminar pilar?")) this.data.splice(pIdx, 1); }
        else { this.data[pIdx].interventions.splice(iIdx, 1); }
        this.renderEditor();
    },

    saveData: async function() {
        this.harvestData();
        localStorage.setItem('cengobData', JSON.stringify(this.data));
        
        if(this.config.script_url) {
            document.getElementById('loader').classList.remove('hidden');
            try {
                await fetch(this.config.script_url, { 
                    method: 'POST', 
                    mode: 'no-cors', 
                    headers: {'Content-Type': 'application/json'}, 
                    body: JSON.stringify(this.data) 
                });
                alert("Guardado y Sincronizado");
            } catch(e) { alert("Error de Conexión Nube (Guardado Local OK)"); }
            document.getElementById('loader').classList.add('hidden');
        } else {
            alert("Guardado Localmente");
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
            if(json.data) { 
                this.data = json.data; 
                this.renderDashboard(); 
                this.updateGlobalStats(); 
            }
        } catch(e) { console.warn("Modo Offline"); }
    },

    // --- CHART JS HELPER ---
    createGauge: function(id, val, isPillar) {
        const ctx = document.getElementById(id);
        if(!ctx) return;

        let color = val < 50 ? '#ef4444' : (val < 80 ? '#3b82f6' : '#10b981');
        let cutout = isPillar ? '80%' : '70%';

        this.charts.push(new Chart(ctx, {
            type: 'doughnut',
            data: {
                datasets: [{
                    data: [val, 100-val],
                    backgroundColor: [color, 'rgba(255,255,255,0.1)'],
                    borderWidth: 0,
                    borderRadius: 20
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: cutout,
                circumference: 360,
                plugins: { tooltip: { enabled: false } },
                animation: { animateScale: true }
            }
        }));
    },

    updateGlobalStats: function() {
        let sum = 0, count = 0, alerts = 0;
        this.data.forEach(p => p.interventions.forEach(i => {
            let v = parseFloat(i.indicator)||0;
            sum += v; count++;
            if(v < 50) alerts++;
        }));
        let avg = count > 0 ? Math.round(sum/count) : 0;
        document.getElementById('kpi-global').innerText = avg + "%";
        document.getElementById('kpi-alerts').innerText = alerts;
    }
};

document.addEventListener('DOMContentLoaded', () => app.init());
