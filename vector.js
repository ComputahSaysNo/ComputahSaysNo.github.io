class Vector {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }

    difference(otherVector) {
        return new Vector(this.x - otherVector.x, this.y - otherVector.y);
    }

    dot(otherVector) {
        return this.x * otherVector.x + this.y * otherVector.y;
    }

    sum(otherVector) {
        return new Vector(this.x + otherVector.x, this.y + otherVector.y);
    }

    add(otherVector) {
        this.x += otherVector.x;
        this.y += otherVector.y;
    }

    subtract(otherVector) {
        this.x -= otherVector.x;
        this.y -= otherVector.y;
    }

    scale(scalar) {
        this.x *= scalar;
        this.y *= scalar;
    }

    getScaled(scalar) {
        return new Vector(this.x * scalar, this.y * scalar);
    }

    magSq() {
        return this.x ** 2 + this.y ** 2;
    }

    mag() {
        return Math.sqrt(this.magSq());
    }

    normalise() {
        var mag = this.mag();
        if (mag === 0) {
            this.x = 0;
            this.y = 0;
        } else {
            this.x /= mag;
            this.y /= mag;
        }
    }

    rotate(theta) {
        //anticlockwise
        var newX = this.x * Math.cos(theta) - this.y * Math.sin(theta);
        var newY = this.x * Math.sin(theta) + this.y * Math.cos(theta);
        this.x = newX;
        this.y = newY;
    }

    getAngle() {
        return Math.atan2(this.y, this.x);
    }
}

function vectorFromAngle(angle, mag = 1) {
    return new Vector(mag * Math.cos(angle), mag * Math.sin(angle));
}

function dotProduct(a, b) {
    return a.x * b.x + a.y * b.y;
}

