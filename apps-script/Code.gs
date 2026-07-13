/**
 * Cole este código em: Planilha > Extensões > Apps Script
 *
 * Abas: Cafe | Almoco
 * Colunas:
 *   A Nome | B Qtd Necessária | C Qtd que Entrou | D Sabores (opcional)
 *
 * Sabores (opcional na coluna D), exemplo: Chocolate, Cenoura, Cuca
 * Ou linhas auxiliares: Bolo::Chocolate | Bolo::Cenoura | Bolo::Cuca
 *
 * Deploy: App da Web, executar como Eu, acesso Qualquer pessoa.
 * Após alterar: Implantar > Gerenciar implantações > Nova versão
 */

var SHEET_NAMES = ['Cafe', 'Almoco']

/**
 * Execute uma vez no editor (setupSheets → Executar)
 * para criar as abas com os itens iniciais.
 */
function setupSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet()
  var cafeData = [
    ['Nome', 'Qtd Necessária', 'Qtd que Entrou', 'Sabores'],
    ['Açúcar', '10 kg', '', ''],
    ['Café', '4 pc', '', ''],
    ['Leite', '36 L', '', ''],
    ['Nescau', '5 pc', '', ''],
    ['Presunto', '2 kg', '', ''],
    ['Queijo fatiado', '2 kg', '', ''],
    ['Melancia', '4 un', '', ''],
    ['Banana', '3 kg', '', ''],
    ['Uva', '5 kg', '', ''],
    ['Laranja', '5 kg', '', ''],
    ['Bolo', '18 un', '', 'Chocolate, Cenoura, Cuca'],
    ['Bolo::Chocolate', '', '', ''],
    ['Bolo::Cenoura', '', '', ''],
    ['Bolo::Cuca', '', '', ''],
    ['Pão', '500 un', '', ''],
    ['Bandeja para café', '400 un', '', ''],
    ['Copo descartável', '400 un', '', ''],
    ['Guardanapos', '1 un', '', ''],
    ['Luva', '1 cx', '', ''],
    ['Touca', '1 pc', '', ''],
    ['Máscara', '1 cx', '', ''],
  ]
  var almocoData = [
    ['Nome', 'Qtd Necessária', 'Qtd que Entrou', 'Sabores'],
    ['Refrigerante', '40 un', '', ''],
    ['Marmita 500 ml', '200 un', '', ''],
    ['Marmita 750 ml', '200 un', '', ''],
    ['Garfos', '400 un', '', ''],
    ['Colheres', '400 un', '', ''],
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
      return jsonResponse(readCatalog())
    }

    if (action === 'set') {
      setQuantity(
        e.parameter.sheet,
        e.parameter.nome,
        e.parameter.qtd != null ? String(e.parameter.qtd) : '',
      )
      var afterSet = readCatalog()
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
      var afterMany = readCatalog()
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
      return jsonResponse(readCatalog())
    }

    if (action === 'set') {
      setQuantity(body.sheet, body.nome, body.qtd != null ? String(body.qtd) : '')
      var afterSet = readCatalog()
      afterSet.ok = true
      return jsonResponse(afterSet)
    }

    if (action === 'setMany') {
      setQuantitiesMany(body.sheet, body.updates || {})
      var afterMany = readCatalog()
      afterMany.ok = true
      return jsonResponse(afterMany)
    }

    return jsonResponse({ error: 'Ação inválida' })
  } catch (err) {
    return jsonResponse({ error: String(err) })
  }
}

/** Lista completa da planilha (fonte da verdade do app). */
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

      var qtdNecessaria =
        values[i][1] === '' || values[i][1] == null
          ? ''
          : String(values[i][1]).trim()
      var qtdEntrou =
        values[i][2] === '' || values[i][2] == null
          ? ''
          : String(values[i][2]).trim()
      var sabores =
        values[i].length > 3 && values[i][3] != null && values[i][3] !== ''
          ? String(values[i][3]).trim()
          : ''

      items.push({
        nome: rowName,
        qtdNecessaria: qtdNecessaria,
        qtdEntrou: qtdEntrou,
        sabores: sabores,
      })
    }
    result[name] = { items: items }
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
      sheet.appendRow([nome, '', qtd, ''])
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
