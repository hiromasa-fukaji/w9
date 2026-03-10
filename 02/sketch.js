let paths = []; // SVGパスから抽出した頂点配列を格納
let meltProgress = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);

  // SVGファイルをfetchして読み込み、パスデータを抽出する
  fetch('logo.svg')
    .then(res => res.text())
    .then(svgText => {
      // DOMParserでSVGをパースし、path要素を取得
      let parser = new DOMParser();
      let svgDoc = parser.parseFromString(svgText, 'image/svg+xml');
      let svgEl = svgDoc.querySelector('svg');
      let pathEls = svgDoc.querySelectorAll('path');

      // SVGのviewBox情報を取得
      let vb = svgEl.getAttribute('viewBox').split(' ').map(Number);
      let svgW = vb[2];
      let svgH = vb[3];

      // 画面に対するスケールを計算（画面の70%に収まるように）
      let scaleFactor = min(width * 0.7 / svgW, height * 0.7 / svgH);

      // 画面中央に配置するためのオフセット
      let offsetX = width / 2 - (svgW * scaleFactor) / 2;
      let offsetY = height / 2 - (svgH * scaleFactor) / 2;

      // 各path要素からポイントをサンプリング
      for (let el of pathEls) {
        // ブラウザのSVG APIを使うためにDOMに一時的にSVGを追加
        let tempSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        tempSvg.style.position = 'absolute';
        tempSvg.style.visibility = 'hidden';
        tempSvg.setAttribute('viewBox', svgEl.getAttribute('viewBox'));
        let clonedPath = el.cloneNode(true);
        tempSvg.appendChild(clonedPath);
        document.body.appendChild(tempSvg);

        let totalLen = clonedPath.getTotalLength();
        // サンプリング間隔（小さいほど高密度）
        let step = 2;
        let allPoints = [];

        for (let len = 0; len <= totalLen; len += step) {
          let pt = clonedPath.getPointAtLength(len);
          allPoints.push({
            x: pt.x * scaleFactor + offsetX,
            y: pt.y * scaleFactor + offsetY
          });
        }

        // 距離が離れた頂点でパスを分割（文字ごとに分ける）
        let currentPath = [];
        for (let i = 0; i < allPoints.length; i++) {
          let pt = allPoints[i];
          let vec = createVector(pt.x, pt.y);

          if (i > 0) {
            let prevPt = allPoints[i - 1];
            let d = dist(pt.x, pt.y, prevPt.x, prevPt.y);
            if (d > 10) {
              if (currentPath.length > 0) {
                paths.push(currentPath);
              }
              currentPath = [];
            }
          }
          currentPath.push({ base: vec.copy(), curr: vec.copy() });
        }
        if (currentPath.length > 0) {
          paths.push(currentPath);
        }

        // 一時的に追加したSVGを削除
        document.body.removeChild(tempSvg);
      }
    });
}

function draw() {
  background(0);

  // 時間経過で「解ける度合い」をサイクルさせる
  // 最初の約1秒(60フレーム)は待機し、その後サイクル開始
  let waitFrames = 0;
  let animDuration = 500; // 溶けて戻るまでのアニメーション期間
  let pauseDuration = 0; // 戻った後に静止する期間
  let cycleDuration = animDuration + pauseDuration; // 1サイクル全体の長さ

  let elapsed = max(0, frameCount - waitFrames);
  let cycleTime = elapsed % cycleDuration; // 現在のサイクル内の経過時間

  let normalizedProgress = 0;
  if (cycleTime < animDuration) {
    // アニメーション期間中はコサイン波で 0 → ピーク → 0
    let phase = (cycleTime / animDuration) * TWO_PI;
    normalizedProgress = (1 - cos(phase)) / 2;
  } else {
    // 静止期間中は 0（崩れない）
    normalizedProgress = 0;
  }

  meltProgress = pow(normalizedProgress, 5) * 12.0;

  fill(255);
  noStroke();

  let time = frameCount * 0.003;

  // 各パス（文字や輪郭）を描画
  for (let i = 0; i < paths.length; i++) {
    let path = paths[i];

    // まず全頂点の変位を計算する
    let forces = [];
    let avgFX = 0, avgFY = 0;
    for (let j = 0; j < path.length; j++) {
      let p = path[j];
      let noiseValX = noise(p.base.x * 0, p.base.y * 0, time);
      let noiseValY = noise(p.base.x * -0.01, p.base.y * -0.01, time);
      let localProgress = meltProgress;
      let forceX = map(noiseValX, 0, 1, 0, 0) * localProgress;
      let forceY = map(noiseValY, 0, 1, -0, 200) * localProgress;
      forces.push({ fx: forceX, fy: forceY });
      avgFX += forceX;
      avgFY += forceY;
    }
    // 平均変位を求めて引くことで、文字の重心を元の位置に固定する
    avgFX /= path.length;
    avgFY /= path.length;

    beginShape();
    for (let j = 0; j < path.length; j++) {
      let p = path[j];
      p.curr.x = p.base.x + (forces[j].fx - avgFX);
      p.curr.y = p.base.y + (forces[j].fy - avgFY);
      curveVertex(p.curr.x, p.curr.y);
    }
    endShape(CLOSE);
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}