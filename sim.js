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

function init() {
    let dimensions = new Vector(window.innerWidth, window.innerHeight);
    let mechanism = [e, f];
    let s = new Simulation(dimensions, INITIAL_COMP, mechanism);
    initGraph("graph", s);
    setTimeout(function () {
        graphics(s, "simCanvas");
    }, 0);
}

function graphics(sim, canvas, drawGrid = false) {
    let c = document.getElementById(canvas);
    c.width = window.innerWidth;
    c.height = window.innerHeight;
    let ctx = c.getContext("2d");
    let w = c.width;
    let h = c.height;
    draw();


    function draw() {
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
        if (sim.age < 3000) {
            window.requestAnimationFrame(draw);
        } else {
            return 0;
        }
    }
}

//CONSTANTS
let MASS_AREA_CONVERSION = 0.5,
    BG_COLOUR = "#e1e1e1",
    GRID_SIZE = 200,
    FPS = 60,
    SPEED = 3,
    TICK_RATE = 10,
    INITIAL_COMP = [[a, 2000], [b, 1000]];