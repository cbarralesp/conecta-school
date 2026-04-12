## Instrucciones para agentes de IA en CTF School Website

Este proyecto es una landing page institucional desarrollada con **Angular 16** y **Tailwind CSS**. El objetivo es mantener una estructura modular, un diseño moderno y una experiencia de usuario fluida para la promoción escolar.

### Arquitectura y estructura
- El código fuente está en `src/app/` y se organiza en:
  - `components/`: Componentes reutilizables (hero, navigation, about, features, testimonials, contact, footer, etc.).
  - `pages/`: Páginas principales (actualmente solo `home`).
  - Cada componente tiene su propio archivo `.ts`, `.html` y `.scss`.
- El enrutamiento principal está en `app-routing.module.ts` y solo define la ruta raíz (`''`) hacia `HomeComponent`.
- El punto de entrada es `main.ts` y el módulo raíz es `AppModule`.
- El diseño y los colores se gestionan con Tailwind, configurado en `tailwind.config.js` y usado en `styles.scss`.

### Flujos de trabajo de desarrollo
- **Desarrollo local:**
  - Ejecuta `npm install` para dependencias.
  - Usa `npm start` o `ng serve` para levantar el servidor en `http://localhost:4200/`.
- **Build de producción:**
  - Ejecuta `npm run build` o `ng build`. El resultado se guarda en `dist/ctf-school-website/`.
- **Pruebas unitarias:**
  - Ejecuta `npm test` o `ng test` para pruebas con Karma/Jasmine.
- **Debug:**
  - Usa la configuración de VS Code en `.vscode/launch.json` para depurar con Chrome.

### Convenciones y patrones específicos
- **Estilos:**
  - Usa clases de Tailwind en los templates HTML. No mezcles CSS global salvo en `styles.scss`.
  - Los componentes usan SCSS solo para estilos muy específicos.
- **Componentes:**
  - Los componentes se comunican solo por inputs/outputs estándar de Angular.
  - No hay servicios personalizados ni lógica de negocio compleja; la lógica es principalmente de presentación.
- **Formularios:**
  - El formulario de contacto usa `ReactiveFormsModule` y la integración con EmailJS (ver credenciales en `contact.component.ts`).
- **Internacionalización:**
  - El sitio está en español (`index.html` lang="es").
- **Imágenes y assets:**
  - Usa la carpeta `src/assets/` para imágenes y recursos estáticos.

### Integraciones y dependencias externas
- **EmailJS:**
  - El formulario de contacto envía correos usando la librería `@emailjs/browser`. Las credenciales deben ser reemplazadas por valores reales.
- **Tailwind CSS:**
  - Configurado en `tailwind.config.js` y cargado en `styles.scss`.
- **Angular CLI:**
  - Usa los comandos estándar (`ng generate`, `ng build`, `ng test`).

### Ejemplos de patrones importantes
- Para agregar un nuevo componente:
  - Ejecuta `ng generate component components/nombre` y sigue la estructura de los existentes.
- Para modificar la navegación o el footer, edita los componentes en `components/navigation/` o `components/footer/`.
- Para cambiar la paleta de colores, edita `tailwind.config.js`.

### Recomendaciones para agentes
- Mantén la estructura modular y reutilizable.
- No agregues lógica de negocio compleja ni servicios innecesarios.
- Sigue el idioma y tono institucional en los textos.
- Usa siempre clases de Tailwind para el diseño visual.

---
Para dudas sobre convenciones, revisa los archivos de ejemplo en `components/` y la configuración en `angular.json` y `tailwind.config.js`.
