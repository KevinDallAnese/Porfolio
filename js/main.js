/* ==========================================================================
   1. CONFIGURACIÓN Y ESTADO GLOBAL
   ========================================================================== */

const CONFIG = {
    FUENTES_IMAGEN: ['img/yo.png', 'img/yo_2.png'],
    COLOR_MARCA: { r: 255, g: 92, b: 51 },
    RADIO_ALTAR: 110,
    BREAKPOINT_MOBILE: 768
};

let particulas = [];
let spriteMarca;
let estado = 'LOADER';

let anclaPerfil;
let seccionContacto;
let altarInvocacion;
let contenedorSnap;
let canvasGlobal;

let prevMouseX = 0;
let prevMouseY = 0;
let intensidadRitual = 0;
let anguloAcumuladoRitual = 0;

let trazandoLoader = false;
let nodosEncendidos = [];
let progresoSelloFinal = 0;
let ritualCompletado = false;
let chispasLoader = [];

let mapasRetratos = [[], []];
let indiceRetratoActual = 0;

/* ==========================================================================
   2. INICIALIZACIÓN Y MUESTREO DE PARTÍCULAS
   ========================================================================== */

function crearSpriteMarca() {
    const { r, g, b } = CONFIG.COLOR_MARCA;
    const pg = createGraphics(24, 24);
    const ctx = pg.drawingContext;
    const grad = ctx.createRadialGradient(12, 12, 0, 12, 12, 12);

    grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.95)`);
    grad.addColorStop(0.32, `rgba(${r}, ${g}, ${b}, 0.45)`);
    grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 24, 24);
    spriteMarca = pg;
}

function muestrearPuntosTexto(esMobile, objetivo) {
    const pg = createGraphics(width, height);
    pg.background(0);
    pg.fill(255);
    pg.textFont('Cinzel, Georgia, serif');
    pg.textAlign(CENTER, CENTER);
    pg.textStyle(BOLD);
    pg.textSize(esMobile ? 32 : 64);
    pg.text('KEVIN D.D', width / 2, height / 2);
    pg.loadPixels();

    const cajaAncho = esMobile ? width * 0.9 : 550;
    const cajaAlto = esMobile ? 120 : 180;
    const minX = max(0, floor(width / 2 - cajaAncho / 2));
    const maxX = min(width, floor(width / 2 + cajaAncho / 2));
    const minY = max(0, floor(height / 2 - cajaAlto / 2));
    const maxY = min(height, floor(height / 2 + cajaAlto / 2));

    const puntos = [];
    let intentos = 0;

    while (puntos.length < objetivo && intentos < 35000) {
        intentos++;
        const rx = floor(random(minX, maxX));
        const ry = floor(random(minY, maxY));
        const idx = (rx + ry * width) * 4;

        if (pg.pixels[idx] > 128) {
            puntos.push({
                x: rx + random(-0.8, 0.8),
                y: ry + random(-0.8, 0.8)
            });
        }
    }

    pg.remove();

    if (puntos.length === 0) {
        for (let i = 0; i < 400; i++) {
            puntos.push({
                x: width / 2 + random(-150, 150),
                y: height / 2 + random(-30, 30)
            });
        }
    }

    return shuffle(puntos);
}

function generarPuntosRitual(cantidad, esMobile) {
    const puntos = [];
    const radioExt = min(width, height) * (esMobile ? 0.30 : 0.31);
    const radioInt = radioExt * 0.65;

    for (let i = 0; i < cantidad; i++) {
        const selector = i % 10;
        let x, y;

        if (selector < 4) {
            const ang = random(TWO_PI);
            const r = radioExt + random(-3, 3);
            x = cos(ang) * r;
            y = sin(ang) * r;
        } else if (selector < 7) {
            const ang = random(TWO_PI);
            const r = radioInt + random(-2.5, 2.5);
            x = cos(ang) * r;
            y = sin(ang) * r;
        } else {
            const vertice = floor(random(3));
            const sigVertice = (vertice + 1) % 3;
            const ang1 = (TWO_PI / 3) * vertice - HALF_PI;
            const ang2 = (TWO_PI / 3) * sigVertice - HALF_PI;
            const t = random();

            x = lerp(cos(ang1) * radioExt, cos(ang2) * radioExt, t) + random(-2, 2);
            y = lerp(sin(ang1) * radioExt, sin(ang2) * radioExt, t) + random(-2, 2);
        }

        puntos.push({ x, y });
    }

    return shuffle(puntos);
}

function aplicarMapaRetrato(indice) {
    const puntos = mapasRetratos[indice];
    if (!puntos || !puntos.length) return;

    for (let i = 0; i < particulas.length; i++) {
        const pt = puntos[i % puntos.length];
        particulas[i].asignarDestinoImagen(pt.x, pt.y, pt.luz);
    }
}

function cargarPuntosRetratos(anchoImg, altoImg) {
    CONFIG.FUENTES_IMAGEN.forEach((ruta, indice) => {
        loadImage(ruta, (img) => {
            const densidad = 2;
            img.resize(anchoImg, altoImg);
            img.loadPixels();

            const puntos = [];
            for (let y = 0; y < img.height; y += densidad) {
                for (let x = 0; x < img.width; x += densidad) {
                    const idx = (x + y * img.width) * 4;
                    const r = img.pixels[idx];
                    const g = img.pixels[idx + 1];
                    const b = img.pixels[idx + 2];
                    const a = img.pixels[idx + 3];

                    if (a > 120) {
                        const brillo = r * 0.299 + g * 0.587 + b * 0.114;
                        if (brillo > 128) {
                            puntos.push({
                                x: x + random(-0.25, 0.25),
                                y: y + random(-0.25, 0.25),
                                luz: brillo / 255
                            });
                        }
                    }
                }
            }

            if (puntos.length > 0) {
                mapasRetratos[indice] = shuffle(puntos);
                if (indice === indiceRetratoActual) {
                    aplicarMapaRetrato(indice);
                }
            }
        });
    });
}

function setup() {
    pixelDensity(Math.min(window.devicePixelRatio || 1, 2));

    canvasGlobal = createCanvas(windowWidth, windowHeight);
    canvasGlobal.id('canvas-global-particulas');
    canvasGlobal.style('background', 'transparent');
    imageMode(CENTER);

    crearSpriteMarca();

    anclaPerfil = document.getElementById('contenedor-particulas-perfil');
    seccionContacto = document.getElementById('contacto');
    altarInvocacion = document.getElementById('altar-invocacion');
    contenedorSnap = document.querySelector('.portada-snap');

    if (contenedorSnap) {
        contenedorSnap.style.overflowY = 'hidden';
    }

    const esMobile = window.innerWidth <= CONFIG.BREAKPOINT_MOBILE;
    const totalParticulas = esMobile ? 800 : 1600;
    const anchoImg = esMobile ? 150 : 260;
    const altoImg = esMobile ? 200 : 350;

    const puntosTexto = muestrearPuntosTexto(esMobile, totalParticulas);
    const puntosRitual = generarPuntosRitual(totalParticulas, esMobile);

    for (let i = 0; i < totalParticulas; i++) {
        const ptTexto = puntosTexto[i % puntosTexto.length];
        const ptRitual = puntosRitual[i];
        const esEspora = random() < 0.14;

        particulas.push(
            new Particula(
                ptTexto.x,
                ptTexto.y,
                random(anchoImg),
                random(altoImg),
                ptRitual.x,
                ptRitual.y,
                esMobile,
                esEspora,
                0.7
            )
        );
    }

    cargarPuntosRetratos(anchoImg, altoImg);
    configurarRitualEntrada();
    configurarReliquiasRitual();
    configurarCierreNavbarMovil();
    configurarProfundidadCarrusel();
    configurarCambioRetrato();
}

/* ==========================================================================
   3. RITUAL DE ENTRADA (LLAMAS DE BRASAS Y MATERIALIZACIÓN DEL SELLO)
   ========================================================================== */

function obtenerNodosSello(esMobile) {
    const cx = width / 2;
    const cy = height / 2;
    const radioExt = min(width, height) * (esMobile ? 0.30 : 0.31);
    const nodos = [];

    for (let i = 0; i < 3; i++) {
        const ang = (TWO_PI / 3) * i - HALF_PI;
        nodos.push({
            id: i,
            x: cx + cos(ang) * radioExt,
            y: cy + sin(ang) * radioExt
        });
    }

    return { cx, cy, radioExt, nodos };
}

function emitirChispaLoader(x, y, vx, vy, tam, desgaste) {
    if (chispasLoader.length > 260) {
        chispasLoader.shift();
    }
    chispasLoader.push({
        x: x + random(-3, 3),
        y: y + random(-3, 3),
        vx,
        vy,
        tam,
        vida: 1,
        desgaste,
        seed: random(1000)
    });
}

function dibujarFilamentoOrganico(ctx, p1, p2, tiempo, intensidad) {
    const pasos = 26;
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const distTotal = Math.hypot(dx, dy) || 1;
    const nx = -dy / distTotal;
    const ny = dx / distTotal;

    const { r, g, b } = CONFIG.COLOR_MARCA;

    ctx.beginPath();
    ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${0.32 * intensidad})`;
    ctx.lineWidth = 1.6;

    for (let i = 0; i <= pasos; i++) {
        const t = i / pasos;
        const envolvente = sin(t * PI);
        const onda = (noise(t * 4.5, tiempo * 2.4, p1.x * 0.01) - 0.5) * 16 * envolvente;
        const px = lerp(p1.x, p2.x, t) + nx * onda;
        const py = lerp(p1.y, p2.y, t) + ny * onda;

        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }
    ctx.stroke();

    for (let k = 0; k < 2; k++) {
        const fase = (tiempo * 0.65 + k * 0.5) % 1;
        const envolvente = sin(fase * PI);
        const onda = (noise(fase * 4.5, tiempo * 2.4, p1.x * 0.01) - 0.5) * 16 * envolvente;
        const bx = lerp(p1.x, p2.x, fase) + nx * onda;
        const by = lerp(p1.y, p2.y, fase) + ny * onda;

        ctx.globalAlpha = 0.85 * intensidad;
        image(spriteMarca, bx, by, 9, 9);
    }
}

function dibujarRitualNodosLoader(ctx, esMobile, punteroX, punteroY) {
    const { nodos } = obtenerNodosSello(esMobile);
    const { r, g, b } = CONFIG.COLOR_MARCA;
    const tiempo = frameCount * 0.02;

    ctx.save();

    if (nodosEncendidos.length > 1) {
        for (let i = 0; i < nodosEncendidos.length - 1; i++) {
            const nA = nodos[nodosEncendidos[i]];
            const nB = nodos[nodosEncendidos[i + 1]];
            dibujarFilamentoOrganico(ctx, nA, nB, tiempo, 1);
        }
        if (ritualCompletado) {
            const nUltimo = nodos[nodosEncendidos[nodosEncendidos.length - 1]];
            const nPrimero = nodos[nodosEncendidos[0]];
            dibujarFilamentoOrganico(ctx, nUltimo, nPrimero, tiempo, 1);
        }
    }

    if (trazandoLoader && nodosEncendidos.length > 0 && !ritualCompletado) {
        const ultimoNodo = nodos[nodosEncendidos[nodosEncendidos.length - 1]];
        dibujarFilamentoOrganico(ctx, ultimoNodo, { x: punteroX, y: punteroY }, tiempo, 0.75);
    }

    for (let i = 0; i < nodos.length; i++) {
        const nodo = nodos[i];
        const activo = nodosEncendidos.includes(nodo.id);
        const cantidadEmision = activo ? 2 : 1;

        for (let e = 0; e < cantidadEmision; e++) {
            if (activo || random() < 0.65) {
                emitirChispaLoader(
                    nodo.x,
                    nodo.y,
                    random(-0.55, 0.55),
                    random(-1.8, -0.5) * (activo ? 1.35 : 0.85),
                    activo ? random(5.5, 11) : random(3.5, 7.5),
                    activo ? random(0.022, 0.038) : random(0.03, 0.05)
                );
            }
        }

        const pulso = sin(frameCount * 0.07 + i) * 3;
        const radioNucleo = (activo ? 24 : 15) + pulso;
        const grad = ctx.createRadialGradient(nodo.x, nodo.y, 1, nodo.x, nodo.y, radioNucleo);
        grad.addColorStop(0, activo ? 'rgba(255, 220, 195, 0.8)' : `rgba(${r}, ${g}, ${b}, 0.55)`);
        grad.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, ${activo ? 0.28 : 0.14})`);
        grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(nodo.x, nodo.y, radioNucleo, 0, TWO_PI);
        ctx.fill();
    }

    for (let i = chispasLoader.length - 1; i >= 0; i--) {
        const c = chispasLoader[i];
        c.vida -= c.desgaste;
        if (c.vida <= 0) {
            chispasLoader.splice(i, 1);
            continue;
        }

        const turb = (noise(c.x * 0.02, c.y * 0.02, tiempo + c.seed) - 0.5) * 0.45;
        c.vx += turb * 0.25;
        c.x += c.vx;
        c.y += c.vy;

        ctx.globalAlpha = sin(c.vida * PI) * 0.9;
        const tamActual = c.tam * (0.45 + c.vida * 0.65);
        image(spriteMarca, c.x, c.y, tamActual, tamActual);
    }

    ctx.restore();
}

function configurarRitualEntrada() {
    const velo = document.getElementById('loader-overlay');
    if (!velo) return;

    const liberarWeb = () => {
        if (estado !== 'LOADER') return;
        estado = 'PERFIL';
        trazandoLoader = false;
        chispasLoader = [];

        for (const p of particulas) {
            p.vx += random(-3.5, 3.5);
            p.vy += random(-4.0, 1.8);
        }

        velo.classList.add('oculto');
        if (canvasGlobal) {
            canvasGlobal.style('z-index', '910');
        }

        setTimeout(() => {
            if (contenedorSnap) contenedorSnap.style.overflowY = 'scroll';
        }, 650);
    };

    const evaluarConexionNodos = (x, y) => {
        if (ritualCompletado) return;

        const esMobile = window.innerWidth <= CONFIG.BREAKPOINT_MOBILE;
        const { nodos } = obtenerNodosSello(esMobile);
        const radioCaptura = esMobile ? 46 : 42;

        for (let k = 0; k < 2; k++) {
            emitirChispaLoader(
                x,
                y,
                random(-1.1, 1.1),
                random(-1.4, 0.4),
                random(4.5, 9),
                random(0.03, 0.055)
            );
        }

        for (const nodo of nodos) {
            const dist = Math.hypot(x - nodo.x, y - nodo.y);
            if (dist <= radioCaptura) {
                if (!nodosEncendidos.includes(nodo.id)) {
                    nodosEncendidos.push(nodo.id);
                    for (let b = 0; b < 14; b++) {
                        const ang = random(TWO_PI);
                        const vel = random(1.2, 3.8);
                        emitirChispaLoader(nodo.x, nodo.y, cos(ang) * vel, sin(ang) * vel, random(6, 11), 0.025);
                    }
                } else if (
                    nodosEncendidos.length === 3 &&
                    nodo.id === nodosEncendidos[0]
                ) {
                    ritualCompletado = true;
                    trazandoLoader = false;
                    for (let b = 0; b < 24; b++) {
                        const ang = random(TWO_PI);
                        const vel = random(1.5, 4.5);
                        emitirChispaLoader(nodo.x, nodo.y, cos(ang) * vel, sin(ang) * vel, random(7, 13), 0.02);
                    }
                }
            }
        }
    };

    velo.addEventListener('pointerdown', (e) => {
        if (estado !== 'LOADER' || ritualCompletado) return;
        trazandoLoader = true;
        nodosEncendidos = [];
        velo.setPointerCapture(e.pointerId);
        evaluarConexionNodos(e.clientX, e.clientY);
    });

    velo.addEventListener('pointermove', (e) => {
        if (!trazandoLoader || estado !== 'LOADER' || ritualCompletado) return;
        evaluarConexionNodos(e.clientX, e.clientY);
    });

    const cancelarTrazo = (e) => {
        if (!trazandoLoader) return;
        trazandoLoader = false;
        if (velo.hasPointerCapture(e.pointerId)) {
            velo.releasePointerCapture(e.pointerId);
        }
        if (!ritualCompletado) {
            nodosEncendidos = [];
        }
    };

    velo.addEventListener('pointerup', cancelarTrazo);
    velo.addEventListener('pointercancel', cancelarTrazo);

    window.addEventListener('keydown', (e) => {
        if (estado === 'LOADER' && ['Enter', 'Space', 'Escape'].includes(e.code)) {
            liberarWeb();
        }
    });

    window._liberarWebDesdeRitual = liberarWeb;
}

/* ==========================================================================
   4. INTERACCIÓN DOM (NAVBAR, CARRUSEL, RETRATO Y RELIQUIAS)
   ========================================================================== */

function configurarCierreNavbarMovil() {
    const toggleMenu = document.querySelector('.menu-toggle-input');
    const enlacesMenu = document.querySelectorAll('.menu-navegacion a');
    if (!toggleMenu || !enlacesMenu.length) return;

    enlacesMenu.forEach((enlace) => {
        enlace.addEventListener('click', () => {
            toggleMenu.checked = false;
        });
    });
}

function configurarCambioRetrato() {
    if (!anclaPerfil) return;

    const alternarImagen = () => {
        if (estado !== 'PERFIL') return;
        const siguiente = (indiceRetratoActual + 1) % mapasRetratos.length;
        if (!mapasRetratos[siguiente] || !mapasRetratos[siguiente].length) return;

        indiceRetratoActual = siguiente;
        aplicarMapaRetrato(indiceRetratoActual);

        const rect = anclaPerfil.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;

        for (const p of particulas) {
            if (!p.esEspora) {
                const ang = atan2(p.y - cy, p.x - cx);
                const impulso = random(1.8, 4.5);
                p.vx += cos(ang) * impulso;
                p.vy += sin(ang) * impulso;
            }
        }
    };

    anclaPerfil.addEventListener('click', alternarImagen);
    anclaPerfil.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            alternarImagen();
        }
    });
}

function configurarProfundidadCarrusel() {
    const galeria = document.querySelector('.galeria-proyectos-compartida');
    const contenedorIndicador = document.querySelector('.indicador-carrusel');
    if (!galeria) return;

    const tarjetas = Array.from(galeria.querySelectorAll('.tarjeta-proyecto'));
    if (!tarjetas.length) return;

    let puntos = [];
    if (contenedorIndicador) {
        contenedorIndicador.innerHTML = '';
        puntos = tarjetas.map((_, indice) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'punto-carrusel';
            btn.setAttribute('aria-label', `Ver proyecto ${indice + 1} de ${tarjetas.length}`);
            btn.addEventListener('click', () => {
                tarjetas[indice].scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest',
                    inline: 'center'
                });
            });
            contenedorIndicador.appendChild(btn);
            return btn;
        });
    }

    const actualizarFocoTarjetas = () => {
        if (window.innerWidth > CONFIG.BREAKPOINT_MOBILE) {
            tarjetas.forEach((tarjeta) => {
                tarjeta.style.transform = '';
                tarjeta.style.filter = '';
                tarjeta.style.opacity = '';
                tarjeta.style.pointerEvents = '';
            });
            return;
        }

        const rectGaleria = galeria.getBoundingClientRect();
        const centroGaleria = rectGaleria.left + rectGaleria.width / 2;
        let indiceActivo = 0;
        let menorDistancia = Infinity;

        tarjetas.forEach((tarjeta, indice) => {
            const rectTarjeta = tarjeta.getBoundingClientRect();
            const centroTarjeta = rectTarjeta.left + rectTarjeta.width / 2;
            const distanciaPx = Math.abs(centroGaleria - centroTarjeta);

            if (distanciaPx < menorDistancia) {
                menorDistancia = distanciaPx;
                indiceActivo = indice;
            }

            const distanciaNorm = Math.min(1, distanciaPx / (rectGaleria.width * 0.75));
            const escala = 1 - distanciaNorm * 0.08;
            const brillo = 1 - distanciaNorm * 0.78;
            const desenfoque = distanciaNorm * 3.5;
            const opacidad = 1 - distanciaNorm * 0.55;

            tarjeta.style.transform = `scale(${escala.toFixed(3)})`;
            tarjeta.style.filter = `brightness(${brillo.toFixed(2)}) blur(${desenfoque.toFixed(1)}px)`;
            tarjeta.style.opacity = opacidad.toFixed(2);
            tarjeta.style.pointerEvents = distanciaNorm > 0.45 ? 'none' : 'auto';
        });

        puntos.forEach((punto, indice) => {
            punto.classList.toggle('activo', indice === indiceActivo);
        });
    };

    galeria.addEventListener('scroll', actualizarFocoTarjetas, { passive: true });
    window.addEventListener('resize', actualizarFocoTarjetas);
    actualizarFocoTarjetas();
}

function calcularDistanciaAltar(reliquia) {
    const rAltar = altarInvocacion.getBoundingClientRect();
    const rReliquia = reliquia.getBoundingClientRect();

    const centroAltarX = rAltar.left + rAltar.width / 2;
    const centroAltarY = rAltar.top + rAltar.height / 2;
    const centroReliquiaX = rReliquia.left + rReliquia.width / 2;
    const centroReliquiaY = rReliquia.top + rReliquia.height / 2;

    return {
        distancia: Math.hypot(centroAltarX - centroReliquiaX, centroAltarY - centroReliquiaY),
        centroAltarX,
        centroAltarY
    };
}

function configurarReliquiasRitual() {
    const reliquias = document.querySelectorAll('.reliquia-arrastrable');
    if (!reliquias.length || !altarInvocacion) return;

    reliquias.forEach((reliquia) => {
        let arrastrando = false;
        let inicioX = 0;
        let inicioY = 0;
        let seMovio = false;

        reliquia.addEventListener('dragstart', (e) => e.preventDefault());
        reliquia.addEventListener('click', (e) => e.preventDefault());

        reliquia.addEventListener('pointerdown', (e) => {
            arrastrando = true;
            seMovio = false;
            inicioX = e.clientX;
            inicioY = e.clientY;

            reliquia.style.transition = 'none';
            reliquia.classList.add('arrastrando');
            reliquia.setPointerCapture(e.pointerId);
        });

        reliquia.addEventListener('pointermove', (e) => {
            if (!arrastrando) return;

            const deltaX = e.clientX - inicioX;
            const deltaY = e.clientY - inicioY;
            if (Math.hypot(deltaX, deltaY) > 6) seMovio = true;

            reliquia.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(1.06)`;

            const { distancia } = calcularDistanciaAltar(reliquia);
            if (distancia < CONFIG.RADIO_ALTAR) {
                altarInvocacion.classList.add('activo');
                intensidadRitual = map(distancia, 0, CONFIG.RADIO_ALTAR, 1, 0.25);
            } else {
                altarInvocacion.classList.remove('activo');
                intensidadRitual = 0;
            }
        });

        const soltarReliquia = (e) => {
            if (!arrastrando) return;
            arrastrando = false;

            if (reliquia.hasPointerCapture(e.pointerId)) {
                reliquia.releasePointerCapture(e.pointerId);
            }
            reliquia.classList.remove('arrastrando');

            const { distancia, centroAltarX, centroAltarY } = calcularDistanciaAltar(reliquia);

            if (seMovio && distancia < CONFIG.RADIO_ALTAR) {
                for (const p of particulas) {
                    const ang = atan2(p.y - centroAltarY, p.x - centroAltarX);
                    const impulso = random(4, 11);
                    p.vx += cos(ang) * impulso;
                    p.vy += sin(ang) * impulso;
                }

                const urlDestino = reliquia.getAttribute('href');
                const esNuevaPestana = reliquia.getAttribute('target') === '_blank';

                setTimeout(() => {
                    if (esNuevaPestana) {
                        window.open(urlDestino, '_blank', 'noopener,noreferrer');
                    } else {
                        window.location.href = urlDestino;
                    }
                }, 320);
            }

            altarInvocacion.classList.remove('activo');
            intensidadRitual = 0;
            reliquia.style.transition = 'transform 0.55s cubic-bezier(0.22, 1, 0.36, 1)';
            reliquia.style.transform = 'translate(0px, 0px) scale(1)';
        };

        reliquia.addEventListener('pointerup', soltarReliquia);
        reliquia.addEventListener('pointercancel', soltarReliquia);
    });
}

/* ==========================================================================
   5. BUCLE PRINCIPAL DE RENDERIZADO
   ========================================================================== */

function draw() {
    clear();
    if (!anclaPerfil || particulas.length === 0) return;

    const esMobile = window.innerWidth <= CONFIG.BREAKPOINT_MOBILE;
    const rectAncla = anclaPerfil.getBoundingClientRect();
    const rectContacto = seccionContacto ? seccionContacto.getBoundingClientRect() : null;
    const tiempo = frameCount * 0.014;
    const ctx = drawingContext;

    const punteroX = touches.length > 0 ? touches[0].x : mouseX;
    const punteroY = touches.length > 0 ? touches[0].y : mouseY;

    if (estado === 'LOADER') {
        if (ritualCompletado) {
            progresoSelloFinal = min(1, progresoSelloFinal + 0.011);
            if (progresoSelloFinal >= 1 && typeof window._liberarWebDesdeRitual === 'function') {
                window._liberarWebDesdeRitual();
            }
        }
        dibujarRitualNodosLoader(ctx, esMobile, punteroX, punteroY);
    } else {
        if (rectContacto && rectContacto.top < height * 0.55) {
            estado = 'RITUAL';
        } else if (rectAncla.bottom > 40) {
            estado = 'PERFIL';
        } else {
            estado = 'FLUJO';
        }
    }

    const velMouseX = constrain(punteroX - prevMouseX, -30, 30);
    const velMouseY = constrain(punteroY - prevMouseY, -30, 30);
    const mouseEnMovimiento = abs(velMouseX) + abs(velMouseY) > 0.5;

    prevMouseX = punteroX;
    prevMouseY = punteroY;
    anguloAcumuladoRitual += 0.003 + intensidadRitual * 0.028;

    let centroSelloX = width / 2;
    let centroSelloY = height / 2;

    if (altarInvocacion && estado === 'RITUAL') {
        const rAltar = altarInvocacion.getBoundingClientRect();
        if (rAltar.width > 0) {
            centroSelloX = rAltar.left + rAltar.width / 2;
            centroSelloY = rAltar.top + rAltar.height / 2;
        }
    }

    for (let i = 0; i < particulas.length; i++) {
        particulas[i].update(
            rectAncla,
            tiempo,
            anguloAcumuladoRitual,
            centroSelloX,
            centroSelloY,
            punteroX,
            punteroY,
            velMouseX,
            velMouseY,
            mouseEnMovimiento
        );
        particulas[i].show(ctx);
    }

    ctx.globalAlpha = 1;
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}

/* ==========================================================================
   6. CLASE PARTÍCULA
   ========================================================================== */

class Particula {
    constructor(textoX, textoY, imgOffsetX, imgOffsetY, ritualX, ritualY, esMobile, esEspora, luz = 0.7) {
        this.textoX = textoX;
        this.textoY = textoY;
        this.imgOffsetX = imgOffsetX;
        this.imgOffsetY = imgOffsetY;
        this.ritualX = ritualX;
        this.ritualY = ritualY;
        this.esEspora = esEspora;
        this.luz = luz;

        const anguloEspora = random(TWO_PI);
        const factorDistancia = pow(random(), 0.75);
        this.esporaX = width / 2 + cos(anguloEspora) * (factorDistancia * width * 0.48);
        this.esporaY = height / 2 + sin(anguloEspora) * (factorDistancia * height * 0.46);

        const anguloInicio = random(TWO_PI);
        const radioInicio = random(50, max(width, height) * 0.6);
        this.x = width / 2 + cos(anguloInicio) * radioInicio;
        this.y = height / 2 + sin(anguloInicio) * radioInicio;

        this.vx = 0;
        this.vy = 0;
        this.rigidez = random(0.025, 0.055);
        this.friccion = random(0.70, 0.78);

        this.tamanoTexto = esMobile ? random(4.5, 8) : random(4, 7.5);
        this.tamanoPerfil = map(this.luz, 0, 1, 1.6, 3.4);
        this.tamanoFlujo = esMobile ? random(3, 6) : random(2.5, 5.5);

        this.vida = random(0, 1);
        this.velDesgaste = random(0.012, 0.028);
        this.noiseOffset = random(1000);
    }

    asignarDestinoImagen(imgOffsetX, imgOffsetY, luz) {
        this.imgOffsetX = imgOffsetX;
        this.imgOffsetY = imgOffsetY;
        this.luz = luz;
        this.tamanoPerfil = map(this.luz, 0, 1, 1.6, 3.4);
    }

    renacerEnCursor(punteroX, punteroY, velMouseX, velMouseY) {
        const ang = random(TWO_PI);
        const rad = random(0, 10);
        this.x = punteroX + cos(ang) * rad;
        this.y = punteroY + sin(ang) * rad;

        this.vx = velMouseX * random(0.08, 0.25) + cos(ang) * random(0.3, 1.4);
        this.vy = velMouseY * random(0.08, 0.25) + sin(ang) * random(0.3, 1.4) - random(0.2, 0.8);
        this.vida = 1.0;
    }

    update(rectAncla, tiempo, anguloRitual, centroSelloX, centroSelloY, punteroX, punteroY, velMouseX, velMouseY, mouseEnMovimiento) {
        const esModoHumo = estado === 'FLUJO' || (estado === 'PERFIL' && this.esEspora);

        if (esModoHumo) {
            this.vida -= this.velDesgaste;

            if (this.vida <= 0) {
                if (mouseEnMovimiento && (punteroX > 0 || punteroY > 0)) {
                    this.renacerEnCursor(punteroX, punteroY, velMouseX, velMouseY);
                } else {
                    this.vida = 0;
                    return;
                }
            }

            const anguloTurbulencia = noise(this.x * 0.008, this.y * 0.008, tiempo * 0.6) * TWO_PI * 2.5;
            this.vx = (this.vx + cos(anguloTurbulencia) * 0.14) * 0.92;
            this.vy = (this.vy + sin(anguloTurbulencia) * 0.14 - 0.04) * 0.92;

            this.x += this.vx;
            this.y += this.vy;
            return;
        }

        if (this.vida < 1) {
            this.vida = min(1, this.vida + 0.06);
        }

        let objetivoX, objetivoY;

        if (estado === 'LOADER') {
            if (this.esEspora) {
                if (ritualCompletado) {
                    const cosA = cos(anguloRitual * 0.4);
                    const sinA = sin(anguloRitual * 0.4);
                    objetivoX = width / 2 + (this.ritualX * cosA - this.ritualY * sinA);
                    objetivoY = height / 2 + (this.ritualX * sinA + this.ritualY * cosA);
                } else {
                    objetivoX = this.esporaX;
                    objetivoY = this.esporaY;
                }
            } else {
                objetivoX = this.textoX;
                objetivoY = this.textoY;
            }
        } else if (estado === 'PERFIL') {
            objetivoX = rectAncla.left + this.imgOffsetX;
            objetivoY = rectAncla.top + this.imgOffsetY;
        } else if (estado === 'RITUAL') {
            const escalaSello = 1 - intensidadRitual * 0.14;
            const cosA = cos(anguloRitual);
            const sinA = sin(anguloRitual);
            objetivoX = centroSelloX + (this.ritualX * cosA - this.ritualY * sinA) * escalaSello;
            objetivoY = centroSelloY + (this.ritualX * sinA + this.ritualY * cosA) * escalaSello;
        }

        let amplitudDeriva = 1.1;
        if (estado === 'LOADER') {
            if (this.esEspora) {
                amplitudDeriva = ritualCompletado ? 1.5 : 35;
            } else {
                amplitudDeriva = 0.7;
            }
        } else if (estado === 'PERFIL' && !this.esEspora) {
            amplitudDeriva = 0.25;
        } else if (estado === 'RITUAL') {
            amplitudDeriva = 1.4 + intensidadRitual * 2.5;
        }

        const n = noise(this.noiseOffset + tiempo);
        objetivoX += (n - 0.5) * 2 * amplitudDeriva;
        objetivoY += ((1 - n) - 0.5) * 2 * amplitudDeriva;

        const radioRepulsion = estado === 'LOADER' ? 75 : 60;
        const dx = this.x - punteroX;
        const dy = this.y - punteroY;
        const distSq = dx * dx + dy * dy;

        if (distSq < radioRepulsion * radioRepulsion && distSq > 0.01) {
            const d = Math.sqrt(distSq);
            const fuerza = (1 - d / radioRepulsion) * 2.2;
            this.vx += (dx / d) * fuerza;
            this.vy += (dy / d) * fuerza;
        }

        const multRigidez =
            estado === 'RITUAL' || (estado === 'LOADER' && ritualCompletado && this.esEspora)
                ? 0.85 + intensidadRitual * 0.5
                : 0.9;

        this.vx = (this.vx + (objetivoX - this.x) * (this.rigidez * multRigidez)) * this.friccion;
        this.vy = (this.vy + (objetivoY - this.y) * (this.rigidez * multRigidez)) * this.friccion;

        this.x += this.vx;
        this.y += this.vy;
    }

    show(ctx) {
        const esModoHumo = estado === 'FLUJO' || (estado === 'PERFIL' && this.esEspora);
        if (esModoHumo && this.vida <= 0.02) return;

        let tam;
        if (estado === 'LOADER') {
            tam = this.esEspora && ritualCompletado ? this.tamanoFlujo : this.tamanoTexto;
        } else if (estado === 'PERFIL' && !this.esEspora) {
            tam = this.tamanoPerfil;
        } else if (estado === 'RITUAL') {
            tam = this.tamanoFlujo * (1 + intensidadRitual * 0.35);
        } else {
            tam = this.tamanoFlujo * (0.4 + this.vida * 0.8);
        }

        const velSq = this.vx * this.vx + this.vy * this.vy;
        ctx.globalAlpha = esModoHumo ? sin(this.vida * PI) * 0.85 : this.vida;

        if (velSq > 1.5) {
            const vel = Math.sqrt(velSq);
            const angulo = Math.atan2(this.vy, this.vx);
            const estiramiento = min(vel * 0.42, 3.2);

            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(angulo);
            image(spriteMarca, 0, 0, tam * (1 + estiramiento), tam * 0.85);
            ctx.restore();
        } else {
            image(spriteMarca, this.x, this.y, tam, tam);
        }
    }
}
