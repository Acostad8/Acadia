# Sistema Operativo Académico para Estudiantes Universitarios

## Descripción General

El Sistema Operativo Académico para Estudiantes Universitarios es una plataforma web diseñada para centralizar, automatizar y optimizar la gestión de la vida académica de un estudiante durante toda su carrera. La plataforma busca reemplazar el uso de múltiples herramientas independientes (Google Drive, calendarios, gestores de tareas, gestores bibliográficos, hojas de cálculo, aplicaciones de notas, etc.) por un único ecosistema inteligente que concentre toda la información académica.

Su principal diferenciador es la automatización del inicio de cada semestre. A partir del horario oficial en formato PDF proporcionado por la universidad, el sistema será capaz de configurar automáticamente el nuevo semestre, crear las materias, organizar la estructura documental en Google Drive, generar el horario, preparar el calendario académico y dejar cada módulo listo para ser utilizado.

---

# Módulo 1. Gestión Académica

## Objetivo

Administrar toda la información relacionada con las materias cursadas durante cada semestre.

## Funcionalidades

### Gestión de semestres

- Crear semestres manualmente.
- Crear semestres automáticamente al analizar el horario.
- Editar información del semestre.
- Archivar semestres finalizados.
- Consultar historial académico.

### Gestión de materias

Cada materia deberá contener:

- Nombre
- Código
- Grupo
- Créditos
- Profesor
- Salón
- Color identificador
- Horario
- Observaciones

### Sistema de evaluaciones

Cada materia podrá configurarse con su propia estructura.

Ejemplo:

- Parcial 1
- Parcial 2
- Quices
- Talleres
- Tercera Nota
- Examen final

Cada evaluación tendrá:

- Nota obtenida

### Calculadora inteligente de notas

El sistema deberá calcular automáticamente:

- Nota acumulada
- Nota restante
- Nota mínima para aprobar
- Nota necesaria para obtener 4.0
- Nota necesaria para obtener 4.5
- Nota necesaria para obtener 5.0
- Nota máxima posible
- Estado de aprobación
- Simulación de escenarios

---

# Módulo 2. Horario Inteligente

## Objetivo

Automatizar completamente la configuración del semestre.

## Funcionalidades

### Importación del horario

El usuario podrá subir el horario oficial en PDF.

En la carpeta del proyecto se encuentra el pdf del horario para usarlo con guia de como debe ser la extraccion de la informacion.

El sistema deberá extraer automáticamente:

- Semestre
- Materias
- Horarios
- Días
- Salones
- Profesores
- Grupo
- Código

### Creación automática

Una vez analizado el horario el sistema deberá:

- Crear el semestre
- Crear las materias
- Crear el horario semanal
- Crear el calendario académico
- Crear las carpetas del semestre
- Configurar los demás módulos

### Visualización

- Vista semanal
- Vista mensual
- Vista diaria
- Vista por materia

---

# Módulo 3. Biblioteca Académica

## Objetivo

Administrar todos los documentos académicos del estudiante.

## Funcionalidades

### Organización automática


### Carga inteligente

Al subir un archivo el sistema deberá:

- Detectar la materia
- Sugerir la ubicación
- Guardarlo automáticamente

### Sincronización con Google Drive

El sistema deberá:

- Crear automáticamente las carpetas.
- Subir los documentos.
- Mantener sincronizados los archivos.
- Guardar el identificador de cada carpeta.
- Permitir acceder al archivo desde la plataforma.

### Buscador

Buscar documentos por:

- Nombre
- Materia
- Etiquetas
- Contenido del PDF
- Fecha
- Tipo


---

# Módulo 4. Investigación y Referencias

## Objetivo

Gestionar investigaciones académicas y referencias bibliográficas.

## Funcionalidades

### Proyectos de investigación

Cada investigación tendrá:

- Nombre
- Descripción
- Integrantes
- Fecha de entrega

### Gestor bibliográfico

Inspirado en BibGuru.

Debe permitir:

- Crear referencias
- Editarlas
- Eliminarlas
- Agruparlas
- Exportarlas

### Formatos soportados

- APA 7
- IEEE
- MLA
- Chicago
- Vancouver
- Harvard

### Generación automática

Al ingresar:

- DOI
- URL
- ISBN

El sistema deberá completar automáticamente la referencia.

### Banco de enlaces

Guardar:

- Artículos
- Videos
- Blogs
- Papers
- Normativas
- Repositorios

---

# Módulo 5. Calendario Académico

## Objetivo

Centralizar todas las actividades académicas.

## Funcionalidades

Registrar:

- Parciales
- Talleres
- Laboratorios
- Quices
- Sustentaciones
- Exposiciones
- Tutorías
- Eventos universitarios

Características:

- Recordatorios
- Notificaciones
- Vista mensual
- Vista semanal
- Sincronización con el horario

---

# Módulo 6. Gestión Financiera

## Objetivo

Administrar todos los gastos relacionados con la universidad.

## Ingresos

- Becas
- Trabajo
- Auxilios
- Padres
- Otros

## Gastos

- Matrícula
- Transporte
- Alimentación
- Libros
- Fotocopias
- Papelería
- Materiales
- Software
- Internet
- Impresiones

## Reportes

- Gastos mensuales
- Gastos por semestre
- Gastos por materia
- Evolución histórica
- Presupuesto
- Balance financiero

---

# Módulo 7. Portafolio Académico

## Objetivo

Documentar todos los proyectos realizados durante la carrera.

Cada proyecto deberá almacenar:

- Nombre
- Descripción
- Materia
- Semestre
- Profesor
- Integrantes
- Estado
- Tecnologías
- Capturas
- Video demostrativo
- Repositorio Git
- Documentación
- Diagramas
- Base de datos
- Presentación
- Manual técnico
- Manual de usuario

Características:

- Portafolio público
- Exportación del portafolio
- Filtros
- Buscador
- Estadísticas

---

# Módulo 8. Analítica Académica

## Objetivo

Generar indicadores sobre el rendimiento académico.

## Indicadores

- Promedio general
- Promedio por semestre
- Promedio por materia
- Materias aprobadas
- Materias pendientes
- Créditos aprobados
- Créditos restantes
- Horas de estudio
- Productividad
- Rendimiento semanal

Visualizaciones:

- Gráficos
- Tendencias
- Comparativas
- Progreso de la carrera

---

# Módulo 9. Integraciones y Automatización

## Objetivo

Integrar la plataforma con servicios externos.

## Integraciones iniciales

- Google Drive
- Google Calendar
- GitHub

## Integraciones futuras

- Moodle
- Google Classroom
- OneDrive
- Dropbox
- Microsoft Calendar
- Plataformas universitarias

## Automatizaciones

- Creación automática de carpetas.
- Organización automática de documentos.
- Configuración automática del semestre.
- Sincronización de archivos.
- Actualización del calendario.

---

# Módulo 10. Asistente Inteligente (IA)

## Objetivo

Automatizar tareas y asistir al estudiante durante toda la carrera.

## Funcionalidades

- Responder preguntas sobre documentos.
- Generar resúmenes.
- Crear cuestionarios.
- Explicar conceptos.
- Buscar información entre todos los documentos.
- Clasificar archivos automáticamente.
- Sugerir planes de estudio.
- Detectar materias con riesgo académico.
- Recomendar prioridades.
- Ayudar en investigaciones.
- Sugerir organización de archivos.
- Generar recordatorios inteligentes.

---

# Flujo Automatizado de Inicio de Semestre

## Paso 1

El estudiante descarga el horario oficial desde la universidad.

## Paso 2

Carga el PDF en la plataforma.

## Paso 3

El sistema analiza automáticamente el documento.

## Paso 4

Se crea el nuevo semestre.

## Paso 5

Se crean todas las materias.

## Paso 6

Se genera automáticamente el horario semanal.

## Paso 7

Se crea el calendario académico.

## Paso 8

Se crea automáticamente en Google Drive una estructura como:

Universidad/
└── 2026-2/
    ├── Bases de Datos/
    │   ├── Apuntes/
    │   ├── Talleres/
    │   ├── Laboratorios/
    │   ├── Parciales/
    │   ├── Proyectos/
    │   ├── Investigaciones/
    │   └── Referencias/
    ├── Redes/
    ├── Ingeniería de Software/
    └── ...

## Paso 9

Todos los módulos quedan configurados automáticamente para el nuevo semestre.

---

# Visión del Proyecto

El objetivo final es construir un verdadero **Sistema Operativo Académico**, donde el estudiante solo deba preocuparse por estudiar. La plataforma se encargará de organizar automáticamente la información, sincronizar documentos, gestionar proyectos, controlar el rendimiento académico, administrar las finanzas y mantener un historial completo de toda la vida universitaria, desde el primer hasta el último semestre.