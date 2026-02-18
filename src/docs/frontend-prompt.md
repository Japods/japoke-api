# Prompt: Frontend Japoke — Pedidos de Poke Bowls

## Contexto del proyecto

Japoke es una **Dark Kitchen de poke bowls**. Ya tenemos un backend en Node.js + Express + MongoDB corriendo en `http://localhost:4000/api`. Necesitamos construir el **frontend completo** para que los clientes puedan armar y pedir sus poke bowls desde el navegador.

**Stack requerido:** React (Vite) + TailwindCSS. El proyecto se crea en la carpeta `japoke-frontend/` al mismo nivel que `japoke-api/`.

---

## Identidad visual de Japoke

- **Marca:** Japoke (fusión japonesa + poke)
- **Vibe:** Premium casual, japonés moderno, limpio y apetitoso
- **Paleta de colores:**
  - Primary: Coral/salmón `#FF6B5A` (evoca el salmón fresco)
  - Secondary: Verde oscuro `#1B4332` (nori, frescura)
  - Accent: Dorado suave `#D4A574` (sésamo, premium)
  - Background: Blanco cremoso `#FAFAF8`
  - Dark: `#1A1A2E` (para textos)
  - Success: `#2D6A4F`
- **Tipografía:**
  - Headings: font con personalidad (ej. Poppins bold o similar)
  - Body: Inter o similar sans-serif limpia
- **Estilo visual:**
  - Bordes redondeados generosos (rounded-2xl)
  - Sombras suaves y elevación sutil
  - Ilustraciones/iconos de ingredientes donde sea posible
  - Micro-animaciones en transiciones entre pasos
  - Mobile-first (la mayoría pedirá desde el celular)

---

## Flujo de la aplicación (Paso a paso)

La app es un flujo tipo **wizard/stepper** de una sola página. No necesita autenticación con contraseña — solo identificamos al cliente con sus datos.

### Pantalla 0 — Landing / Bienvenida
- Hero con el logo de Japoke y una imagen apetitosa de un poke bowl
- Headline: "Arma tu Poke perfecto"
- Subtext: "Poke bowls frescos, hechos a tu medida"
- Botón CTA grande: **"Hacer mi pedido"** → lleva al Step 1
- Branding japonés minimalista, quizás un patrón sutil de olas o nori en el fondo

### Step 1 — Identificación del cliente
- Título: "Primero, cuéntanos quién eres"
- Formulario simple, amigable, sin login:
  - **Nombre completo** (required)
  - **Cédula/Identificación** (required)
  - **Email** (required)
  - **Teléfono** (required, con formato)
  - **Dirección de entrega** (required)
  - **Notas especiales** (optional, textarea — "Alergias, instrucciones especiales...")
- Guardar datos del cliente en estado global (Context o Zustand) para el paso final
- Si el usuario ya pidió antes (localStorage por teléfono/email), pre-llenar los campos
- Botón: **"Continuar"** → Step 2

### Step 2 — Elegir tipo de Poke
- Título: "Elige tu poke"
- Mostrar los tipos de poke como **tarjetas grandes** una al lado de la otra:
  - **Premium** — $12
    - "Elige entre Salmón, Camarones o Kani"
    - Badge: "Incluye proteínas premium"
  - **Base** — $9
    - "Atún, Ceviche o Pollo"
    - Badge: "Nuestros clásicos"
- Cada tarjeta muestra:
  - Nombre y precio destacado
  - Resumen de reglas: "100g proteína • 120g base • 4 vegetales • 2 salsas • 1 topping"
  - Qué proteínas incluye (tiers permitidos)
- Al seleccionar un tipo, se resalta con borde de color y animación
- El usuario puede agregar **múltiples bowls** al pedido (botón "Agregar otro bowl" al final del flujo)
- Botón: **"Armar mi bowl"** → Step 3

### Step 3 — Armar el Poke (el corazón de la app)

Este es el paso más importante. Es un **sub-stepper** dentro del paso 3, donde el usuario va eligiendo ingredientes categoría por categoría. Usar un diseño tipo carrusel o acordeón con progreso visible.

**Barra de progreso del bowl** en la parte superior mostrando: Proteína → Base → Vegetales → Salsas → Toppings → Extras

#### 3a — Elegir Proteína(s)
- Título: "Elige tu proteína" + indicador "(100g incluidos)"
- Mostrar solo las proteínas del tier permitido por el pokeType seleccionado
  - Premium → muestra premium + base
  - Base → muestra solo base
- Cada proteína es una **tarjeta seleccionable** con nombre
- Opción de mezcla: toggle **"Quiero mezclar 50/50"**
  - Si activo: el usuario elige 2 proteínas (50g + 50g)
  - Si inactivo: 1 proteína (100g)
- Validación visual: mostrar cuántos gramos van seleccionados vs requeridos

#### 3b — Elegir Base(s)
- Título: "Elige tu base" + "(120g incluidos)"
- Tarjetas: Arroz, Quinoa
- Mismo toggle de mezcla 50/50 (60g + 60g)

#### 3c — Elegir Vegetales
- Título: "Elige tus vegetales" + "(máx. 4)"
- Grid de tarjetas seleccionables con checkboxes visuales
- Contador: "2 de 4 seleccionados"
- Deshabilitar las no seleccionadas cuando se llega al máximo
- Items: Zanahoria, Aguacate, Cebolla, Cebollín, Rábanos, Repollo Morado, Maíz

#### 3d — Elegir Salsas
- Título: "Elige tus salsas caseras" + "(máx. 2)"
- Misma mecánica que vegetales
- Items: Fuji, Anguila, Teriyaki, Mayosiracha

#### 3e — Elegir Toppings
- Título: "Elige tu topping" + "(máx. 1)"
- Items: Maíz Inflado, Maní, Cebolla Crunchy

#### 3f — Extras (opcional)
- Título: "Algo extra?" + "(opcional)"
- Lista de posibles extras con botón +/- para cantidad:
  - Proteína Premium extra (Salmón, Camarones, Kani) → +$5
  - Proteína Base extra (Atún, Ceviche, Pollo...) → +$3
  - Aguacate extra → +$1
  - Topping extra → +$1
  - Salsa extra → +$0.50
- Mostrar subtotal de extras en tiempo real

#### Resumen del bowl (sidebar o bottom sheet en mobile)
- Siempre visible mientras arma el bowl
- Muestra: tipo de poke, cada selección hecha, extras, precio parcial
- En mobile: bottom sheet colapsable que muestra el total y se expande para ver detalle

Botón: **"Agregar al pedido"** → vuelve a vista de pedido con opción de agregar otro bowl o confirmar

### Step 4 — Resumen del pedido
- Título: "Tu pedido"
- Lista de todos los bowls agregados, cada uno expandible para ver detalle:
  - "Bowl 1: Premium — Salmón + Kani 50/50, Arroz, Zanahoria, Aguacate, Cebolla, Cebollín, Fuji, Teriyaki, Maíz Inflado + Extra Aguacate"
  - Precio del bowl: $13
  - Botón para editar o eliminar cada bowl
- Botón: **"+ Agregar otro bowl"** → vuelve al Step 2
- Datos del cliente (resumen colapsable, con opción de editar)
- **Desglose de precio:**
  - Subtotal: $XX
  - Total: $XX
- Botón grande: **"Confirmar pedido"** → POST /api/orders

### Step 5 — Confirmación
- Animación de éxito (confetti o check animado)
- "Pedido confirmado!"
- Número de pedido: **JAP-0001**
- Resumen del pedido
- "Te avisaremos cuando esté listo"
- Botón: **"Hacer otro pedido"** → reinicia el flujo

---

## Conexión con el API

**Base URL:** `http://localhost:4000/api`

### Endpoints que usa el frontend:

#### 1. Cargar catálogo (al iniciar la app)
```
GET /api/catalog
```
Respuesta: devuelve `pokeTypes` (con reglas) y `categories` (con items). Toda la data que necesitas para armar los pasos viene de aquí. Cachear en estado global.

Ejemplo de respuesta:
```json
{
  "success": true,
  "data": {
    "pokeTypes": [
      {
        "_id": "...",
        "name": "Premium",
        "slug": "premium",
        "basePrice": 12,
        "rules": {
          "proteinGrams": 100,
          "baseGrams": 120,
          "maxVegetables": 4,
          "maxSauces": 2,
          "maxToppings": 1
        },
        "allowedProteinTiers": ["premium", "base"]
      },
      {
        "_id": "...",
        "name": "Base",
        "slug": "base",
        "basePrice": 9,
        "rules": { ... },
        "allowedProteinTiers": ["base"]
      }
    ],
    "categories": [
      {
        "_id": "...",
        "name": "Proteína Premium",
        "slug": "protein-premium",
        "type": "protein",
        "items": [
          {
            "_id": "...",
            "name": "Salmón",
            "slug": "salmon",
            "tier": "premium",
            "extraPrice": 5,
            "isAvailable": true
          }
        ]
      },
      {
        "name": "Proteína Base",
        "type": "protein",
        "items": [
          { "name": "Atún", "tier": "base", "extraPrice": 3 },
          { "name": "Ceviche", "tier": "base", "extraPrice": 3 },
          { "name": "Pollo a la Plancha", "tier": "base", "extraPrice": 3 },
          { "name": "Pollo Crispie", "tier": "base", "extraPrice": 3 }
        ]
      },
      {
        "name": "Base del Poke",
        "type": "base",
        "items": [
          { "name": "Arroz" },
          { "name": "Quinoa" }
        ]
      },
      {
        "name": "Vegetales",
        "type": "vegetable",
        "items": [
          { "name": "Zanahoria", "extraPrice": 0 },
          { "name": "Aguacate", "extraPrice": 1 },
          { "name": "Cebolla" },
          { "name": "Cebollín" },
          { "name": "Rábanos" },
          { "name": "Repollo Morado" },
          { "name": "Maíz" }
        ]
      },
      {
        "name": "Salsas Caseras",
        "type": "sauce",
        "items": [
          { "name": "Fuji", "extraPrice": 0.5 },
          { "name": "Anguila", "extraPrice": 0.5 },
          { "name": "Teriyaki", "extraPrice": 0.5 },
          { "name": "Mayosiracha", "extraPrice": 0.5 }
        ]
      },
      {
        "name": "Toppings",
        "type": "topping",
        "items": [
          { "name": "Maíz Inflado", "extraPrice": 1 },
          { "name": "Maní", "extraPrice": 1 },
          { "name": "Cebolla Crunchy", "extraPrice": 1 }
        ]
      }
    ]
  }
}
```

#### 2. Crear pedido
```
POST /api/orders
Content-Type: application/json
```

Body que debe enviar el frontend:
```json
{
  "customer": {
    "name": "José Vivas",
    "identification": "V-12345678",
    "email": "jose@japoke.com",
    "phone": "+58 412 1234567",
    "address": "Calle Principal 123, Caracas",
    "notes": "Sin cebolla por favor"
  },
  "items": [
    {
      "pokeType": "<_id del PokeType>",
      "selections": {
        "proteins": [
          { "item": "<_id del item>", "quantity": 50 },
          { "item": "<_id del item>", "quantity": 50 }
        ],
        "bases": [
          { "item": "<_id>", "quantity": 120 }
        ],
        "vegetables": [
          { "item": "<_id>" },
          { "item": "<_id>" },
          { "item": "<_id>" },
          { "item": "<_id>" }
        ],
        "sauces": [
          { "item": "<_id>" },
          { "item": "<_id>" }
        ],
        "toppings": [
          { "item": "<_id>" }
        ]
      },
      "extras": [
        { "item": "<_id del aguacate>", "quantity": 1 }
      ]
    }
  ]
}
```

**Importante sobre quantities:**
- `proteins[].quantity`: gramos. Si 1 proteína = 100g. Si mezcla = 50g + 50g
- `bases[].quantity`: gramos. Si 1 base = 120g. Si mezcla = 60g + 60g
- `vegetables`, `sauces`, `toppings`: no llevan quantity, solo `{ item: id }`
- `extras[].quantity`: cantidad de porciones extra (1, 2, etc.)

Respuesta exitosa (201):
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "orderNumber": "JAP-0001",
    "customer": { ... },
    "items": [ ... ],
    "subtotal": 13,
    "total": 13,
    "status": "pending",
    "createdAt": "..."
  }
}
```

Respuesta con error de validación (400):
```json
{
  "success": false,
  "error": "Máximo 4 vegetales (recibido: 5)"
}
```

#### 3. Consultar pedido
```
GET /api/orders/:orderNumber
```
Ej: `GET /api/orders/JAP-0001`

---

## Reglas de negocio que el frontend debe respetar (UX)

El backend valida todo, pero el frontend debe guiar al usuario para que no pueda enviar datos inválidos:

1. **Proteínas:** máximo 2, los gramos deben sumar exactamente lo que dice `rules.proteinGrams` (100g). Si elige 1 → 100g. Si mezcla → 50g + 50g
2. **Bases:** máximo 2, gramos deben sumar `rules.baseGrams` (120g). Si elige 1 → 120g. Si mezcla → 60g + 60g
3. **Vegetales:** máximo `rules.maxVegetables` (4). Deshabilitar selección al llegar al máximo
4. **Salsas:** máximo `rules.maxSauces` (2)
5. **Toppings:** máximo `rules.maxToppings` (1)
6. **Proteínas permitidas por tipo:**
   - Premium: puede elegir proteínas de tier `premium` y `base`
   - Base: solo puede elegir proteínas de tier `base`
   - El frontend filtra las proteínas según `pokeType.allowedProteinTiers` cruzando con `item.tier`
7. **Extras:** cada extra tiene un `extraPrice` definido en el catálogo. El frontend calcula el subtotal en tiempo real
8. **Precio del bowl:** `basePrice + sum(extras.subtotal)`
9. **Todos los campos del cliente son required** excepto `notes`

---

## Estructura sugerida del frontend

```
japoke-frontend/
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── public/
│   └── favicon.ico
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── index.css                    # Tailwind imports + custom styles
│   ├── api/
│   │   └── client.js                # Fetch wrapper (baseURL, error handling)
│   ├── context/
│   │   └── OrderContext.jsx          # Estado global: customer, bowls, catalog
│   ├── hooks/
│   │   ├── useCatalog.js             # Fetch y cache del catálogo
│   │   └── useOrder.js               # Lógica de armado del pedido
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.jsx
│   │   │   ├── ProgressBar.jsx       # Stepper visual (pasos 1-5)
│   │   │   └── BottomSummary.jsx     # Resumen flotante en mobile
│   │   ├── landing/
│   │   │   └── Hero.jsx
│   │   ├── customer/
│   │   │   └── CustomerForm.jsx
│   │   ├── poke-type/
│   │   │   └── PokeTypeCard.jsx
│   │   ├── builder/
│   │   │   ├── BuilderStepper.jsx    # Sub-stepper del armado
│   │   │   ├── ProteinSelector.jsx
│   │   │   ├── BaseSelector.jsx
│   │   │   ├── VegetableSelector.jsx
│   │   │   ├── SauceSelector.jsx
│   │   │   ├── ToppingSelector.jsx
│   │   │   ├── ExtrasSelector.jsx
│   │   │   └── IngredientCard.jsx    # Tarjeta reutilizable de ingrediente
│   │   ├── summary/
│   │   │   ├── OrderSummary.jsx
│   │   │   └── BowlDetail.jsx
│   │   └── confirmation/
│   │       └── OrderConfirmation.jsx
│   └── pages/
│       └── OrderFlow.jsx             # Orquesta todos los steps
```

---

## Detalles de UX/UI importantes

### Mobile first
- El 80% de los usuarios pedirá desde el celular
- El builder debe funcionar perfecto en pantallas de 375px+
- Usar bottom sheet para el resumen del pedido en mobile
- Botones grandes, touch-friendly (min 44px de alto)
- Scroll suave entre secciones

### Animaciones y transiciones
- Transición suave entre cada paso (slide o fade)
- Ingredientes seleccionados: scale + borde de color + checkmark animado
- Contador de vegetales/salsas/toppings con micro-animación al cambiar
- Precio total con animación numérica al cambiar (count-up)
- Confetti o animación de celebración en la confirmación

### Feedback visual
- Ingredientes seleccionados claramente diferenciados (borde coral, fondo suave)
- Ingredientes deshabilitados (máximo alcanzado) con opacidad reducida
- Barra de progreso del bowl con pasos completados en verde
- Toast de error si el backend rechaza algo (no debería pasar si el frontend valida bien)
- Loading states en el botón de confirmar pedido

### Precio siempre visible
- El precio del bowl actual siempre visible en la parte inferior
- Desglose: "Base: $12 + Extras: $1 = $13"
- Al tener múltiples bowls, mostrar total del pedido

### LocalStorage para conveniencia
- Guardar datos del cliente en localStorage (keyed por email o teléfono)
- Al volver a la app, pre-llenar el formulario automáticamente
- Pregunta: "Hola [nombre], quieres pedir de nuevo?" si detecta datos guardados

---

## Lo que NO debe tener (por ahora)

- No auth/login/registro con contraseña
- No sistema de pagos (solo recibe el pedido, pago se gestiona al entregar)
- No tracking en tiempo real del pedido
- No panel admin (eso ya lo tiene el backend por API)
- No dark mode (mantener diseño claro y apetitoso)
- No i18n (solo español)

---

## Checklist de verificación

Una vez construido, verificar:

1. [ ] La app carga el catálogo de `GET /api/catalog` al iniciar
2. [ ] El formulario de cliente valida todos los campos required
3. [ ] Los datos del cliente se guardan en localStorage
4. [ ] Las tarjetas de tipo de poke muestran precio y reglas correctamente
5. [ ] El selector de proteínas filtra por tier según el tipo de poke elegido
6. [ ] La mezcla 50/50 de proteínas funciona y envía las quantities correctas
7. [ ] La mezcla de bases funciona igual
8. [ ] No se pueden seleccionar más vegetales/salsas/toppings que el máximo
9. [ ] Los extras calculan el precio correctamente en tiempo real
10. [ ] Se puede agregar múltiples bowls al pedido
11. [ ] El resumen muestra todo correctamente antes de confirmar
12. [ ] El POST a `/api/orders` envía el formato correcto y maneja errores
13. [ ] La pantalla de confirmación muestra el orderNumber
14. [ ] La app es responsive y funciona bien en mobile (375px+)
15. [ ] Las animaciones y transiciones son suaves
