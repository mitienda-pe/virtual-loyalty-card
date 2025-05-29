#!/usr/bin/env node

// Script para probar la extracción de texto
const { extractRUCAndAmount } = require('./src/utils/textExtraction');

// Texto extraído del comprobante de La Baguette
const testText = `LA BAGUETTE
CORPORACION BAGUETERA S.A.C.
RUC: 20504680623
JR. LUIS SANCHEZ CERRO 2128 JESUS MARIA
AV. PARDO Y ALIAGA 456 | TEL.TDA.7155690
SAN ISIDRO
SAN ISIDRO-LIMA-LIMA
TELEFONO: 7130700
-----BOLETA DE VENTA ELECTRONICA----------
NRO DCTO :B011-00524671
FECHA    :2025-05-29   HORA: 08:39:14
NOMBRE   :CONSUMIDOR FINAL
DOC IDENTIDAD :
TELEFONO :-
DIRECCION:
CAJA     :001TPV001
CAJERO   :FRANCIA MENDOZA CATHERINE MARI
MOZO     :FRANCIA MENDOZA CATHERINE MARI
MESA     :LLEVAR 02
---------------------------------------
CANT.    DESCRIPCION    P.U.  SUBTOTAL
1.000 BAGUETTE FRANCES X    4.90     4.90
---------------------------------------
TOTAL SOLES                     S/4.90
---------------------------------------

FORMA DE PAGO : YAPE S/4.90

T.C      :3.500

SON: CUATRO CON 90/100 SOLES

AUTORIZADA MEDIANTE RESOLUCION NRO
034005001017/SUNAT
PARA CONSULTAR
EL COMPROBANTE INGRESE A

REPRESENTACION IMPRESA DE LA BOLETA
DE VENTA ELECTRONICA`;

console.log('🔍 Probando extracción de texto...\n');

const result = extractRUCAndAmount(testText);

console.log('\n📊 Resultado de la extracción:');
console.log(JSON.stringify(result, null, 2));

console.log('\n✅ Verificaciones:');
console.log(`- RUC detectado: ${result.ruc ? '✅' : '❌'} (${result.ruc})`);
console.log(`- Monto detectado: ${result.amount ? '✅' : '❌'} (${result.amount})`);
console.log(`- Número de comprobante: ${result.invoiceId ? '✅' : '❌'} (${result.invoiceId})`);
console.log(`- Nombre del negocio: ${result.businessName ? '✅' : '❌'} (${result.businessName})`);
console.log(`- Items detectados: ${result.items && result.items.length > 0 ? '✅' : '❌'} (${result.items?.length || 0})`);

if (result.items && result.items.length > 0) {
  console.log('\n🛒 Items detectados:');
  result.items.forEach((item, index) => {
    console.log(`  ${index + 1}. ${item.quantity} x ${item.description} - S/${item.subtotal}`);
  });
}
