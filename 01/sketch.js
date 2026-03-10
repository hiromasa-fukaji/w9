/*
 * CONTEXT: p5.js Creative Coding
 * GOAL: SVGロゴの各円をパーティクルとして定義し、
 *       音が広がるようにゆるやかに飛散するアニメーション
 */

let particles = [];
let svgLoaded = false;
let disperseStartTime = 500; // 3秒後に広がり始める
let startTime;

const SVG_WIDTH = 854;
const SVG_HEIGHT = 477;

function setup() {
  createCanvas(windowWidth, windowHeight);
  startTime = millis();

  fetch('logosvg.svg')
    .then(res => res.text())
    .then(svgText => {
      parseSVG(svgText);
      svgLoaded = true;
    });
}

function parseSVG(svgText) {
  let parser = new DOMParser();
  let doc = parser.parseFromString(svgText, 'image/svg+xml');
  let paths = doc.querySelectorAll('path');

  // 一時SVGをDOMに追加してBBox計算
  let tempSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  tempSvg.setAttribute('width', SVG_WIDTH);
  tempSvg.setAttribute('height', SVG_HEIGHT);
  tempSvg.setAttribute('viewBox', '0 0 ' + SVG_WIDTH + ' ' + SVG_HEIGHT);
  tempSvg.style.position = 'absolute';
  tempSvg.style.top = '-9999px';
  tempSvg.style.left = '-9999px';
  document.body.appendChild(tempSvg);

  // ロゴの中心を計算
  let logoCenterX = SVG_WIDTH / 2;
  let logoCenterY = SVG_HEIGHT / 2;

  paths.forEach((pathEl) => {
    let cloned = pathEl.cloneNode(true);
    tempSvg.appendChild(cloned);

    let bbox = cloned.getBBox();
    let cx = bbox.x + bbox.width / 2;
    let cy = bbox.y + bbox.height / 2;
    let r = Math.max(bbox.width, bbox.height) / 2;

    let hasClass = pathEl.classList.contains('cls-1');
    let fillColor = hasClass ? '#005991' : '#000000';

    // 中心からの距離（波紋の遅延計算用）
    let dx = cx - logoCenterX;
    let dy = cy - logoCenterY;
    let distFromCenter = Math.sqrt(dx * dx + dy * dy);

    particles.push(new Particle(cx, cy, r, fillColor, distFromCenter));

    tempSvg.removeChild(cloned);
  });

  document.body.removeChild(tempSvg);
}

class Particle {
  constructor(x, y, r, col, distFromCenter) {
    this.originalX = x;
    this.originalY = y;
    this.r = r;
    this.col = col;
    this.distFromCenter = distFromCenter;

    // 散らばる方向（中心からの角度 + 少しランダム）
    let angle = Math.atan2(
      y - SVG_HEIGHT / 2,
      x - SVG_WIDTH / 2
    ) + (Math.random() - 0.5) * 4;

    this.dirX = Math.cos(angle);
    this.dirY = Math.sin(angle);

    // 散らばる速度（ゆるやかに）
    this.speed = 0.3 + Math.random() * 2;

    // 現在のオフセット
    this.offsetX = 0;
    this.offsetY = 0;

    // 不透明度
    this.alpha = 255;
  }

  update(progress) {
    // progressは0〜1の往復（0=ロゴ状態, 1=広がりきった状態）
    // ループ側の計算で、ロゴ状態で長く・広がった状態で短くなるよう調整済みなので、
    // ここでは素直に progress を移動量に反映させる（少しだけease-outを残す）
    let eased = progress; // または 1 - Math.pow(1 - progress, 2) などで微調整可能

    // 移動量
    let moveAmount = eased * 800 * this.speed;
    this.offsetX = this.dirX * moveAmount;
    this.offsetY = this.dirY * moveAmount;

    // スケール（広がったときにサイズを大きくする）
    // 元のサイズの最大3倍まで大きくなるように設定（好みで数値を調整）
    this.currentR = this.r * (1 + progress * 4);

    // フェードアウト（ゆるやかに透過する）
    this.alpha = lerp(255, 255, progress);
  }

  display(scl, baseOffsetX, baseOffsetY) {
    if (this.alpha <= 0) return;

    let drawX = (this.originalX * scl + baseOffsetX) + this.offsetX * scl;
    let drawY = (this.originalY * scl + baseOffsetY) + this.offsetY * scl;

    // progressに基づいた現在の半径を使う
    let rToUse = this.currentR !== undefined ? this.currentR : this.r;
    let drawR = rToUse * scl;

    noStroke();
    let c = color(this.col);
    c.setAlpha(this.alpha);
    fill(c);
    ellipse(drawX, drawY, drawR * 2, drawR * 2);
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function draw() {
  background(255);

  if (!svgLoaded || particles.length === 0) return;

  let scl = min(width / SVG_WIDTH, height / SVG_HEIGHT) * 0.75;
  let baseOffsetX = (width - SVG_WIDTH * scl) / 2;
  let baseOffsetY = (height - SVG_HEIGHT * scl) / 2;

  let elapsed = millis() - startTime;

  // 散らばりの進行度
  let loopDuration = 7000; // 全体の1ループの長さ
  let restDuration = 500; // そのうちロゴのままで静止する時間
  let animDuration = loopDuration - restDuration; // 動いている時間 (3000ms)

  let progress = 0;
  if (elapsed > disperseStartTime) {
    let t = (elapsed - disperseStartTime) % loopDuration;

    if (t < restDuration) {
      // 静止期間
      progress = 0;
    } else {
      // アニメーション期間（0 -> 1 -> 0）
      // 残りの時間(animDuration)を使ってsin波の半周期分を描く
      let animProgress = (t - restDuration) / animDuration;
      let wave = Math.sin(animProgress * Math.PI);

      // wave^4ほど極端にせずとも、静止を物理的に設けたのである程度自然なカーブにする
      progress = Math.pow(wave, 10);
    }
  }

  // パーティクル更新・描画
  for (let p of particles) {
    if (progress > 0) {
      p.update(progress);
    }
    p.display(scl, baseOffsetX, baseOffsetY);
  }
}
