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
let spriteCanvas;
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
let ultimoModoMobile = null;

/* ==========================================================================
   2. INICIALIZACIÓN Y MUESTREO DE PARTÍCULAS
   ========================================================================== */

function crearSpriteMarca() {
    const { r, g, b } = CONFIG.COLOR_MARCA;
    const pg = createGraphics(64, 64);
    pg.pixelDensity(1);
    const ctx = pg.drawingContext;
    const grad = ctx.createRadialGradient(24, 24, 0, 24, 24, 24);

    grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.95)`);
    grad.addColorStop(0.32, `rgba(${r}, ${g}, ${b}, 0.45)`);
    grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 48, 48);
    spriteMarca = pg;
    spriteCanvas = pg.canvas;
}

function muestrearPuntosTexto(esMobile, objetivo) {
    const pg = createGraphics(width, height);
    pg.pixelDensity(1);
    pg.background(0);
    pg.fill(255);
    pg.textFont('Georgia, Times New Roman, serif');
    pg.textAlign(CENTER, CENTER);
    pg.textStyle(BOLD);
    pg.textSize(esMobile ? constrain(width * 0.145, 34, 48) : 86);
    pg.text('KEVIN D.D', width / 2, height / 2);
    pg.loadPixels();

    const cajaAncho = esMobile ? width * 0.96 : 740;
    const cajaAlto = esMobile ? 150 : 220;
    const minX = max(0, floor(width / 2 - cajaAncho / 2));
    const maxX = min(width, floor(width / 2 + cajaAncho / 2));
    const minY = max(0, floor(height / 2 - cajaAlto / 2));
    const maxY = min(height, floor(height / 2 + cajaAlto / 2));

    const puntos = [];
    let intentos = 0;

    while (puntos.length < objetivo && intentos < 50000) {
        intentos++;
        const rx = floor(random(minX, maxX));
        const ry = floor(random(minY, maxY));
        const idx = (rx + ry * width) * 4;

        if (pg.pixels[idx] > 90) {
            puntos.push({
                x: rx + random(-0.15, 0.15),
                y: ry + random(-0.15, 0.15)
            });
        }
    }

    pg.remove();

    if (puntos.length === 0) {
        for (let i = 0; i < 400; i++) {
            puntos.push({
                x: width / 2 + random(-140, 140),
                y: height / 2 + random(-28, 28)
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
            const pg = createGraphics(anchoImg, altoImg);
            pg.pixelDensity(1);
            pg.clear();
            pg.image(img, 0, 0, anchoImg, altoImg);
            pg.loadPixels();

            const densidad = 2;
            const puntos = [];

            for (let y = 0; y < altoImg; y += densidad) {
                for (let x = 0; x < anchoImg; x += densidad) {
                    const idx = (x + y * anchoImg) * 4;
                    const r = pg.pixels[idx];
                    const g = pg.pixels[idx + 1];
                    const b = pg.pixels[idx + 2];
                    const a = pg.pixels[idx + 3];

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

            pg.remove();

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
    const esMobile = window.innerWidth <= CONFIG.BREAKPOINT_MOBILE;
    pixelDensity(esMobile ? 1.5 : Math.min(window.devicePixelRatio || 1, 2));

    canvasGlobal = createCanvas(windowWidth, windowHeight);
    canvasGlobal.id('canvas-global-particulas');
    canvasGlobal.style('background', 'transparent');

    crearSpriteMarca();

    anclaPerfil = document.getElementById('contenedor-particulas-perfil');
    seccionContacto = document.getElementById('contacto');
    altarInvocacion = document.getElementById('altar-invocacion');
    contenedorSnap = document.querySelector('.portada-snap');

    if (contenedorSnap) {
        contenedorSnap.scrollTop = 0;
        contenedorSnap.style.overflowY = 'hidden';
    }

    ultimoModoMobile = esMobile;
    const totalParticulas = esMobile ? 750 : 1550;
    const anchoImg = esMobile ? 210 : 260;
    const altoImg = esMobile ? 275 : 350;

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
    configurarCierreModalEscape();
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
    if (chispasLoader.length > 220) {
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
    const pasos = 24;
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
        ctx.drawImage(spriteCanvas, bx - 4.5, by - 4.5, 9, 9);
    }
}

function dibujarRitualNodosLoader(ctx, esMobile, punteroX, punteroY) {
    const { nodos } = obtenerNodosSello(esMobile);
    const { r, g, b } = CONFIG.COLOR_MARCA;
    const tiempo = frameCount * 0.02;

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

        ctx.globalAlpha = 1;
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
        const mitad = tamActual * 0.5;
        ctx.drawImage(spriteCanvas, c.x - mitad, c.y - mitad, tamActual, tamActual);
    }
}

function configurarRitualEntrada() {
    const velo = document.getElementById('loader-overlay');
    const textoGuia = document.getElementById('loader-texto-guia');
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
            if (contenedorSnap) {
                contenedorSnap.scrollTop = 0;
                contenedorSnap.style.overflowY = 'scroll';
            }
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

    let timerAvisoLoader;
    const cancelarTrazo = (e) => {
        if (!trazandoLoader) return;
        trazandoLoader = false;
        if (velo.hasPointerCapture(e.pointerId)) {
            velo.releasePointerCapture(e.pointerId);
        }
        if (!ritualCompletado) {
            if (nodosEncendidos.length > 0 && textoGuia) {
                textoGuia.textContent = 'Mantené presionado y uní los tres puntos';
                clearTimeout(timerAvisoLoader);
                timerAvisoLoader = setTimeout(() => {
                    textoGuia.textContent = 'Uní las llamas para completar el sello';
                }, 2400);
            }
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
   4. INTERACCIÓN DOM (NAVBAR, MODALES, CARRUSEL, RETRATO Y RELIQUIAS)
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

function configurarCierreModalEscape() {
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && window.location.hash.startsWith('#modal-')) {
            const modalActivo = document.querySelector(window.location.hash);
            const enlaceCierre = modalActivo ? modalActivo.querySelector('.modal-cerrar') : null;
            if (enlaceCierre) {
                enlaceCierre.click();
            }
        }
    });
}

function configurarCambioRetrato() {
    if (!anclaPerfil) return;

    const carruselMovil = document.getElementById('carrusel-retrato-movil');
    const puntosRetrato = document.querySelectorAll('.punto-retrato');

    const activarRetrato = (nuevoIndice, conImpulso = true) => {
        if (nuevoIndice === indiceRetratoActual) return;
        if (!mapasRetratos[nuevoIndice] || !mapasRetratos[nuevoIndice].length) return;

        indiceRetratoActual = nuevoIndice;
        aplicarMapaRetrato(indiceRetratoActual);

        puntosRetrato.forEach((btn, idx) => {
            btn.classList.toggle('activo', idx === indiceRetratoActual);
        });

        if (conImpulso) {
            const rect = anclaPerfil.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;

            for (const p of particulas) {
                if (!p.esEspora) {
                    const ang = atan2(p.y - cy, p.x - cx);
                    const impulso = random(1.6, 4.0);
                    p.vx += cos(ang) * impulso;
                    p.vy += sin(ang) * impulso;
                }
            }
        }
    };

    // Escritorio: clic alterna retrato
    anclaPerfil.addEventListener('click', () => {
        if (estado !== 'PERFIL' || window.innerWidth <= CONFIG.BREAKPOINT_MOBILE) return;
        const siguiente = (indiceRetratoActual + 1) % mapasRetratos.length;
        activarRetrato(siguiente, true);
    });

    // Móvil: carrusel lateral por deslizamiento limpio
    if (carruselMovil) {
        let timeoutScroll;
        carruselMovil.addEventListener('scroll', () => {
            if (window.innerWidth > CONFIG.BREAKPOINT_MOBILE) return;

            clearTimeout(timeoutScroll);
            timeoutScroll = setTimeout(() => {
                const anchoSlide = carruselMovil.clientWidth || 1;
                const indiceSlide = Math.round(carruselMovil.scrollLeft / anchoSlide);
                const indiceRestringido = constrain(indiceSlide, 0, mapasRetratos.length - 1);
                activarRetrato(indiceRestringido, true);
            }, 50);
        }, { passive: true });

        puntosRetrato.forEach((btn) => {
            btn.addEventListener('click', () => {
                const idx = Number(btn.dataset.indice) || 0;
                carruselMovil.scrollTo({
                    left: idx * carruselMovil.clientWidth,
                    behavior: 'smooth'
                });
            });
        });
    }
}

function configurarProfundidadCarrusel() {
    const galeria = document.querySelector('.galeria-proyectos-compartida');
    const contenedorIndicador = document.querySelector('.indicador-carrusel');
    if (!galeria) return;

    const tarjetas = Array.from(galeria.querySelectorAll('.tarjeta-proyecto'));
    if (!tarjetas.length) return;

    const total = tarjetas.length;
    let indiceActual = 0;

    let puntos = [];
    const mostrarTarjeta = (indice) => {
        indiceActual = (indice + total) % total;
        tarjetas.forEach((tarjeta, i) => {
            tarjeta.classList.toggle('activo', i === indiceActual);
        });
        if (puntos.length) {
            puntos.forEach((punto, i) => {
                punto.classList.toggle('activo', i === indiceActual);
            });
        }
    };

    if (contenedorIndicador) {
        contenedorIndicador.innerHTML = '';
        puntos = tarjetas.map((_, indice) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'punto-carrusel';
            btn.setAttribute('aria-label', `Ver proyecto ${indice + 1} de ${total}`);
            if (indice === 0) btn.classList.add('activo');
            btn.addEventListener('click', () => {
                mostrarTarjeta(indice);
            });
            contenedorIndicador.appendChild(btn);
            return btn;
        });
    }

    // Soporte para deslizar (swipe) en móvil sin scroll libre
    let touchInicioX = 0;
    let touchInicioY = 0;

    galeria.addEventListener('touchstart', (e) => {
        if (window.innerWidth > CONFIG.BREAKPOINT_MOBILE) return;
        touchInicioX = e.touches[0].clientX;
        touchInicioY = e.touches[0].clientY;
    }, { passive: true });

    galeria.addEventListener('touchend', (e) => {
        if (window.innerWidth > CONFIG.BREAKPOINT_MOBILE) return;
        const deltaX = e.changedTouches[0].clientX - touchInicioX;
        const deltaY = e.changedTouches[0].clientY - touchInicioY;

        if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY)) {
            if (deltaX < 0) {
                mostrarTarjeta(indiceActual + 1);
            } else {
                mostrarTarjeta(indiceActual - 1);
            }
        }
    }, { passive: true });

    mostrarTarjeta(0);
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

function ejecutarAccionReliquia(reliquia, centroAltarX, centroAltarY) {
    for (const p of particulas) {
        const ang = atan2(p.y - centroAltarY, p.x - centroAltarX);
        const impulso = random(4, 11);
        p.vx += cos(ang) * impulso;
        p.vy += sin(ang) * impulso;
    }

    const urlDestino = reliquia.getAttribute('href');
    const esNuevaPestana = reliquia.getAttribute('target') === '_blank';
    const esMailto = urlDestino && urlDestino.startsWith('mailto:');

    if (esMailto) {
        const correoLimpio = urlDestino.replace('mailto:', '').split('?')[0];
        if (navigator.clipboard) {
            navigator.clipboard.writeText(correoLimpio).catch(() => {});
        }

        const textoAltar = altarInvocacion.querySelector('.altar-texto');
        if (textoAltar) {
            const textoOriginal = textoAltar.textContent;
            textoAltar.textContent = 'CORREO COPIADO';
            setTimeout(() => {
                textoAltar.textContent = textoOriginal;
            }, 2500);
        }

        const asunto = encodeURIComponent('Consulta desde Portfolio');
        const urlGmailWeb = `https://mail.google.com/mail/?view=cm&fs=1&to=${correoLimpio}&su=${asunto}`;
        const esMobile = window.innerWidth <= CONFIG.BREAKPOINT_MOBILE;

        if (esMobile) {
            const enlaceTemp = document.createElement('a');
            enlaceTemp.href = urlDestino;
            enlaceTemp.style.display = 'none';
            document.body.appendChild(enlaceTemp);
            enlaceTemp.click();
            enlaceTemp.remove();

            let appAbierta = false;
            const marcarSalida = () => { appAbierta = true; };
            window.addEventListener('blur', marcarSalida, { once: true });
            document.addEventListener('visibilitychange', marcarSalida, { once: true });

            setTimeout(() => {
                window.removeEventListener('blur', marcarSalida);
                document.removeEventListener('visibilitychange', marcarSalida);
                if (!appAbierta) {
                    window.open(urlGmailWeb, '_blank', 'noopener,noreferrer');
                }
            }, 600);
        } else {
            window.open(urlGmailWeb, '_blank', 'noopener,noreferrer');
        }
    } else {
        setTimeout(() => {
            if (esNuevaPestana) {
                window.open(urlDestino, '_blank', 'noopener,noreferrer');
            } else {
                window.location.href = urlDestino;
            }
        }, 320);
    }
}

function configurarReliquiasRitual() {
    const reliquias = document.querySelectorAll('.reliquia-arrastrable');
    if (!reliquias.length || !altarInvocacion) return;

    reliquias.forEach((reliquia) => {
        let arrastrando = false;
        let inicioX = 0;
        let inicioY = 0;
        let currentX = 0;
        let currentY = 0;
        let targetX = 0;
        let targetY = 0;
        let seMovio = false;
        let animandoId = null;

        reliquia.addEventListener('dragstart', (e) => e.preventDefault());
        reliquia.addEventListener('click', (e) => e.preventDefault());

        const actualizarFisicaArrastre = () => {
            if (!arrastrando) return;
            // Interpolación lineal suave (lerp) para eliminar tirones
            currentX += (targetX - currentX) * 0.28;
            currentY += (targetY - currentY) * 0.28;

            reliquia.style.transform = `translate(${currentX}px, ${currentY}px) scale(1.05)`;

            const { distancia } = calcularDistanciaAltar(reliquia);
            const radioMagnetico = CONFIG.RADIO_ALTAR * 1.5;

            if (distancia < radioMagnetico) {
                altarInvocacion.classList.add('activo');
                intensidadRitual = map(distancia, 0, radioMagnetico, 1, 0.2);
            } else {
                altarInvocacion.classList.remove('activo');
                intensidadRitual = 0;
            }

            animandoId = requestAnimationFrame(actualizarFisicaArrastre);
        };

        reliquia.addEventListener('pointerdown', (e) => {
            arrastrando = true;
            seMovio = false;
            inicioX = e.clientX;
            inicioY = e.clientY;
            targetX = 0;
            targetY = 0;
            currentX = 0;
            currentY = 0;

            reliquia.style.transition = 'none';
            reliquia.classList.add('arrastrando');
            reliquia.setPointerCapture(e.pointerId);

            cancelAnimationFrame(animandoId);
            animandoId = requestAnimationFrame(actualizarFisicaArrastre);
        });

        reliquia.addEventListener('pointermove', (e) => {
            if (!arrastrando) return;

            const deltaX = e.clientX - inicioX;
            const deltaY = e.clientY - inicioY;
            if (Math.hypot(deltaX, deltaY) > 5) seMovio = true;

            targetX = deltaX;
            targetY = deltaY;
        });

        const soltarReliquia = (e) => {
            if (!arrastrando) return;
            arrastrando = false;
            cancelAnimationFrame(animandoId);

            if (reliquia.hasPointerCapture(e.pointerId)) {
                reliquia.releasePointerCapture(e.pointerId);
            }
            reliquia.classList.remove('arrastrando');

            const { distancia, centroAltarX, centroAltarY } = calcularDistanciaAltar(reliquia);

            // Si hizo tap/clic rápido sin arrastrar mucho, vuela directo al altar
            if (!seMovio) {
                const rAltar = altarInvocacion.getBoundingClientRect();
                const rReliquia = reliquia.getBoundingClientRect();
                const dx = (rAltar.left + rAltar.width / 2) - (rReliquia.left + rReliquia.width / 2);
                const dy = (rAltar.top + rAltar.height / 2) - (rReliquia.top + rReliquia.height / 2);

                altarInvocacion.classList.add('activo');
                intensidadRitual = 1;
                reliquia.style.transition = 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)';
                reliquia.style.transform = `translate(${dx}px, ${dy}px) scale(0.9)`;

                setTimeout(() => {
                    ejecutarAccionReliquia(reliquia, centroAltarX, centroAltarY);
                    altarInvocacion.classList.remove('activo');
                    intensidadRitual = 0;
                    reliquia.style.transform = '';
                }, 350);
                return;
            }

            if (distancia < CONFIG.RADIO_ALTAR) {
                // Efecto imán de succión al soltar cerca del altar
                const rAltar = altarInvocacion.getBoundingClientRect();
                const rRel = reliquia.getBoundingClientRect();
                const succionX = currentX + ((rAltar.left + rAltar.width / 2) - (rRel.left + rRel.width / 2));
                const succionY = currentY + ((rAltar.top + rAltar.height / 2) - (rRel.top + rRel.height / 2));

                reliquia.style.transition = 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)';
                reliquia.style.transform = `translate(${succionX}px, ${succionY}px) scale(0.85)`;

                setTimeout(() => {
                    ejecutarAccionReliquia(reliquia, centroAltarX, centroAltarY);
                    altarInvocacion.classList.remove('activo');
                    intensidadRitual = 0;
                    reliquia.style.transform = '';
                }, 250);
            } else {
                // Retorno elástico al lugar si lo soltó lejos
                altarInvocacion.classList.remove('activo');
                intensidadRitual = 0;
                reliquia.style.transition = 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)';
                reliquia.style.transform = 'translate(0px, 0px) scale(1)';
            }
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

    const hayToqueActivo = touches.length > 0;
    const punteroActivo = esMobile ? hayToqueActivo : (mouseX > 0 || mouseY > 0);
    const punteroX = hayToqueActivo ? touches[0].x : (esMobile ? -9999 : mouseX);
    const punteroY = hayToqueActivo ? touches[0].y : (esMobile ? -9999 : mouseY);

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

    if (esMobile && estado === 'FLUJO') {
        return;
    }

    const velMouseX = punteroActivo ? constrain(punteroX - prevMouseX, -30, 30) : 0;
    const velMouseY = punteroActivo ? constrain(punteroY - prevMouseY, -30, 30) : 0;
    const mouseEnMovimiento = punteroActivo && (abs(velMouseX) + abs(velMouseY) > 0.5);

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
            mouseEnMovimiento,
            punteroActivo
        );
        particulas[i].show(ctx);
    }

    ctx.globalAlpha = 1;
}

function windowResized() {
    const esMobile = window.innerWidth <= CONFIG.BREAKPOINT_MOBILE;
    pixelDensity(esMobile ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    resizeCanvas(windowWidth, windowHeight);

    const nuevosPuntosTexto = muestrearPuntosTexto(esMobile, particulas.length);
    const nuevosPuntosRitual = generarPuntosRitual(particulas.length, esMobile);

    for (let i = 0; i < particulas.length; i++) {
        const ptTexto = nuevosPuntosTexto[i % nuevosPuntosTexto.length];
        const ptRitual = nuevosPuntosRitual[i];
        particulas[i].textoX = ptTexto.x;
        particulas[i].textoY = ptTexto.y;
        particulas[i].ritualX = ptRitual.x;
        particulas[i].ritualY = ptRitual.y;
        particulas[i].recalcularEspora();
    }

    if (ultimoModoMobile !== esMobile) {
        ultimoModoMobile = esMobile;
        const anchoImg = esMobile ? 210 : 260;
        const altoImg = esMobile ? 275 : 350;
        cargarPuntosRetratos(anchoImg, altoImg);
    }
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
        this.esSello = random() < 0.45;
        this.luz = luz;

        this.recalcularEspora();

        const anguloInicio = random(TWO_PI);
        const radioInicio = random(50, max(width, height) * 0.6);
        this.x = width / 2 + cos(anguloInicio) * radioInicio;
        this.y = height / 2 + sin(anguloInicio) * radioInicio;

        this.vx = 0;
        this.vy = 0;
        this.rigidez = random(0.025, 0.055);
        this.friccion = random(0.70, 0.78);

        this.tamanoTexto = esMobile ? random(4.2, 6.8) : random(5, 8.5);
        this.tamanoPerfil = map(this.luz, 0, 1, esMobile ? 2.1 : 1.6, esMobile ? 4.2 : 3.4);
        this.tamanoFlujo = esMobile ? random(3, 6) : random(2.5, 5.5);

        this.vida = random(0, 1);
        this.velDesgaste = random(0.012, 0.028);
        this.noiseOffset = random(1000);
    }

    recalcularEspora() {
        const anguloEspora = random(TWO_PI);
        const factorDistancia = pow(random(), 0.75);
        this.esporaX = width / 2 + cos(anguloEspora) * (factorDistancia * width * 0.48);
        this.esporaY = height / 2 + sin(anguloEspora) * (factorDistancia * height * 0.46);
    }

    asignarDestinoImagen(imgOffsetX, imgOffsetY, luz) {
        this.imgOffsetX = imgOffsetX;
        this.imgOffsetY = imgOffsetY;
        this.luz = luz;
        const esMobile = window.innerWidth <= CONFIG.BREAKPOINT_MOBILE;
        this.tamanoPerfil = map(this.luz, 0, 1, esMobile ? 2.1 : 1.6, esMobile ? 4.2 : 3.4);
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

    update(rectAncla, tiempo, anguloRitual, centroSelloX, centroSelloY, punteroX, punteroY, velMouseX, velMouseY, mouseEnMovimiento, punteroActivo) {
        const esModoHumo = estado === 'FLUJO' || (estado === 'PERFIL' && this.esEspora);

        if (esModoHumo) {
            this.vida -= this.velDesgaste;

            if (this.vida <= 0) {
                if (mouseEnMovimiento) {
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
            if (this.esSello) {
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
            if (this.esSello) {
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

        if (punteroActivo) {
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
        }

        const multRigidez =
            estado === 'RITUAL' || (estado === 'LOADER' && ritualCompletado && this.esSello)
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
            tam = this.esSello && ritualCompletado ? this.tamanoFlujo : this.tamanoTexto;
        } else if (estado === 'PERFIL' && !this.esEspora) {
            tam = this.tamanoPerfil;
        } else if (estado === 'RITUAL') {
            tam = this.tamanoFlujo * (1 + intensidadRitual * 0.35);
        } else {
            tam = this.tamanoFlujo * (0.4 + this.vida * 0.8);
        }

        ctx.globalAlpha = esModoHumo ? sin(this.vida * PI) * 0.85 : this.vida;
        const mitad = tam * 0.5;
        ctx.drawImage(spriteCanvas, this.x - mitad, this.y - mitad, tam, tam);
    }
}
