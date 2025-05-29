#!/bin/bash

# Script para configurar permisos de Cloud Storage en Firebase
# Ejecutar este script para habilitar URLs firmadas

echo "🔧 Configurando permisos de Cloud Storage..."

# Obtener el proyecto ID
PROJECT_ID=$(firebase use --current 2>/dev/null | grep -o 'Now using project [^)]*' | sed 's/Now using project //')

if [ -z "$PROJECT_ID" ]; then
    echo "❌ No se pudo obtener el PROJECT_ID. Asegúrate de estar en el directorio correcto del proyecto Firebase."
    exit 1
fi

echo "📋 Proyecto: $PROJECT_ID"

# Habilitar permisos para URLs firmadas
echo "🔑 Habilitando permisos para URLs firmadas..."

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$PROJECT_ID@appspot.gserviceaccount.com" \
    --role="roles/iam.serviceAccountTokenCreator"

if [ $? -eq 0 ]; then
    echo "✅ Permisos configurados correctamente"
    echo "🔄 Ahora puedes usar URLs firmadas en Cloud Storage"
else
    echo "❌ Error configurando permisos. Verifica que tengas permisos de administrador en el proyecto."
    echo "💡 Alternativamente, usa URLs públicas (ya implementado en el código)"
fi
