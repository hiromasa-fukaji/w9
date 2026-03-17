/*
 * "参考にした作品タイトル" by takawo
 * https://openprocessing.org/sketch/2136664
 *
 * Original License: CC BY-NC-SA 3.0 
 * https://creativecommons.org/licenses/by-nc-sa/3.0/
 *
 * Derivative work by Hiromasa Fukaji(2026)
 * This work: CC BY-NC-SA 3.0 (SA compliance)
 * https://creativecommons.org/licenses/by-nc-sa/3.0/
 */


let palette = ["#e9663eff", "#30cff2ff", "#7336c3ff", "#FFD600", "#FFFFFF"];

function setup() {
    createCanvas(540, 960);
    pixelDensity(1);
    noLoop();
}

function windowResized() {
    resizeCanvas(540, 960);
    redraw();
}

function keyPressed() {
    if (key === 's') {
        saveCanvas('pattern', 'png');
    }
}

function draw() {
    background(0);

    let h = (width * 2) / 10;
    let textures = [];
    for (let i = 0; i < 20; i++) {
        let colors = shuffle(palette.concat());
        let tex = createGraphics(h * random([1, 2, 4, 8]), h);
        createPattern(tex, colors);
        textures.push(tex);
    }
    push();
    translate(width / 2, height / 2);
    for (let d = width * 2; d > 0; d -= h) {
        let shuffletextures = shuffle(textures.concat());
        let n = 0;
        for (let t = 0; t < TWO_PI; t += TWO_PI / 4) {
            let pattern = drawingContext.createPattern(
                shuffletextures[n++ % 1].elt,
                "repeat"
            );
            drawingContext.fillStyle = pattern;
            push();
            rotate(t);
            translate(-d / 2, -d / 2);
            noStroke();
            rect(0, 0, d - h / 2, h / 2);
            pop();
        }
    }
    pop();
    for (let tex of textures) {
        tex.remove();
    }
}

function createPattern(texture, colors) {
    let d = texture.height / 2;
    let n = 0;
    for (let x = 0; x < texture.width; x += d) {
        texture.fill(colors[n++ % 3]);
        texture.noStroke();
        texture.push();
        texture.translate(x + d / 2, d / 2);
        texture.rotate((int(random(4)) * TWO_PI) / 4);
        texture.translate(-d / 2, -d / 2);
        switch (int(random(4))) {
            case 0:
                texture.rectMode(CORNER);
                texture.rect(0, 0, d, d);
                break;
            case 1:
                texture.ellipseMode(CORNER);
                texture.ellipse(0, 0, d, d);
                break;
            case 2:
                texture.arc(0, 0, d * 2, d * 2, 0, PI / 2, PIE);
                break;
            case 3:
                texture.triangle(0, 0, d, 0, 0, d);
                break;
        }
        texture.pop();
    }
}
