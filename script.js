// CÓDIGO GOOGLE APPS SCRIPT (Code.gs)

function doGet(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('BaseDatos');
  if (!sheet) return ContentService.createTextOutput(JSON.stringify({ data: [] })).setMimeType(ContentService.MimeType.JSON);

  const rows = sheet.getDataRange().getValues();
  // Asumimos fila 1 encabezados. Datos desde fila 2.
  // Estructura Columnas: 
  // A: Pilar, B: DescPilar, C: Intervencion, D: DescInt, E: NomInd, F: ValInd, G: Tareas(JSON), H: Hitos(JSON)
  
  let dataMap = {};
  
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const pilarTitulo = row[0];
    if(!pilarTitulo) continue;

    if (!dataMap[pilarTitulo]) {
      dataMap[pilarTitulo] = {
        title: pilarTitulo,
        desc: row[1],
        icon: "flag",
        interventions: []
      };
    }

    // Si hay intervención en esta fila
    if(row[2]) {
      dataMap[pilarTitulo].interventions.push({
        name: row[2],
        desc: row[3],
        indName: row[4],
        indicator: Number(row[5]),
        tasks: parseJSON(row[6]),     // Tareas guardadas como texto JSON
        milestones: parseJSON(row[7]) // Hitos guardados como texto JSON
      });
    }
  }

  // Convertir mapa a array
  const finalData = Object.values(dataMap);
  
  return ContentService.createTextOutput(JSON.stringify({ data: finalData }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const jsonString = e.postData.contents;
    const data = JSON.parse(jsonString);
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('BaseDatos');
    if (!sheet) {
      sheet = ss.insertSheet('BaseDatos');
      sheet.appendRow(["Pilar", "Desc. Pilar", "Intervención", "Desc. Intervención", "Nombre Indicador", "Valor %", "Tareas (JSON)", "Hitos (JSON)"]);
      sheet.setFrozenRows(1);
    } else {
      // Limpiar datos antiguos (mantener headers)
      const lastRow = sheet.getLastRow();
      if(lastRow > 1) sheet.getRange(2, 1, lastRow-1, 8).clearContent();
    }

    let rowsToAdd = [];
    
    data.forEach(p => {
      // Si el pilar no tiene intervenciones, guardamos al menos el pilar
      if(!p.interventions || p.interventions.length === 0) {
        rowsToAdd.push([p.title, p.desc, "", "", "", "", "[]", "[]"]);
      } else {
        p.interventions.forEach(i => {
          rowsToAdd.push([
            p.title, 
            p.desc, 
            i.name, 
            i.desc, 
            i.indName, 
            i.indicator, 
            JSON.stringify(i.tasks),       // Guardamos sub-listas como JSON para no romper la fila
            JSON.stringify(i.milestones)
          ]);
        });
      }
    });

    if(rowsToAdd.length > 0) {
      sheet.getRange(2, 1, rowsToAdd.length, 8).setValues(rowsToAdd);
    }

    return ContentService.createTextOutput(JSON.stringify({ status: "success" })).setMimeType(ContentService.MimeType.JSON);
  } catch(error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", msg: error.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

function parseJSON(str) {
  try { return JSON.parse(str); } catch(e) { return []; }
}
