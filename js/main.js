const CONFIG = {
    FUENTE_IMAGEN: 'img/yo.png',
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

/* ==========================================================================
   INICIALIZACIÓN Y GENERACIÓN DE PUNTOS
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

function cargarPuntosRetrato(anchoImg, altoImg, esMobile) {
    loadImage(CONFIG.FUENTE_IMAGEN, (img) => {
        const densidad = esMobile ? 3 : 2;
        img.resize(anchoImg, altoImg);
        img.loadPixels();

        let puntos = [];
        for (let y = 0; y < img.height; y += densidad) {
            for (let x = 0; x < img.width; x += densidad) {
                const idx = (x + y * img.width) * 4;
                const r = img.pixels[idx];
                const g = img.pixels[idx + 1];
                const b = img.pixels[idx + 2];
                const a = img.pixels[idx + 3];

                if (a > 120) {
                    const brillo = r * 0.299 + g * 0.587 + b * 0.114;
                    if (brillo > 25 && brillo < 245 && random() < map(brillo, 25, 245, 0.35, 1)) {
                        puntos.push({
                            x: x + random(-0.9, 0.9),
                            y: y + random(-0.9, 0.9),
                            luz: brillo / 255
                        });
                    }
                }
            }
        }

        if (puntos.length > 0) {
            puntos = shuffle(puntos);
            for (let i = 0; i < particulas.length; i++) {
                const pt = puntos[i % puntos.length];
                particulas[i].asignarDestinoImagen(pt.x, pt.y, pt.luz);
            }
        }
    });
}

function setup() {
    pixelDensity(1);

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

    cargarPuntosRetrato(anchoImg, altoImg, esMobile);
    configurarDisparadoresSalida();
    configurarReliquiasRitual();
    configurarCierreNavbarMovil();
}

/* ==========================================================================
   INTERACCIÓN DOM (NAVBAR, LOADER Y RELIQUIAS)
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

        reliquia.addEventListener('click', (e) => {
            if (seMovio) e.preventDefault();
        });

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

            if (distancia < CONFIG.RADIO_ALTAR) {
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

function configurarDisparadoresSalida() {
    const activarTransicion = () => {
        if (estado !== 'LOADER') return;
        estado = 'PERFIL';

        for (const p of particulas) {
            p.vx += random(-2.5, 2.5);
            p.vy += random(-3.2, 1.2);
        }

        const velo = document.getElementById('loader-overlay');
        if (velo) velo.classList.add('oculto');
        if (canvasGlobal) canvasGlobal.style('z-index', '910');

        setTimeout(() => {
            if (contenedorSnap) contenedorSnap.style.overflowY = 'scroll';
        }, 650);

        window.removeEventListener('wheel', activarTransicion);
        window.removeEventListener('touchmove', activarTransicion);
        window.removeEventListener('keydown', manejarTeclado);
    };

    const manejarTeclado = (e) => {
        if (['ArrowDown', 'Space', 'PageDown', 'Enter'].includes(e.code)) {
            activarTransicion();
        }
    };

    window.addEventListener('wheel', activarTransicion, { passive: true });
    window.addEventListener('touchmove', activarTransicion, { passive: true });
    window.addEventListener('keydown', manejarTeclado);
}

/* ==========================================================================
   BUCLE PRINCIPAL DE RENDERIZADO
   ========================================================================== */

function draw() {
    clear();
    if (!anclaPerfil || particulas.length === 0) return;

    const rectAncla = anclaPerfil.getBoundingClientRect();
    const rectContacto = seccionContacto ? seccionContacto.getBoundingClientRect() : null;
    const tiempo = frameCount * 0.014;

    if (estado !== 'LOADER') {
        if (rectContacto && rectContacto.top < height * 0.55) {
            estado = 'RITUAL';
        } else if (rectAncla.bottom > 40) {
            estado = 'PERFIL';
        } else {
            estado = 'FLUJO';
        }
    }

    const punteroX = touches.length > 0 ? touches[0].x : mouseX;
    const punteroY = touches.length > 0 ? touches[0].y : mouseY;
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

    const ctx = drawingContext;
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
   CLASE PARTÍCULA
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
        this.tamanoPerfil = map(this.luz, 0, 1, 2.2, 5.8);
        this.tamanoFlujo = esMobile ? random(3, 6) : random(2.5, 5.5);

        this.vida = random(0, 1);
        this.velDesgaste = random(0.012, 0.028);
        this.noiseOffset = random(1000);
    }

    asignarDestinoImagen(imgOffsetX, imgOffsetY, luz) {
        this.imgOffsetX = imgOffsetX;
        this.imgOffsetY = imgOffsetY;
        this.luz = luz;
        this.tamanoPerfil = map(this.luz, 0, 1, 2.2, 5.8);
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
            objetivoX = this.esEspora ? this.esporaX : this.textoX;
            objetivoY = this.esEspora ? this.esporaY : this.textoY;
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
            amplitudDeriva = this.esEspora ? 35 : 0.7;
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

        const multRigidez = estado === 'RITUAL' ? 0.85 + intensidadRitual * 0.5 : 0.9;
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
            tam = this.tamanoTexto;
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