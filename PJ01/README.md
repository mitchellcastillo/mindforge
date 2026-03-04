# MindForge (PJ01)

Herramienta web de mapas mentales para brainstorming y organización de ideas.

## Funcionalidades incluidas

- Lienzo visual con tipos de fondo: `Grid`, `Dots`, `Plano`.
- Gestión de múltiples mapas/proyectos independientes.
- Nodos con forma configurable: `Rectángulo`, `Cuadrado`, `Círculo`, `Línea`.
- Notas por nodo.
- Personalización avanzada de nodos: icono, color de relleno/borde/texto, grosor de borde y prioridad.
- Color condicional por prioridad (`Alta`, `Crítica`).
- Conexión entre nodos en modo conexión.
- Comentario por relación (etiqueta de conexión).
- Estilo de conexión configurable: sólida, punteada, puntos; color y grosor.
- Paleta de colores ampliada.
- Galería de plantillas predefinidas:
  - Planificación de proyecto
  - Lluvia de ideas
  - Análisis FODA
- Guardado de plantillas personalizadas (localStorage del navegador).
- Exportación a formatos comunes:
  - JSON
  - SVG
  - CSV (nodos)
  - Markdown
  - PDF (vía impresión del mapa)
- Opción de envío por email (abre cliente de correo con resumen).
- Importación de mapa desde JSON.
- Creación jerárquica en árbol con teclado:
  - `Enter` en nodo seleccionado crea hijo conectado.
  - Desde nivel 3 del árbol, nuevos nodos se crean con forma `Línea`.
- Edición directa sobre nodos:
  - Escribir con nodo seleccionado agrega texto al título.
  - Doble clic en nodo para editar inline.

## Uso

1. Abre `index.html` en un navegador moderno.
2. Crea un mapa con `Nuevo mapa` o selecciona uno existente en `Mapa`.
3. Crea nodos con `+ Nodo` (nodo aislado).
4. Para árbol jerárquico: selecciona un nodo y presiona `Enter` para crear un hijo conectado.
5. Activa `Conectar nodos` y selecciona dos nodos para crear relación manual.
6. Selecciona un nodo o conexión para editar sus propiedades en el inspector.
7. Exporta, importa o guarda plantillas según necesites.

## Atajos y productividad

- `Enter`:
  - con nodo seleccionado: crear hijo conectado.
  - sin nodo seleccionado: no crea nodo (usar `+ Nodo` para aislado).
- `Delete`: eliminar nodos/conexiones seleccionados.
- `Backspace` (con un nodo seleccionado): borrar último carácter del título.
- `Shift + click` en nodos o conexiones: selección múltiple.
- Arrastrar en canvas vacío: seleccionar grupo de nodos (marquee).
- Arrastrar un nodo seleccionado: mover grupo completo.
- `Cmd/Ctrl + C`: copiar selección.
- `Cmd/Ctrl + V`: pegar selección (incluye conexiones internas).
- `Cmd/Ctrl + A`: seleccionar todos los nodos.
- Doble clic en nodo: editar título directamente en el nodo.

## Persistencia

- El mapa actual se guarda automáticamente en `localStorage`.
- Las plantillas de usuario también se guardan en `localStorage`.

## Publicación para usuarios externos (con cuentas separadas)

### 1) Crear backend en Supabase

1. Crea un proyecto en Supabase.
2. Ve a `SQL Editor` y ejecuta el archivo [supabase.sql](/Users/mitchellcastillo/Documents/MCR%20Personal/Trabajo/Develop/Codex%20Open%20AI/PJ01/supabase.sql).
3. En `Authentication > Providers`, habilita `Email` (password).
4. Copia:
   - `Project URL`
   - `Anon public key`

### 2) Publicar frontend

Opciones recomendadas:
- Vercel
- Netlify
- GitHub Pages

Este proyecto es estático, así que solo sube la carpeta `PJ01` y publica `index.html`.

### 3) Configurar la app en producción

1. Abre la app publicada.
2. Clic en `Configurar backend`.
3. Pega `Project URL` y `Anon Public Key`.
4. Clic en `Guardar` (la app se recarga).
5. Clic en `Entrar` para iniciar sesión o crear cuenta.

### 4) Resultado de aislamiento por usuario

- Cada usuario autenticado ve únicamente sus mapas.
- La separación se aplica por `user_id` y políticas `RLS` en Supabase.
- Si no hay sesión iniciada, la app funciona en modo local (navegador actual).
