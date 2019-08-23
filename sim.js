class Particle {
    constructor(species, pos, vel) {
        this.species = species;
        this.pos = pos;
        this.vel = vel;
        this.radius = Math.sqrt((this.species.mass * MASS_AREA_CONVERSION) / Math.PI);
        this.removed = false;
    }

    isColliding(otherParticle) {
        return this.pos.difference(otherParticle.pos).magSq() <= (this.radius + otherParticle.radius) ** 2;
    }

    getKE() {
        return 0.5 * this.species.mass * this.vel.magSq();
    }

}

class Species {
    constructor(name, colour, mass) {
        this.name = name;
        this.colour = colour;
        this.mass = mass;
    }
}

class MechanismStep {
    constructor(reactants, products, eA, deltaH) {
        this.reactants = reactants;
        this.products = products;
        this.eA = eA;
        this.deltaH = deltaH;
    }
}

class Simulation {
    constructor(dimensions, initialConditions, mechanism, gridSize = GRID_SIZE) {
        this.age = 0;
        this.dimensions = dimensions;
        this.gridSize = gridSize;
        this.particleGrid = this.genEmptyGrid();
        this.particleList = [];
        this.mechanism = mechanism;
        this.removedParticles = [];
        this.speciesInvolved = new Set;
        this.compositionHistory = [];
        for (let step of this.mechanism) {
            for (let species of step.reactants) {
                this.speciesInvolved.add(species);
            }
            for (let species of step.products) {
                this.speciesInvolved.add(species);
            }
        }
        for (let s of this.speciesInvolved) {
            this.compositionHistory[s.name] = [0];
        }
        for (let i = 0; i < initialConditions.length; i++) {
            let num = initialConditions[i][1];
            let species = initialConditions[i][0];
            for (let j = 0; j < num; j++) {
                this.addParticle(species);
            }
            this.compositionHistory[species.name][0] = num;
        }
    }

    fixPos(p) {
        if (p.pos.x - p.radius < 0) p.pos.x = p.radius;
        if (p.pos.x + p.radius >= this.dimensions.x) p.pos.x = this.dimensions.x - p.radius;
        if (p.pos.y - p.radius < 0) p.pos.y = p.radius;
        if (p.pos.y + p.radius >= this.dimensions.y) p.pos.y = this.dimensions.y - p.radius;
    }

    addParticle(species,
                pos = new Vector(Math.random() * this.dimensions.x, Math.random() * this.dimensions.y),
                vel = vectorFromAngle(Math.random() * 2 * Math.PI, Math.random() * SPEED)) {
        let p = new Particle(species, pos, vel);
        this.particleList.push(p);
        this.fixPos(p);
        let thisGridX = Math.floor(p.pos.x / this.gridSize);
        let thisGridY = Math.floor(p.pos.y / this.gridSize);
        this.particleGrid[thisGridX][thisGridY].push(p);
    }

    removeParticle(p) {
        p.removed = true;
        this.particleList.splice(this.particleList.indexOf(p), 1);
        this.removedParticles.push(p);
    }

    genEmptyGrid() {
        let numGridsX = Math.ceil(this.dimensions.x / this.gridSize) + 1;
        let numGridsY = Math.ceil(this.dimensions.y / this.gridSize) + 1;
        let emptyGrid = new Array(numGridsX);
        for (let i = 0; i < numGridsX; i++) {
            let row = new Array(numGridsY);
            for (let j = 0; j < numGridsY; j++) {
                row[j] = [];
            }
            emptyGrid[i] = row;
        }
        return emptyGrid;
    }

    tick(amount = 1) {
        for (let n = 0; n < amount; n++) {
            for (let s of this.speciesInvolved) {
                this.compositionHistory[s.name].push(0);
            }
            this.age++;
            let toAdd = [];
            let newGrid = this.genEmptyGrid();
            for (let gridRow of this.particleGrid) {
                for (let gridSquare of gridRow) {
                    for (let i = 0; i < gridSquare.length; i++) {
                        let p = gridSquare[i];
                        if (p.removed) continue;
                        this.compositionHistory[p.species.name][this.age] += 1;
                        p.pos.add(p.vel);
                        if (p.pos.x + p.radius >= this.dimensions.x || p.pos.x - p.radius <= 0) {
                            p.vel.x *= -1;
                        }
                        if (p.pos.y + p.radius >= this.dimensions.y || p.pos.y - p.radius <= 0) {
                            p.vel.y *= -1;
                        }
                        for (let j = i + 1; j < gridSquare.length; j++) {
                            let p2 = gridSquare[j];
                            if (p2.removed) continue;
                            if (p.isColliding(p2)) {
                                let reacted = false;
                                for (let step of this.mechanism) {
                                    if ((step.reactants[0] === p.species && step.reactants[1] === p2.species) ||
                                        (step.reactants[1] === p.species && step.reactants[0] === p2.species)) {
                                        if (p.getKE() + p2.getKE() >= step.eA) {
                                            reacted = true;
                                            this.removeParticle(p);
                                            this.removeParticle(p2);
                                            let totalEnergy = p.getKE() + p2.getKE() - step.deltaH;
                                            let toEach = totalEnergy / step.products.length;
                                            let angle = p.vel.getAngle();
                                            for (let product of step.products) {
                                                let vel = vectorFromAngle(angle, Math.sqrt(2 * toEach / product.mass));
                                                toAdd.push([product, p.pos.sum(vel), vel]);
                                            }
                                        }
                                    }
                                }
                                if (!reacted) {
                                    let deltaX = p.pos.difference(p2.pos);
                                    let deltaV = p.vel.difference(p2.vel);
                                    let m1, m2;
                                    m1 = p.species.mass;
                                    m2 = p2.species.mass;

                                    let deltaXMag = deltaX.mag();
                                    let resolveIntersectionDelta = deltaX.getScaled(((p.radius + p2.radius) - deltaXMag) / deltaXMag);
                                    p.pos.add(resolveIntersectionDelta.getScaled(0.5));
                                    p2.pos.add(resolveIntersectionDelta.getScaled(-0.5));
                                    let deltaV1 = deltaX.getScaled((2 * m2 * dotProduct(deltaV, deltaX)) / ((m1 + m2) * deltaX.magSq()));
                                    deltaX.scale(-1);
                                    deltaV.scale(-1);
                                    let deltaV2 = deltaX.getScaled((2 * m1 * dotProduct(deltaV, deltaX)) / ((m1 + m2) * deltaX.magSq()));
                                    p.vel.subtract(deltaV1);
                                    p2.vel.subtract(deltaV2);
                                }
                            }

                        }
                        this.fixPos(p);
                        if (!p.removed) {
                            let newGridX = Math.floor(p.pos.x / this.gridSize);
                            let newGridY = Math.floor(p.pos.y / this.gridSize);
                            try {
                                newGrid[newGridX][newGridY].push(p);
                            } catch (TypeError) {
                                console.log(p);
                            }
                        }
                    }
                }
            }
            this.particleGrid = newGrid;
            for (let p of toAdd) {
                this.addParticle(p[0], p[1], p[2]);
            }
        }
    }

    getTotalKE() {
        let total = 0;
        for (let p of this.particleList) {
            total += p.getKE();
        }
        return total;
    }

    getComposition() {
        let comp = {};
        for (let species of this.speciesInvolved) {
            comp[species.name] = 0;
        }
        for (let p of this.particleList) {
            comp[p.species.name]++;
        }
        return comp;
    }
}

function makeCounter() {
    let i = 0;
    return function () {
        return i++;
    }
}

let getParticleID = makeCounter();
let frameCount = makeCounter();

let a = new Species("A", "Red", 5);
let b = new Species("B", "Blue", 5);
let c = new Species("C", "Yellow", 15);
let d = new Species("D", "Green", 20);

let e = new MechanismStep([a, b], [c], 5, 0);
let f = new MechanismStep([c, a], [d], 25, 0);

// stats.js - http://github.com/mrdoob/stats.js
(function (f, e) {
    "object" === typeof exports && "undefined" !== typeof module ? module.exports = e() : "function" === typeof define && define.amd ? define(e) : f.Stats = e()
})(this, function () {
    var f = function () {
        function e(a) {
            c.appendChild(a.dom);
            return a
        }

        function u(a) {
            for (var d = 0; d < c.children.length; d++) c.children[d].style.display = d === a ? "block" : "none";
            l = a
        }

        var l = 0, c = document.createElement("div");
        c.style.cssText = "position:fixed;top:0;left:0;cursor:pointer;opacity:0.9;z-index:10000";
        c.addEventListener("click", function (a) {
            a.preventDefault();
            u(++l % c.children.length)
        }, !1);
        var k = (performance || Date).now(), g = k, a = 0, r = e(new f.Panel("FPS", "#0ff", "#002")),
            h = e(new f.Panel("MS", "#0f0", "#020"));
        if (self.performance && self.performance.memory) var t = e(new f.Panel("MB", "#f08", "#201"));
        u(0);
        return {
            REVISION: 16, dom: c, addPanel: e, showPanel: u, begin: function () {
                k = (performance || Date).now()
            }, end: function () {
                a++;
                var c = (performance || Date).now();
                h.update(c - k, 200);
                if (c >= g + 1E3 && (r.update(1E3 * a / (c - g), 100), g = c, a = 0, t)) {
                    var d = performance.memory;
                    t.update(d.usedJSHeapSize /
                        1048576, d.jsHeapSizeLimit / 1048576)
                }
                return c
            }, update: function () {
                k = this.end()
            }, domElement: c, setMode: u
        }
    };
    f.Panel = function (e, f, l) {
        var c = Infinity, k = 0, g = Math.round, a = g(window.devicePixelRatio || 1), r = 80 * a, h = 48 * a, t = 3 * a,
            v = 2 * a, d = 3 * a, m = 15 * a, n = 74 * a, p = 30 * a, q = document.createElement("canvas");
        q.width = r;
        q.height = h;
        q.style.cssText = "width:80px;height:48px";
        var b = q.getContext("2d");
        b.font = "bold " + 9 * a + "px Helvetica,Arial,sans-serif";
        b.textBaseline = "top";
        b.fillStyle = l;
        b.fillRect(0, 0, r, h);
        b.fillStyle = f;
        b.fillText(e, t, v);
        b.fillRect(d, m, n, p);
        b.fillStyle = l;
        b.globalAlpha = .9;
        b.fillRect(d, m, n, p);
        return {
            dom: q, update: function (h, w) {
                c = Math.min(c, h);
                k = Math.max(k, h);
                b.fillStyle = l;
                b.globalAlpha = 1;
                b.fillRect(0, 0, r, m);
                b.fillStyle = f;
                b.fillText(g(h) + " " + e + " (" + g(c) + "-" + g(k) + ")", t, v);
                b.drawImage(q, d + a, m, n - a, p, d, m, n - a, p);
                b.fillRect(d + n - a, m, a, p);
                b.fillStyle = l;
                b.globalAlpha = .9;
                b.fillRect(d + n - a, m, a, g((1 - h / w) * p))
            }
        }
    };
    return f
});

function init() {
    let dimensions = new Vector(window.innerWidth, window.innerHeight);
    let mechanism = [e, f];
    let s = new Simulation(dimensions, INITIAL_COMP, mechanism);
    initGraph("graph", s);
    setTimeout(function () {
        graphics(s, "canvas");
    }, 0);
}

function graphics(sim, canvas, drawGrid = false) {
    let c = document.querySelector(canvas);
    c.width = sim.dimensions.x;
    c.height = sim.dimensions.y;
    let ctx = c.getContext("2d");
    let w = c.width;
    let h = c.height;
    let stats = new Stats();
    stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
    document.body.appendChild(stats.dom);
    draw();


    function draw() {
        stats.begin();
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = BG_COLOUR;
        ctx.fillRect(0, 0, w, h);
        if (drawGrid) {
            ctx.fillStyle = "Black";
            for (let x = 0; x < Math.ceil(sim.dimensions.x / sim.gridSize); x++) {
                ctx.fillRect(x * sim.gridSize, 0, 2, sim.dimensions.y);
            }
            for (let y = 0; y < Math.ceil(sim.dimensions.y / sim.gridSize); y++) {
                ctx.fillRect(0, y * sim.gridSize, sim.dimensions.x, 2);
            }
        }
        for (let p of sim.particleList) {
            ctx.beginPath();
            ctx.arc(p.pos.x, p.pos.y, p.radius, 0, Math.PI * 2);
            ctx.closePath();
            ctx.fillStyle = p.species.colour;
            ctx.fill();
        }
        sim.tick(TICK_RATE);
        stats.end();
        if (sim.age < 3000) {
            window.requestAnimationFrame(draw);
        } else {
            return 0;
        }
    }
}

//CONSTANTS
let MASS_AREA_CONVERSION = 1,
    BG_COLOUR = "#e1e1e1",
    GRID_SIZE = 200,
    FPS = 60,
    SPEED = 3,
    TICK_RATE = 2,
    INITIAL_COMP = [[a, 6000], [b, 6000]];