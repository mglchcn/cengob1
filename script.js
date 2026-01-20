// --- RENDERIZADO VISUAL (DASHBOARD CON ACORDEÓN) ---
    renderDashboard: function() {
        const container = document.getElementById('pillars-container');
        if(!container) return; 
        container.innerHTML = '';
        
        // Limpiar gráficos previos
        this.charts.forEach(c => c.destroy());
        this.charts = [];

        let totalProgress = 0;
        let count = 0;
        let risks = 0;
        let done = 0;
        let totalTasks = 0;

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

            // HTML Tareas
            const tasksHtml = p.subtasks.map(t => `
                <div class="task-row">
                    <div>
                        <span class="t-name">${t.name}</span>
                        <div style="font-size:0.7rem; color:#6b7280; margin-top:2px;">${t.ministry}</div>
                    </div>
                    <span class="t-val ${t.progress<50?'red':'green'}">${t.progress}%</span>
                </div>
            `).join('');

            // Tarjeta (Ahora con ID único y evento onclick)
            const card = document.createElement('div');
            card.className = 'pillar-card';
            card.id = `pillar-card-${idx}`; // ID necesario para el toggle
            
            card.innerHTML = `
                <div class="pillar-header" onclick="app.toggleAccordion(${idx})">
                    <div class="icon-box"><span class="material-icons-round">${p.icon}</span></div>
                    
                    <div style="flex:1">
                        <h3 style="margin:0 0 5px 0; font-size:1rem; color:var(--primary);">${p.title}</h3>
                        <p style="margin:0; font-size:0.85rem; color:var(--text-light); line-height:1.3;">${p.desc}</p>
                        <div class="progress-bar" style="margin-top:8px;"><div class="progress-fill" style="width:${pVal}%"></div></div>
                    </div>

                    <div class="chart-mini">
                        <canvas id="chart-p-${idx}"></canvas>
                        <div class="chart-val">${pVal}%</div>
                    </div>
                    
                    <span class="material-icons-round accordion-icon">expand_more</span>
                </div>
                
                <div class="tasks-list">
                    ${tasksHtml || '<small style="color:#aaa; display:block; text-align:center;">Sin tareas asignadas</small>'}
                </div>
            `;
            container.appendChild(card);

            // Gráfico individual
            this.createChart(`chart-p-${idx}`, pVal);
        });

        // Actualizar Header Global
        const globalAvg = count ? Math.round(totalProgress/count) : 0;
        document.getElementById('stat-total').innerText = totalTasks;
        document.getElementById('stat-risk').innerText = risks;
        document.getElementById('stat-done').innerText = done;
        document.getElementById('global-percent').innerText = globalAvg + '%';
        this.createGauge('chartGlobal', globalAvg);
    },

    // --- NUEVA FUNCIÓN: ACCIONAR ACORDEÓN ---
    toggleAccordion: function(idx) {
        const card = document.getElementById(`pillar-card-${idx}`);
        // Alternar clase 'active' para abrir/cerrar con CSS
        card.classList.toggle('active');
    },
