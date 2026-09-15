# E-commerce Tech

Proyecto de e-commerce de tecnología construido con Next.js 16, con módulos de
**storefront** (cliente) y **administración**. El desarrollo de este proyecto
está gobernado por una metodología **SDD (Spec-Driven Development)** asistida
por IA: ningún cambio de negocio se escribe sin un spec aprobado por una
persona primero.

## Stack

Next.js 16 · React 19 · TypeScript strict · Tailwind 4 · shadcn/ui ·
Neon Postgres · Drizzle ORM · Clerk · TanStack Query v5 · TanStack Table v8 ·
Axios · Zustand · Recharts · Zod · React Hook Form.

Gestor de paquetes: **npm**. Arquitectura completa, flujo de datos y
convenciones de carpetas en [`docs/SETUP.md`](docs/SETUP.md).

## Empezar

```bash
npm install
npm run dev          # servidor de desarrollo (Turbopack)
```

Copia `.env.example` a `.env.local` y completa las variables necesarias
(Neon, Clerk, Stripe) antes de levantar el proyecto.

```bash
npm run build        # build de producción
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
npm run test         # suite de pruebas (node:test)
npm run db:generate  # generar migración Drizzle
npm run db:migrate   # aplicar migraciones a Neon
npm run db:studio    # explorador de datos
npm run db:seed      # datos de prueba
```

## Metodología: Spec-Driven Development (SDD)

Este proyecto se construye con Claude Code bajo un contrato de trabajo
definido en [`CLAUDE.md`](CLAUDE.md). Toda petición de trabajo pasa primero
por un agente **orchestrator**, que clasifica el pedido en uno de dos modos:

```
Prompt del usuario
        │
        ▼
  ┌──────────────┐
  │ orchestrator │  clasifica: ¿SDD o BUILD?
  └──────┬───────┘
         │
   ┌─────┴──────────────────────────────┐
   │                                    │
 MODO: SDD                          MODO: BUILD
   │                                    │
   ▼                                    ▼
 spec ──► ⏸ APROBACIÓN HUMANA ──► developer ⇄ reviewer ──► done
                                                 (bucle, máx. 3)
```

**MODO: SDD** se usa para features nuevas, cambios de modelo de datos,
reglas de negocio o de dinero, autorización/roles, y cualquier cambio que
toque múltiples capas o contratos públicos (rutas API, schemas). **MODO:
BUILD** se reserva para fixes puntuales, ajustes visuales, comandos de
entorno y meta-trabajo del repo — cambios locales y verificables de un
vistazo.

Cada feature construida bajo SDD deja su spec en [`docs/specs/`](docs/specs)
como documentación viva del proyecto: contexto, decisiones técnicas,
contratos de API y tareas ejecutadas. Antes de proponer una feature nueva,
se revisa si ya existe un spec que la cubra.

### Ciclo de vida de un spec

```
draft ──(aprobación humana)──► approved ──► in-progress ──► in-review ──► done
                                                  ▲              │
                                                  └── RECHAZADO ─┘  máx. 3 vueltas
```

**Ningún código se escribe sobre un spec en `status: draft`.** El agente
`spec` entiende el requerimiento, produce el documento con tareas atómicas
y **se detiene**, esperando que una persona responda `aprobado` (o pida
cambios) antes de que `developer` implemente nada. Si el bucle
`developer ⇄ reviewer` llega a 3 iteraciones sin converger, se detiene y se
escala a una persona — no se sigue girando en automático.

## Reglas de uso de IA como fuente de verdad del código

La IA (Claude Code, vía los agentes `orchestrator`, `spec`, `developer` y
`reviewer` definidos en `.claude/agents/`) es una herramienta de
implementación, no una autoridad final. Las reglas que gobiernan su uso en
este proyecto son:

1. **Aprobación humana obligatoria antes de implementar.** Un spec en
   `draft` no autoriza a nadie —humano o IA— a escribir código de producto
   sobre él. El paso `draft → approved` lo hace explícitamente una persona.
2. **La arquitectura de `docs/SETUP.md` es la autoridad, no la memoria del
   modelo.** Si una skill o el conocimiento general de la IA sugieren una
   estructura distinta a la documentada, gana `docs/SETUP.md`.
3. **Reglas duras de arquitectura son bloqueantes en review**, sin
   excepción para código generado por IA: un componente nunca importa `db`
   ni un repositorio directo; toda consulta a BD vive en
   `src/server/repositories/`; todo Route Handler valida su entrada con
   Zod; los tipos se infieren del schema Drizzle, nunca se duplican a
   mano; rutas de admin se protegen en `middleware.ts` **y** con
   verificación de permiso en el handler (comparar `role === 'admin'` en
   código es hallazgo bloqueante).
4. **El agente `reviewer` audita cada implementación contra el spec y la
   arquitectura**, y devuelve hallazgos al `developer` en un bucle acotado
   (máx. 3 vueltas) antes de considerar una tarea terminada. La IA no se
   autoaprueba: el veredicto de cierre pasa por esa auditoría.
5. **Verificación explícita antes de dar por cerrada cualquier tarea**:
   `npm run typecheck && npm run lint && npm run build` (y `npm run test`
   cuando el cambio toca lógica testeable). Una afirmación de la IA de que
   "ya funciona" no reemplaza correr estos comandos.
6. **Skills como documentación vigente, no como reemplazo del criterio del
   equipo.** Antes de resolver con conocimiento de memoria, la IA revisa si
   existe una skill instalada que cubra la tarea (Next.js, Clerk, shadcn,
   dataviz, seguridad, etc.); las skills complementan `CLAUDE.md`, nunca lo
   sustituyen.
7. **Trazabilidad**: cada feature construida con IA bajo SDD deja su spec
   en `docs/specs/` como registro auditable de qué se pidió, qué se decidió
   y qué se implementó — la IA no genera código "silencioso" fuera de ese
   rastro para cambios de negocio.

El detalle operativo completo (agentes, contratos de salida, criterios de
clasificación SDD vs. BUILD, estándares de código) vive en
[`CLAUDE.md`](CLAUDE.md).
