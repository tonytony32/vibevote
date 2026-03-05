# VibeVote — 1 CRC “applause” per tap

## Idea (one liner)
**VibeVote** es un “applause meter” onchain: durante las demos, la audiencia hace **tap** en el proyecto que le está gustando y **cada tap cuesta 1 CRC**. Al final, gana el proyecto con más CRC recibidos (más “vibe”). La mecánica es la misma que las herramientas de **live polling** (resultados en tiempo real, engagement instantáneo) tipo Slido/Mentimeter.  [oai_citation:0‡Slido](https://www.slido.com/features-live-polling?utm_source=chatgpt.com)

---

## Cómo funciona (flow)
1. Hay **5 proyectos** (cards fijas).
2. Cada card tiene un botón grande: **“VIBE +1 (1 CRC)”**.
3. Cuando el proyecto dice algo que te gusta → haces tap → la miniapp dispara una transacción de 1 CRC hacia ese proyecto.
4. La miniapp muestra en vivo:
   - **Total CRC por proyecto**
   - **Ranking**
   - **Taps totales**
5. Al terminar el pitch session, se cierra la ronda → **winner reveal**.

> Conceptualmente: esto es un *clap-o-meter*, pero con taps pagados y trazabilidad.  [oai_citation:1‡Wikipedia](https://en.wikipedia.org/wiki/Clap-o-meter?utm_source=chatgpt.com)

---

## Reglas del juego
- **1 tap = 1 CRC**
- No hay “un solo voto”: puedes votar tantas veces como quieras durante la demo.
- (Opcional anti-spam) **cooldown**: 1 tap cada 2–5 segundos por wallet.
- (Opcional) mostrar “Top supporters” por proyecto (sin doxx: solo ENS/alias corto).

---

## UX / Pantallas mínimas (para 2h)
### 1) Home: “Choose your vibe”
- 5 cards (nombre + one-liner + tags)
- Botón grande por card: **VIBE +1**
- Barra de progreso / contador al lado del botón

### 2) Live scoreboard
- Tabla/ranking (1→5)
- Total CRC acumulado por proyecto
- “Last 10 taps” (feed simple)

### 3) Reveal / End state
- Ganador destacado
- “Total pot” (suma de CRC)
- Botón “New round” (si quieres reset)

---

## Datos mínimos por proyecto (lo que te tienen que dar)
- `name`
- `oneLiner`
- `logoUrl` (opcional)
- `walletAddress` (dónde recibe CRC)
- `demoLink` (opcional)
- `team` (opcional)

---

## Prompt: “Resumen del proyecto” (para que lo rellenen los equipos)
Pégales esto tal cual:

**Project name** (≤ 30 chars):  
**One-liner** (≤ 120 chars): qué haces y para quién  
**Problem** (1 frase):  
**How it works** (2–3 bullets):  
-  
-  
-  
**Demo moment** (1 frase): “En la demo verás ____”  
**Impact metric** (1 número + unidad):  
**Ask** (elige 1): users / partners / feedback / hires  
**Wallet to receive CRC** (address):  
**Link** (repo/web) + **contact**:

**Reglas de estilo**
- Frases cortas. Cero buzzwords vacíos.
- Si no lo puedes demoear hoy, no lo prometas.

---

## Por qué es divertido (y por qué engancha)
- Es **feedback instantáneo** y visible, como las plataformas de live polls: cada voto actualiza resultados en tiempo real.  [oai_citation:2‡community.slido.com](https://community.slido.com/live-polling-results-217/view-poll-results-432?utm_source=chatgpt.com)
- Convierte la demo en un mini-juego: “¿quién está ganando ahora mismo?”
- Te da una métrica clara de *audience resonance*, estilo “applause meter” (clap-o-meter).  [oai_citation:3‡Wikipedia](https://en.wikipedia.org/wiki/Clap-o-meter?utm_source=chatgpt.com)

---

## Variantes rápidas (si te da tiempo)
- **Emoji reactions** en vez de solo +1 (👍 ❤️ 🤯): cada reacción cuesta 1 CRC y cuenta distinto (solo visual). Inspiración: feedback rápido tipo “reactions”.  [oai_citation:4‡Wooclap](https://www.wooclap.com/en/blog/poll-everywhere-vs-mentimeter/?utm_source=chatgpt.com)
- **Jackpot**: al final, sorteo de 10 CRC entre quienes votaron al ganador (para incentivar taps).
- **Round timer**: 5 min por equipo, se bloquea el botón fuera de tiempo.

---

## Copy listo para la UI (microcopy)
- Header: **VibeVote**
- Sub: **Tap to reward what resonates. 1 CRC = 1 vibe.**
- CTA botón: **VIBE +1 (1 CRC)**
- Footer: **Live scoreboard updates instantly.**

---