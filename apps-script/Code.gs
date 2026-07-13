/**
 * Cole este código em: Planilha > Extensões > Apps Script
 *
 * 1. Crie duas abas: "Cafe" e "Almoco"
 * 2. Cabeçalhos na linha 1: Nome | Qtd Necessária | Qtd que Entrou
 * 3. Preencha Nome e Qtd Necessária (iguais ao app)
 * 4. Deploy > Nova implantação > Tipo: App da Web
 *    - Executar como: Eu
 *    - Quem tem acesso: Qualquer pessoa
 * 5. Copie a URL /exec para VITE_APPS_SCRIPT_URL no .env
 *
 * Após alterar este arquivo: Implantar > Gerenciar implantações > editar > Nova versão
 */

var SHEET_NAMES = ['Cafe', 'Almoco']

/**
 * Execute uma vez no editor (selecione setupSheets → Executar)
 * para criar as abas e preencher Nome / Qtd Necessária.
 */
function setupSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet()
  var cafeData = [
    ['Nome', 'Qtd Necessária', 'Qtd que Entrou'],
    ['Açúcar', '10 kg', ''],
    ['Café', '4 pc', ''],
    ['Leite', '36 L', ''],
    ['Nescau', '5 pc', ''],
    ['Presunto', '2 kg', ''],
    ['Queijo fatiado', '2 kg', ''],
    ['Melancia', '4 un', ''],
    ['Banana', '3 kg', ''],
    ['Uva', '5 kg', ''],
    ['Laranja', '5 kg', ''],
    ['Bolo', '18 un', ''],
    ['Bolo::Chocolate', 'un', ''],
    ['Bolo::Cenoura', 'un', ''],
    ['Bolo::Cuca', 'un', ''],
    ['Pão', '500 un', ''],
    ['Bandeja para café', '400 un', ''],
    ['Copo descartável', '400 un', ''],
    ['Guardanapos', '1 un', ''],
    ['Luva', '1 cx', ''],
    ['Touca', '1 pc', ''],
    ['Máscara', '1 cx', ''],
  ]
  var almocoData = [
    ['Nome', 'Qtd Necessária', 'Qtd que Entrou'],
    ['Refrigerante', '40 un', ''],
    ['Marmita 500 ml', '200 un', ''],
    ['Marmita 750 ml', '200 un', ''],
    ['Garfos', '400 un', ''],
    ['Colheres', '400 un', ''],
  ]

  writeSheet(ss, 'Cafe', cafeData)
  writeSheet(ss, 'Almoco', almocoData)
}

function writeSheet(ss, name, data) {
  var sheet = ss.getSheetByName(name)
  if (!sheet) {
    sheet = ss.insertSheet(name)
  }
  sheet.clearContents()
  sheet.getRange(1, 1, data.length, data[0].length).setValues(data)
}

function doGet(e) {
  try {
    var action = (e && e.parameter && e.parameter.action) || 'get'

    if (action === 'get') {
      return jsonResponse(readAllQuantities())
    }

    if (action === 'set') {
      setQuantity(e.parameter.sheet, e.parameter.nome, e.parameter.qtd != null ? String(e.parameter.qtd) : '')
      // Devolve o estado atualizado na mesma resposta (evita 2º request)
      var afterSet = readAllQuantities()
      afterSet.ok = true
      return jsonResponse(afterSet)
    }

    if (action === 'setMany') {
      var updates = {}
      try {
        updates = JSON.parse(e.parameter.updates || '{}')
      } catch (parseErr) {
        return jsonResponse({ error: 'JSON de updates inválido' })
      }
      setQuantitiesMany(e.parameter.sheet, updates)
      var afterMany = readAllQuantities()
      afterMany.ok = true
      return jsonResponse(afterMany)
    }

    return jsonResponse({ error: 'Ação inválida' })
  } catch (err) {
    return jsonResponse({ error: String(err) })
  }
}

function doPost(e) {
  try {
    var body = {}
    if (e && e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents)
    }

    var action = body.action || 'setMany'

    if (action === 'get') {
      return jsonResponse(readAllQuantities())
    }

    if (action === 'set') {
      setQuantity(body.sheet, body.nome, body.qtd != null ? String(body.qtd) : '')
      var afterSet = readAllQuantities()
      afterSet.ok = true
      return jsonResponse(afterSet)
    }

    if (action === 'setMany') {
      setQuantitiesMany(body.sheet, body.updates || {})
      var afterMany = readAllQuantities()
      afterMany.ok = true
      return jsonResponse(afterMany)
    }

    return jsonResponse({ error: 'Ação inválida' })
  } catch (err) {
    return jsonResponse({ error: String(err) })
  }
}

function readAllQuantities() {
  var result = { Cafe: {}, Almoco: {} }
  var ss = SpreadsheetApp.getActiveSpreadsheet()

  SHEET_NAMES.forEach(function (name) {
    var sheet = ss.getSheetByName(name)
    if (!sheet) {
      result[name] = {}
      return
    }
    var values = sheet.getDataRange().getValues()
    var map = {}
    for (var i = 1; i < values.length; i++) {
      var rowName = String(values[i][0] || '').trim()
      if (!rowName) continue
      var entered = values[i][2]
      map[rowName] = entered === '' || entered == null ? '' : String(entered)
    }
    result[name] = map
  })

  return result
}

function setQuantitiesMany(sheetName, updates) {
  if (SHEET_NAMES.indexOf(sheetName) === -1) {
    throw new Error('Aba inválida: ' + sheetName)
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet()
  var sheet = ss.getSheetByName(sheetName)
  if (!sheet) {
    throw new Error('Aba não encontrada: ' + sheetName)
  }

  var values = sheet.getDataRange().getValues()
  var indexByName = {}
  for (var i = 1; i < values.length; i++) {
    var rowName = String(values[i][0] || '').trim()
    if (rowName) indexByName[rowName] = i + 1
  }

  var names = Object.keys(updates || {})
  for (var n = 0; n < names.length; n++) {
    var nome = String(names[n]).trim()
    if (!nome) continue
    var qtd = updates[names[n]] != null ? String(updates[names[n]]) : ''
    var row = indexByName[nome]
    if (row) {
      sheet.getRange(row, 3).setValue(qtd)
    } else {
      sheet.appendRow([nome, '', qtd])
      indexByName[nome] = sheet.getLastRow()
    }
  }

  SpreadsheetApp.flush()
}

function setQuantity(sheetName, nome, qtd) {
  var updates = {}
  updates[nome] = qtd
  setQuantitiesMany(sheetName, updates)
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON,
  )
}
