const app = {
    // --- DATOS INICIALES (EJEMPLO) ---
    defaultData: [
        {
            title: "Industrialización",
            icon: "factory",
            interventions: [
                {
                    name: "Complejo Siderúrgico del Mutún",
                    desc: "Sustitución de importaciones de acero.",
                    indicator: 85,
                    indResultado: "Reducción 50% import.",
                    indProducto: "Planta Fase 1",
                    milestones: [
                        {date: "15 Oct", desc: "Encendido reactor"},
                        {date: "20 Dic", desc: "Primer laminado"}
                    ]
                }
            ]
        }
    ],

    data: [],
    config: { script_url: localStorage.getItem('cengob_url') || '' },
    charts: [],
    carouselInterval: null,
    slideTime: 10000,
    currentIndex: 0,
    isCarousel: false,

    init: function() {
        if(document.getElementById('url-script')) document.getElementById('url-script').value = this.config.script_url;
        
        const stored = localStorage.getItem('cengobData');
        this.data = stored ? JSON.parse(stored) : JSON.parse(JSON.stringify(this.defaultData));
        this.normalizeData();

        this.renderDashboard();
        this.updateGlobalKPIs();
        if(this.config.script_url) this.fetchFromCloud();

        document.addEventListener('keydown', (e) => {
            if(e.key === 'Escape' && this.isCarousel) this.toggleCarousel();
        });
    },

    normalizeData: function() {
        this.data.forEach(p => {
            if(!p.interventions) p.interventions = [];
            p.interventions.forEach(i => {
                if(!i.milestones) i.milestones = []; // Asegurar que exista array
            });
        });
    },

    // --- VISTAS ---
    toggleView: function(view) {
        if(this.isCarousel && view === 'gestion') this.toggleCarousel();
        document.getElementById('view-dashboard').classList.toggle('active', view === 'dashboard');
        document.getElementById('view-dashboard').classList.toggle('hidden', view !== 'dashboard');
        document.getElementById('view-gestion').classList.toggle('active', view === 'gestion');
        document.getElementById('view-gestion').classList.toggle('hidden', view !== 'gestion');
        
        if(view === 'gestion') this.renderEditor();
        else { this.renderDashboard(); this.updateGlobalKPIs(); }
    },

    toggleConfig: () => document.getElementById('configModal').classList.toggle('hidden'),

    // --- CARRUSEL ---
    toggleCarousel: function() {
        this.isCarousel = !this.isCarousel;
        const grid = document.getElementById('view-dashboard');
        const dots = document.getElementById('carousel-dots');
        const btnText = document.getElementById('btn-play-text');
        const btnIcon = document.getElementById('btn-play-icon');

        if(this.isCarousel) {
            grid.classList.add('carousel-mode');
            dots.classList.remove('hidden');
            btnText.innerText = "DETENER";
            btnIcon.innerText = "stop";
            if(document.documentElement.requestFullscreen) document.documentElement.requestFullscreen();
            this.startLoop();
        } else {
            grid.classList.remove('carousel-mode');
            dots.classList.add('hidden');
            btnText.innerText = "MODO PRESENTACIÓN";
            btnIcon.innerText = "play_arrow";
            if(document.exitFullscreen) document.exitFullscreen();
            this.stopLoop();
            document.querySelectorAll('.pillar-card').forEach(c => c.classList.remove('active-slide'));
        }
    },

    startLoop: function() {
        this.currentIndex = 0;
        this.showSlide(0);
        this.resetTimer();
    },

    stopLoop: function() {
        clearInterval(this.carouselInterval);
        document.getElementById('time-bar').style.width = '0%';
    },

    resetTimer: function() {
        clearInterval(this.carouselInterval);
        const bar = document.getElementById('time-bar');
        bar.style.transition = 'none';
        bar.style.width = '0%';
        setTimeout(() => {
            bar.style.transition = `width ${this.slideTime}ms linear`;
            bar.style.width = '100%';
        }, 50);
        this.carouselInterval = setInterval(() => this.nextSlide(), this.slideTime);
    },

    nextSlide: function() {
        this.currentIndex = (this.currentIndex + 1) % this.data.length;
        this.showSlide(this.currentIndex);
        this.resetTimer();
    },

    showSlide: function(idx) {
        const cards = document.querySelectorAll('.pillar-card');
        cards.forEach((c, i) => i === idx ? c.classList.add('active-slide') : c.classList.remove('active-slide'));
        this.renderDots();
    },

    renderDots: function() {
        const div = document.getElementById('carousel-dots');
        div.innerHTML = '';
        this.data.forEach((_, i) => {
            const dot = document.createElement('div');
            dot.className = 'dot';
            dot.style.cssText = `width:12px; height:12px; border-radius:50%; background:${i===this.currentIndex?'var(--accent)':'#555'}; cursor:pointer; transition:0.3s;`;
            if(i===this.currentIndex) dot.style.transform = "scale(1.3)";
            dot.onclick = () => { this.currentIndex = i; this.showSlide(i); this.resetTimer(); };
            div.appendChild(dot);
        });
    },

    // --- RENDER DASHBOARD ---
    renderDashboard: function() {
        const container = document.getElementById('dashboard-grid');
        this.charts.forEach(c => c.destroy());
        this.charts = [];
        container.innerHTML = '';

        this.data.forEach((p, pIdx) => {
            let sum = 0, count = 0;
            let intHtml = '';

            p.interventions.forEach((inter, iIdx) => {
                let val = parseFloat(inter.indicator) || 0;
                sum += val; count++;

                // Generar lista de Hitos
                let milestonesHtml = '';
                if(inter.milestones && inter.milestones.length > 0) {
                    milestonesHtml = `<div class="milestones-section"><div class="ms-title">Próximos Hitos</div><div class="ms-list">`;
                    inter.milestones.forEach(m => {
                        milestonesHtml += `
                            <div class="ms-item">
                                <span class="ms-date">${m.date}</span>
                                <span class="ms-desc">${m.desc}</span>
                            </div>`;
                    });
                    milestonesHtml += `</div></div>`;
                }

                intHtml += `
                    <div class="int-card">
                        <div class="int-chart">
                            <canvas id="chart-mini-${pIdx}-${iIdx}"></canvas>
                            <div class="int-chart-val">${Math.round(val)}%</div>
                        </div>
                        <div class="int-content">
                            <h4>${inter.name}</h4>
                            <p>${inter.desc || ''}</p>
                            <div class="tags">
                                ${inter.indResultado ? `<span class="tag res">RES: ${inter.indResultado}</span>` : ''}
                                ${inter.indProducto ? `<span class="tag prod">PROD: ${inter.indProducto}</span>` : ''}
                            </div>
                            ${milestonesHtml}
                        </div>
                    </div>
                `;
            });

            let avg = count > 0 ? Math.round(sum/count) : 0;

            const card = document.createElement('div');
            card.className = 'pillar-card';
            card.innerHTML = `
                <div class="card-header">
                    <div class="header-info">
                        <span class="material-icons-round header-icon">${p.icon}</span>
                        <div class="header-text">
                            <h3>${p.title}</h3>
                        </div>
                    </div>
                    <div class="header-gauge">
                        <canvas id="gauge-pillar-${pIdx}"></canvas>
                        <div class="gauge-val">${avg}%</div>
                    </div>
                </div>
                <div class="card-body">
                    ${intHtml || '<div style="text-align:center;color:#666;">Sin Intervenciones</div>'}
                </div>
            `;
            container.appendChild(card);

            // Gráficos
            this.createGauge(`gauge-pillar-${pIdx}`, avg, true);
            p.interventions.forEach((inter, iIdx) => {
                this.createGauge(`chart-mini-${pIdx}-${iIdx}`, inter.indicator, false);
            });
        });
    },

    // --- EDITOR CON HITOS ---
    renderEditor: function() {
        const container = document.getElementById('editor-content');
        container.innerHTML = '';

        this.data.forEach((p, pIdx) => {
            let intHtml = '';
            p.interventions.forEach((inter, iIdx) => {
                
                // Generar inputs de Hitos
                let msInputs = '';
                (inter.milestones || []).forEach((m, mIdx) => {
                    msInputs += `
                        <div style="display:flex; gap:5px; margin-bottom:5px;">
                            <input type="text" value="${m.date}" class="ms-date-in" placeholder="Fecha" style="width:30%">
                            <input type="text" value="${m.desc}" class="ms-desc-in" placeholder="Hito">
                            <button onclick="app.delMilestone(${pIdx}, ${iIdx}, ${mIdx})" style="color:red;border:none;background:none;cursor:pointer;">×</button>
                        </div>
                    `;
                });

                intHtml += `
                    <div class="edit-int-row">
                        <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                            <strong>Intervención #${iIdx+1}</strong>
                            <button class="btn-danger-icon" onclick="app.delItem('int', ${pIdx}, ${iIdx})">delete</button>
                        </div>
                        <div class="inp-row">
                            <div><label>Nombre</label><input type="text" value="${inter.name}" class="i-name"></div>
                            <div><label>% Avance</label><input type="number" value="${inter.indicator}" class="i-val"></div>
                        </div>
                        <div class="inp-group"><label>Descripción</label><input type="text" value="${inter.desc}" class="i-desc"></div>
                        <div class="inp-row">
                            <div><label>Ind. Resultado</label><input type="text" value="${inter.indResultado}" class="i-res"></div>
                            <div><label>Ind. Producto</label><input type="text" value="${inter.indProducto}" class="i-prod"></div>
                        </div>
                        
                        <div style="background:#f1f5f9; padding:10px; border-radius:6px; margin-top:10px;">
                            <label style="margin-bottom:5px; display:block;">Hitos Clave</label>
                            <div class="ms-container-in">${msInputs}</div>
                            <button onclick="app.addMilestone(${pIdx}, ${iIdx})" style="font-size:0.7rem; padding:4px 8px; margin-top:5px; cursor:pointer;">+ Agregar Hito</button>
                        </div>
                    </div>
                `;
            });

            const div = document.createElement('div');
            div.className = 'edit-card';
            div.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div style="width:80%"><label>Título del Pilar</label><input type="text" value="${p.title}" class="p-title" style="font-weight:bold; font-size:1.1rem;"></div>
                    <button class="btn-danger-icon" onclick="app.delItem('pillar', ${pIdx})">delete_forever</button>
                </div>
                ${intHtml}
                <button onclick="app.addItem('int', ${pIdx})" style="width:100%; padding:10px; margin-top:15px; border:1px dashed #ccc; background:none; cursor:pointer;">+ Añadir Intervención</button>
            `;
            container.appendChild(div);
        });
    },

    // --- LÓGICA DE DATOS ---
    harvestData: function() {
        const container = document.getElementById('editor-content');
        if(container.innerHTML === "") return;

        const pCards = container.getElementsByClassName('edit-card');
        let newData = [];

        Array.from(pCards).forEach(card => {
            let pObj = {
                title: card.querySelector('.p-title').value,
                icon: "flag",
                interventions: []
            };

            const intRows = card.getElementsByClassName('edit-int-row');
            Array.from(intRows).forEach(row => {
                let milestones = [];
                const msDates = row.getElementsByClassName('ms-date-in');
                const msDescs = row.getElementsByClassName('ms-desc-in');
                for(let k=0; k<msDates.length; k++){
                    milestones.push({date: msDates[k].value, desc: msDescs[k].value});
                }

                pObj.interventions.push({
                    name: row.querySelector('.i-name').value,
                    indicator: parseFloat(row.querySelector('.i-val').value) || 0,
                    desc: row.querySelector('.i-desc').value,
                    indResultado: row.querySelector('.i-res').value,
                    indProducto: row.querySelector('.i-prod').value,
                    milestones: milestones
                });
            });
            newData.push(pObj);
        });
        this.data = newData;
    },

    addPillar: function() { this.harvestData(); this.data.push({title:"Nuevo Eje", interventions:[]}); this.renderEditor(); },
    addItem: function(type, pIdx) { this.harvestData(); this.data[pIdx].interventions.push({name:"Nueva", indicator:0, milestones:[]}); this.renderEditor(); },
    delItem: function(type, pIdx, iIdx) { 
        this.harvestData();
        if(type==='pillar') { if(confirm("¿Eliminar pilar?")) this.data.splice(pIdx, 1); }
        else this.data[pIdx].interventions.splice(iIdx, 1);
        this.renderEditor();
    },
    
    // Gestión Hitos
    addMilestone: function(pIdx, iIdx) { this.harvestData(); this.data[pIdx].interventions[iIdx].milestones.push({date:"", desc:""}); this.renderEditor(); },
    delMilestone: function(pIdx, iIdx, mIdx) { this.harvestData(); this.data[pIdx].interventions[iIdx].milestones.splice(mIdx, 1); this.renderEditor(); },

    saveData: async function() {
        this.harvestData();
        localStorage.setItem('cengobData', JSON.stringify(this.data));
        if(this.config.script_url) {
            document.getElementById('loader').classList.remove('hidden');
            try {
                await fetch(this.config.script_url, { method: 'POST', mode: 'no-cors', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(this.data) });
                alert("Sincronizado");
            } catch(e) { alert("Guardado Local (Error Nube)"); }
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
        } catch(e) { console.warn("Offline"); }
    },

    createGauge: function(id, val, isPillar) {
        const ctx = document.getElementById(id);
        if(!ctx) return;
        let color = val < 50 ? '#ef4444' : (val < 80 ? '#3b82f6' : '#10b981');
        this.charts.push(new Chart(ctx, {
            type: 'doughnut',
            data: { datasets: [{ data: [val, 100-val], backgroundColor: [color, 'rgba(255,255,255,0.05)'], borderWidth: 0, borderRadius: 20 }] },
            options: { responsive: true, maintainAspectRatio: false, cutout: isPillar?'85%':'75%', plugins: { tooltip: { enabled: false } }, animation: { duration: 0 } }
        }));
    },

    updateGlobalKPIs: function() {
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
