let mySvg;
let mySounds = [];  // 音源配列
let mySound;        // 現在選択中の音源
let amp;
let smoothedSize = 1;
let sizeHistory = []; // サイズの履歴を保持する配列
let textGraphic;      // テキスト描画用バッファ

let myFilter; // フィルターオブジェクト
let myReverb; // リバーブオブジェクト
let myDelay;  // ディレイオブジェクト

// Tweakpane用のパラメーター設定
const PARAMS = {
    soundSelect: 0,         // 音源選択 (0=sound1, 1=sound2, 2=sound3)
    volume: 1.0,
    rate: 1.0,
    reverbTime: 0,
    delayTime: 0,
    delayFeedback: 0.5,
    filterType: 'off',
    filterFreq: 10000,
    filterRes: 1,
    displayMode: 'svg',     // 'svg' or 'text'
    textContent: 'HELLO',   // 表示する文字列
    textFont: 'Helvetica',  // フォント名
    hue: 330,
    saturation: 80,
    maxLayers: 30,          // 重なる最大レイヤー数
};

function preload() {
    mySvg = loadImage('logo.svg');
    // 3つの音源を全て読み込む
    mySounds[0] = loadSound('sound1.mp3');
    mySounds[1] = loadSound('sound2.mp3');
    mySounds[2] = loadSound('sound3.mp3');
    mySound = mySounds[0]; // 初期選択はsound1
}

function setup() {
    createCanvas(windowWidth, windowHeight);

    // カラーモードをHSB（色相、彩度、明度、透明度）に変更
    colorMode(HSB, 360, 100, 100, 255);

    amp = new p5.Amplitude();

    // フィルター、リバーブ、ディレイの作成
    myFilter = new p5.Filter();
    myReverb = new p5.Reverb();
    myDelay = new p5.Delay();

    // 初回のルーティングを設定する
    updateAudioRouting();

    // Tweakpaneの初期化
    const pane = new Tweakpane.Pane({ title: 'Sound Control' });

    // --- 基本コントロール ---
    // 音源選択: sound1 / sound2 / sound3
    pane.addInput(PARAMS, 'soundSelect', {
        label: 'sound',
        options: {
            'Sound1': 0,
            'Sound2': 1,
            'Sound3': 2,
        }
    }).on('change', (ev) => {
        let wasPlaying = mySound.isPlaying();
        mySound.stop();
        mySound = mySounds[ev.value];
        mySound.setVolume(PARAMS.volume);
        mySound.rate(PARAMS.rate);
        updateAudioRouting();
        if (wasPlaying) {
            mySound.loop();
        }
    });

    // 音量（ボリューム）スライダー: 0.0 〜 1.0
    pane.addInput(PARAMS, 'volume', { min: 0.0, max: 1.0 }).on('change', (ev) => {
        mySound.setVolume(ev.value);
    });

    // 音の高さ・再生速度（ピッチ）スライダー: 0 〜 2.0
    pane.addInput(PARAMS, 'rate', { min: 0, max: 2.0 }).on('change', (ev) => {
        mySound.rate(ev.value);
    });

    // --- フィルターコントロール ---
    const filterFolder = pane.addFolder({ title: 'DJ Filter' });

    // フィルタータイプ選択: Off / LowPass / HighPass
    filterFolder.addInput(PARAMS, 'filterType', {
        options: {
            'Off (フィルターなし)': 'off',
            'LowPass (こもった音)': 'lowpass',
            'HighPass (軽い音)': 'highpass',
        }
    }).on('change', (ev) => {
        if (ev.value !== 'off') {
            myFilter.setType(ev.value);
        }
        updateAudioRouting();
    });

    // カットオフ周波数: 20Hz 〜 10000Hz
    filterFolder.addInput(PARAMS, 'filterFreq', {
        label: 'cutoff',
        min: 20,
        max: 10000,
    }).on('change', (ev) => {
        myFilter.freq(ev.value);
    });

    // レゾナンス（共鳴の強さ）: 0.1 〜 20
    filterFolder.addInput(PARAMS, 'filterRes', {
        label: 'resonance',
        min: 0.1,
        max: 20,
    }).on('change', (ev) => {
        myFilter.res(ev.value);
    });

    // --- 空間・残響効果コントロール ---
    const fxFolder = pane.addFolder({ title: 'Spatial FX' });

    // リバーブタイム（空間の広さ）: 0 〜 10 秒
    fxFolder.addInput(PARAMS, 'reverbTime', {
        label: 'reverb',
        min: 0,
        max: 10,
    }).on('change', (ev) => {
        updateAudioRouting();
    });

    // ディレイタイム（やまびこの遅れ）: 0 〜 1.0 秒
    fxFolder.addInput(PARAMS, 'delayTime', {
        label: 'delay time',
        min: 0,
        max: 1.0,
    }).on('change', (ev) => {
        updateAudioRouting();
    });

    // ディレイフィードバック（繰り返す量）: 0 〜 0.8
    fxFolder.addInput(PARAMS, 'delayFeedback', {
        label: 'delay feedback',
        min: 0,
        max: 0.8,
    }).on('change', (ev) => {
        if (myDelay) {
            myDelay.feedback(ev.value);
        }
    });

    // --- ビジュアルコントロール ---
    const visualFolder = pane.addFolder({ title: 'Visual' });

    // 表示モード選択: SVG / Text
    visualFolder.addInput(PARAMS, 'displayMode', {
        label: 'mode',
        options: {
            'SVG': 'svg',
            'Text': 'text',
        }
    }).on('change', () => {
        if (PARAMS.displayMode === 'text') {
            updateTextGraphic();
        }
    });

    // テキスト入力
    visualFolder.addInput(PARAMS, 'textContent', {
        label: 'text',
    }).on('change', () => {
        updateTextGraphic();
    });

    // フォント選択
    visualFolder.addInput(PARAMS, 'textFont', {
        label: 'font',
        options: {
            'Helvetica': 'Helvetica',
            'Helvetica Condensed Bold': 'HelveticaNeue-CondensedBold',
            'Arial': 'Arial',
            'Georgia': 'Georgia',
            'Courier New': 'Courier New',
            'Times New Roman': 'Times New Roman',
            'Impact': 'Impact',
            'Futura': 'Futura',
            'Hiragino Sans': 'Hiragino Sans',
            'Hiragino Mincho': 'Hiragino Mincho ProN',
        }
    }).on('change', () => {
        updateTextGraphic();
    });

    // 重なる最大レイヤー数: 1 〜 40
    visualFolder.addInput(PARAMS, 'maxLayers', {
        label: 'layers',
        min: 1,
        max: 40,
        step: 1,
    });

    // --- カラーコントロール ---
    const colorFolder = pane.addFolder({ title: 'Color' });

    // 色相 (Hue): 0〜360
    colorFolder.addInput(PARAMS, 'hue', { min: 0, max: 360 });

    // 彩度 (Saturation): 0〜100
    colorFolder.addInput(PARAMS, 'saturation', { min: 0, max: 100 });

    // --- スナップショット ---
    pane.addButton({ title: '📷 Snapshot' }).on('click', () => {
        saveCanvas('snapshot', 'png');
    });

    let btn = createButton('Play / Pause');
    btn.position(10, 10);
    btn.mousePressed(togglePlay);

    imageMode(CENTER);

    // 初回のテキストバッファを生成
    updateTextGraphic();
}

// テキストをオフスクリーンバッファに描画する関数
function updateTextGraphic() {
    // テキストのサイズを大きくして高解像度で描画
    let tempSize = 500;
    let pg = createGraphics(1, 1);
    pg.textFont(PARAMS.textFont);
    pg.textSize(tempSize);
    let tw = pg.textWidth(PARAMS.textContent);
    let th = tempSize;
    pg.remove();

    // 余白をつけてバッファを作成
    let padding = 40;
    let bufW = ceil(tw + padding * 2);
    let bufH = ceil(th + padding * 2);
    if (bufW < 1) bufW = 100;
    if (bufH < 1) bufH = 100;

    textGraphic = createGraphics(bufW, bufH);
    textGraphic.pixelDensity(displayDensity()); // ディスプレイの解像度に合わせる
    textGraphic.clear();
    textGraphic.fill(255); // 白色で描画（tintで色を乗せるため）
    textGraphic.noStroke();
    textGraphic.textFont(PARAMS.textFont);
    textGraphic.textSize(tempSize);
    textGraphic.textAlign(CENTER, CENTER);
    textGraphic.text(PARAMS.textContent, bufW / 2, bufH / 2);
}

// 音声ルーティング（接続）を確実に更新する関数
function updateAudioRouting() {
    // 既存の接続をすべてリセット
    mySound.disconnect();
    myFilter.disconnect();
    myReverb.disconnect();
    myDelay.disconnect();

    // エフェクトのソース（生の音 or フィルターを通した音）を決める
    let fxSource = mySound;

    if (PARAMS.filterType === 'off') {
        mySound.connect(); // マスター出力へ
    } else {
        mySound.connect(myFilter); // フィルターへ
        myFilter.connect();        // フィルターからマスター出力へ
        fxSource = myFilter;       // エフェクトのソースはフィルターの出力
    }

    // リバーブが有効な場合のみ接続
    if (PARAMS.reverbTime > 0) {
        myReverb.process(fxSource, PARAMS.reverbTime, 2);
        myReverb.connect();
    }

    // ディレイが有効な場合のみ接続
    if (PARAMS.delayTime > 0) {
        myDelay.process(fxSource, PARAMS.delayTime, PARAMS.delayFeedback, 2300);
        myDelay.connect();
    }
}

function draw() {
    background(255);

    // 現在の音量を取得してサイズにマッピング
    let level = amp.getLevel();

    // 音量の反応を激しくするため、入力の上限を0.4などに狭め、出力サイズを大きく設定する
    let targetSize = map(level, 0, 0.1, 0, 300);

    // 値の変化に対する追従を早くして、キビキビと激しく動くようにする（0.1 → 0.4）
    smoothedSize = lerp(smoothedSize, targetSize, 0.2);

    // 現在のサイズを履歴に追加
    sizeHistory.push(smoothedSize);
    // 履歴がmaxLayersを超えたら古いものを削除（whileで即座に反映）
    while (sizeHistory.length > PARAMS.maxLayers) {
        sizeHistory.shift();
    }

    blendMode(DIFFERENCE);

    // 表示モードに応じて描画対象とアスペクト比を決定
    let displayImg;
    let aspect;
    if (PARAMS.displayMode === 'svg') {
        displayImg = mySvg;
        aspect = mySvg.height / mySvg.width;
    } else {
        displayImg = textGraphic;
        aspect = textGraphic.height / textGraphic.width;
    }

    // 古い履歴から順に描画（古いものが奥、新しいものが手前）
    for (let i = 0; i < sizeHistory.length; i++) {
        let alpha = map(i, 0, sizeHistory.length - 1, 30, 255);

        // PARAMSの色設定を使ってtintを適用
        tint(PARAMS.hue, PARAMS.saturation, 100, 255);

        // 横幅はそのまま、縦幅にアスペクト比を掛けて元の比率を維持する
        image(displayImg, width / 2, height / 2, sizeHistory[i], sizeHistory[i] * aspect);
    }

    blendMode(BLEND);
    noTint();
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}

// 再生・停止の切り替え関数
function togglePlay() {
    if (mySound.isPlaying()) {
        mySound.pause();
    } else {
        mySound.loop();
    }
}