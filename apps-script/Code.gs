/**
 * Planilha = banco do app
 *
 * Abas: Cafe | Almoco
 * A Nome | B Qtd Necessária | C Qtd que Entrou | D Contribuições | E Sabores (opcional)
 *
 * Coluna D (exemplo):
 * Felipe - Zimbros - 3pct
 * Joao - José Amândio - 2pct
 *
 * Após alterar: Implantar > Gerenciar implantações > Nova versão
 */

var SHEET_NAMES = ['Cafe', 'Almoco']

function setupSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet()
  var cafeData = [
    ['Nome', 'Qtd Necessária', 'Qtd que Entrou', 'Contribuições', 'Sabores'],
    ['Açúcar', '10 kg', '', '', ''],
    ['Café', '4 pc', '', '', ''],
    ['Leite', '36 L', '', '', ''],
    ['Nescau', '5 pc', '', '', ''],
    ['Presunto', '2 kg', '', '', ''],
    ['Queijo fatiado', '2 kg', '', '', ''],
    ['Melancia', '4 un', '', '', ''],
    ['Banana', '3 kg', '', '', ''],
    ['Uva', '5 kg', '', '', ''],
    ['Laranja', '5 kg', '', '', ''],
    ['Bolo', '18 un', '', '', 'Chocolate, Cenoura, Cuca'],
    ['Bolo::Chocolate', '', '', '', ''],
    ['Bolo::Cenoura', '', '', '', ''],
    ['Bolo::Cuca', '', '', '', ''],
    ['Pão', '500 un', '', '', ''],
    ['Bandeja para café', '400 un', '', '', ''],
    ['Copo descartável', '400 un', '', '', ''],
    ['Guardanapos', '1 un', '', '', ''],
    ['Luva', '1 cx', '', '', ''],
    ['Touca', '1 pc', '', '', ''],
    ['Máscara', '1 cx', '', '', ''],
  ]
  var almocoData = [
    ['Nome', 'Qtd Necessária', 'Qtd que Entrou', 'Contribuições', 'Sabores'],
    ['Refrigerante', '40 un', '', '', ''],
    ['Marmita 500 ml', '200 un', '', '', ''],
    ['Marmita 750 ml', '200 un', '', '', ''],
    ['Garfos', '400 un', '', '', ''],
    ['Colheres', '400 un', '', '', ''],
  ]
  writeSheet(ss, 'Cafe', cafeData)
  writeSheet(ss, 'Almoco', almocoData)
}

function writeSheet(ss, name, data) {
  var sheet = ss.getSheetByName(name)
  if (!sheet) sheet = ss.insertSheet(name)
  sheet.clearContents()
  sheet.getRange(1, 1, data.length, data[0].length).setValues(data)
}

function doGet(e) {
  try {
    var action = (e && e.parameter && e.parameter.action) || 'get'

    if (action === 'get') {
      return jsonResponse(readCatalog())
    }

    if (action === 'set' || action === 'setMany' || action === 'contribute') {
      return handleWrite(e.parameter)
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
    var action = body.action || 'contribute'
    if (action === 'get') return jsonResponse(readCatalog())
    body.action = action
    return handleWrite(body)
  } catch (err) {
    return jsonResponse({ error: String(err) })
  }
}

function handleWrite(params) {
  var action = params.action || 'set'

  if (action === 'set') {
    setQuantitiesMany(params.sheet, singleton(params.nome, params.qtd))
  } else if (action === 'setMany') {
    var updates = params.updates
    if (typeof updates === 'string') updates = JSON.parse(updates || '{}')
    setQuantitiesMany(params.sheet, updates || {})
  } else if (action === 'contribute') {
    var qtyUpdates = params.updates
    if (typeof qtyUpdates === 'string') qtyUpdates = JSON.parse(qtyUpdates || '{}')
    setQuantitiesMany(params.sheet, qtyUpdates || singleton(params.nome, params.qtd))
    if (params.logLine && params.nome) {
      appendContribution(params.sheet, params.nome, String(params.logLine))
    }
  }

  var result = readCatalog()
  result.ok = true
  return jsonResponse(result)
}

function singleton(nome, qtd) {
  var o = {}
  if (nome) o[nome] = qtd != null ? String(qtd) : ''
  return o
}

function readCatalog() {
  var result = { Cafe: { items: [] }, Almoco: { items: [] } }
  var ss = SpreadsheetApp.getActiveSpreadsheet()

  SHEET_NAMES.forEach(function (name) {
    var sheet = ss.getSheetByName(name)
    if (!sheet) {
      result[name] = { items: [] }
      return
    }
    var values = sheet.getDataRange().getValues()
    var items = []
    for (var i = 1; i < values.length; i++) {
      var rowName = String(values[i][0] || '').trim()
      if (!rowName) continue
      items.push({
        nome: rowName,
        qtdNecessaria: cellStr(values[i][1]),
        qtdEntrou: cellStr(values[i][2]),
        contribuicoes: cellStr(values[i][3]),
        sabores: cellStr(values[i][4]),
      })
    }
    result[name] = { items: items }
  })
  return result
}

function cellStr(v) {
  if (v === '' || v == null) return ''
  return String(v).trim()
}

function setQuantitiesMany(sheetName, updates) {
  if (SHEET_NAMES.indexOf(sheetName) === -1) {
    throw new Error('Aba inválida: ' + sheetName)
  }
  var ss = SpreadsheetApp.getActiveSpreadsheet()
  var sheet = ss.getSheetByName(sheetName)
  if (!sheet) throw new Error('Aba não encontrada: ' + sheetName)

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
      sheet.appendRow([nome, '', qtd, '', ''])
      indexByName[nome] = sheet.getLastRow()
    }
  }
  SpreadsheetApp.flush()
}

function appendContribution(sheetName, nome, logLine) {
  var ss = SpreadsheetApp.getActiveSpreadsheet()
  var sheet = ss.getSheetByName(sheetName)
  if (!sheet) throw new Error('Aba não encontrada: ' + sheetName)

  var values = sheet.getDataRange().getValues()
  var target = String(nome).trim()
  for (var i = 1; i < values.length; i++) {
    var rowName = String(values[i][0] || '').trim()
    if (rowName !== target) continue
    var current = cellStr(values[i][3])
    var next = current ? current + '\n' + logLine : logLine
    sheet.getRange(i + 1, 4).setValue(next)
    SpreadsheetApp.flush()
    return
  }
  sheet.appendRow([target, '', '', logLine, ''])
  SpreadsheetApp.flush()
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON,
  )
}
