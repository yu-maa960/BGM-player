//グローバル
const audio = new Audio();
//JSでHTML要素を扱うための参照用変数
let geneList;
let songList;
let geneItems;
let songItems;
let UI;
let playIcon;
let pauseIcon;

let geneCursorIndex = 0;//世代リストのindex

let visibleSongs = [];//選択した世代の曲のHTML要素を格納する配列
let visibleIndex = 0;//リストに表示されている曲のhtmlにおけるindex(本物)
let currentCursorIndex = 0;//リストに表示されている曲のそのリストにおけるindex

let scrollTimeout;//isAutoScrolling用タイマー

//状態フラグ
let isAutoScrolling = false;
let isPlaying = false;
let isDragging = false;

//miniplayerを掴んだ座標
let startX;
let startY;

//曲の入手
fetch('../player.json')
    .then(response => response.json())
    .then(songList => {
        const uniqueGenerations = [];
        const seenGen = new Set();

        songList.forEach(song => {
            if (!seenGen.has(song.generation)) {
                seenGen.add(song.generation);
                uniqueGenerations.push({
                    generation: song.generation,
                    geneTitle: song.geneTitle
                });
            }
        });

        //初期化ゾーン
        initGeneScreen(uniqueGenerations);
        initSongScreen(songList);
        document.addEventListener("touchstart", function() {}, true);
        miniImg = document.getElementById('mini-img');
        miniImg.addEventListener('pointerdown', handleMiniDown, {passive: false});
        playIcon = document.querySelector('.icon-play');
        pauseIcon = document.querySelector('.icon-pause');
        if (window.lucide) {
            lucide.createIcons();
        }

        geneUpdateVisual(0);

        //各スクリーンのhyml要素を取り出しておく
        UI = {
            list:   document.getElementById('list-screen'),
            player: document.getElementById('player-screen'),
            gene:   document.getElementById('gene-screen'),
            mini:   document.getElementById('miniplayer')
        }


    })
    .catch(error => console.error("データ読み込みエラー:", error));


function initGeneScreen(generations) {
    const geneListContainer = document.getElementById("gene-list");

    generations.forEach((gen, statIndex) => {
        const geneItem = document.createElement("div");
        geneItem.className = "gene-item";
        geneItem.id = `gene-item-${statIndex}`;

        geneItem.setAttribute("data-index", statIndex);
        geneItem.setAttribute("data-gen", gen.generation);

        const img = document.createElement("img");
        img.className = "gene-thumbnail";
        img.src = `./images/${gen.generation}/${gen.generation}_jacket.jpg`;//世代画像

        const h3 = document.createElement("h3");
        h3.className = "genetext";
        h3.textContent = gen.geneTitle;

        geneItem.appendChild(img);
        geneItem.appendChild(h3);
        geneListContainer.appendChild(geneItem);
    })
    geneList = document.querySelector('.gene-list');
    geneList.addEventListener('scroll', geneTapCursor, {passive: true});
    geneList.addEventListener('click', filterAndShowList);

    geneItems = document.querySelectorAll('.gene-item');
}

function initSongScreen(songlist) {//やむを得ずsonglistにした．
    const songListContainer = document.getElementById("song-list");

    songlist.forEach((song, statIndex) => {
        const songItem = document.createElement("div");
        songItem.className = "song-item";
        songItem.id = `song-item-${statIndex}`;

        songItem.setAttribute("data-index", statIndex);
        songItem.setAttribute("data-file", song.filePath);
        songItem.setAttribute("data-title", song.title);
        songItem.setAttribute("data-img", song.imagePath);
        songItem.setAttribute("data-gen", song.generation);
        songItem.setAttribute("data-genename", song.geneTitle);

        const img = document.createElement("img");
        img.className = `list-thumbnail`;
        img.src = song.imagePath;

        const songInfo = document.createElement("div");
        songInfo.className = "song-info";

        const titleSpan = document.createElement("span");
        titleSpan.className = "title-text";
        titleSpan.textContent = song.title;

        const genSpan = document.createElement("span");
        genSpan.className = "gen-text";
        genSpan.textContent = song.geneTitle;

        songInfo.appendChild(titleSpan);
        songInfo.appendChild(genSpan);
        songItem.appendChild(img);
        songItem.appendChild(songInfo)

        songListContainer.appendChild(songItem);
    })
    songList = document.querySelector('.song-list');
    songList.addEventListener('scroll', tapCursor, { passive: true });
    songList.addEventListener('click', selectAndPlay);

    songItems = document.querySelectorAll('.song-item');
}



//イベントリスナー


audio.ontimeupdate = () => {
    const progress = (audio.currentTime / audio.duration) * 100;
    document.getElementById('seek-bar').value = progress || 0;
}



//メインロジック
//タッチ処理
function filterAndShowList(e) {
    const item = e.target.closest('.gene-item');
    if (!item) return;
    geneCursorIndex = Number(item.dataset.index);
    geneUpdateVisual(geneCursorIndex);
    decideGene();
}

function selectAndPlay(e) {
    const item = e.target.closest('.song-item');
    if (!item) return;
    const index = Number(item.dataset.index);
    const vIndex = visibleSongs.findIndex(element => element.dataset.index === String(index));//htmlのindex(本物)から、visibleSongsのindexを特定
    if (vIndex < visibleSongs.length) {
        currentCursorIndex = vIndex;
        visibleIndex = index;
        updateVisual(visibleIndex);//戻ったときに、そのまま枠がついていてほしい。
        decideSong();
    } else {
        showError('曲選択において、indexにエラーがあります。');
    }
}


function handleMiniDown(e) {
    isDragging = true;//掴んでいるかの状態フラグ(PC用)

    startX = e.clientX;
    startY = e.clientY;

    e.preventDefault();
    
    window.addEventListener('pointermove', handleMiniDrag);
    window.addEventListener('pointerup', handleMiniDragEnd, {once: true});
}

function handleMiniDrag(e) {
    if (!isDragging) return;//つかんでいない(押していない)場合は即終了

    UI.mini.style.transition = 'none';//transition無効化
    UI.mini.style.bottom = 'auto';
    UI.mini.style.right = 'auto';
    //移動。リアルタイムな座標更新
    UI.mini.style.top = `${e.clientY - 25}px`;
    UI.mini.style.left = `${e.clientX - 25}px`;
}

function handleMiniDragEnd(e) {
    isDragging = false;

    window.removeEventListener('pointermove', handleMiniDrag);

    const diffX = Math.abs(e.clientX - startX);
    const diffY = Math.abs(e.clientY - startY);

    // タップなら吸い付き処理はせず、ここで終了
    if (diffX < 5 && diffY < 5) {
        switchScreen('player');
        return;
    }

    UI.mini.style.transition = 'all 0.7s ease'; 
    UI.mini.style.left = 'auto';
    UI.mini.style.right = '20px';//右は固定(miniplayerの値)
}


//ボタンでのカーソル移動
function geneMoveCursor(direction)
{
    if (geneItems.length === 0) {
        showError('世代リストが空です。データが読み込めていない可能性があります。')
        return;
    }

    if (scrollTimeout) clearTimeout(scrollTimeout);//連打用。タイマーリセット

    geneCursorIndex += direction;
    if (geneCursorIndex < 0) {
        geneCursorIndex = geneItems.length -1;
    } else if (geneCursorIndex >= geneItems.length) {
        geneCursorIndex = 0;
    }

    isAutoScrolling = true;//以下の操作のために、手でのスクロールを封じる状態フラグ

    const target = document.getElementById('gene-item-' + geneCursorIndex);
    if (target) {
        const itemHeight = target.offsetHeight + 15;//itemHeightは一つの枠の大きさ+gap(15)
        geneList.scrollTo({
            top: geneCursorIndex * itemHeight,
            behavior: "smooth"
        });
        geneUpdateVisual(geneCursorIndex);
    } else {
        showError('移動先の曲が見つかりません。indexに誤りがあります。');
        console.error(`Cursor Error: Index ${geneCursorIndex} not found in DOM.`);
        isAutoScrolling = false;
        return;
    }

    scrollTimeout = setTimeout(() => {isAutoScrolling = false;}, 500);//タイマー起動。0.5秒後に自動でフラグを降ろす。
}

function moveCursor(direction)
{
    if (visibleSongs.length === 0) {
        showError('曲が正しく読み込めていません。')
        return;
    }

    if (scrollTimeout) clearTimeout(scrollTimeout);

    currentCursorIndex += direction;
    if (currentCursorIndex < 0) {
        currentCursorIndex = visibleSongs.length -1;
    } else if (currentCursorIndex >= visibleSongs.length) {
        currentCursorIndex = 0;
    }

    isAutoScrolling = true;

    const targetElement = visibleSongs[currentCursorIndex];
    if (targetElement) {
        visibleIndex = parseInt(targetElement.dataset.index)//移動後の曲のindex(本物)を代入
        const gatePosition = visibleSongs[0].offsetTop;//カーソルを合わせる門の位置(song-listの33dvh)
        songList.scrollTo({
            top: targetElement.offsetTop - gatePosition,//スクロールされる場所。cssのy proximityにより調整される。
            behavior: "smooth"
        });    
        updateVisual(visibleIndex);

    } else {
        showError('移動先の曲が見つかりません。indexに誤りがあります。');
        isAutoScrolling = false;
        return;
    }

    scrollTimeout = setTimeout(() => {isAutoScrolling = false;}, 1000);
}


//手でのスクロール
function geneTapCursor() {
    if (isAutoScrolling) return; // ボタンスクロール中は即終了

    if (geneItems.length === 0) {
        showError('各世代のフォルダが見つかりません。');
        return;
    }

    const currentScroll = geneList.scrollTop;
    const gatePosition = geneItems[0].offsetTop;
    //const isAtBottom = geneList.scrollHeight - currentScroll - geneList.offsetHeight <= 1;//底の判定

    let nextIndex = 0;

    
    let minDistance = Infinity;//無限で初期化
    //門に最も近い曲を見つける。
    geneItems.forEach((el, i) => {
        const elementPosition = el.offsetTop - gatePosition;
        const distance = Math.abs(currentScroll - elementPosition);
        if (distance < minDistance) {
            minDistance = distance;
            nextIndex = i;
        }
    });
    

    if (nextIndex >= 0 && nextIndex < geneItems.length) {
        if (nextIndex !== geneCursorIndex) {
            geneCursorIndex = nextIndex;
            geneUpdateVisual(geneCursorIndex);
        }
    } else {
        showError("indexの特定に失敗しました。");
        return;
    }
}

function tapCursor() {
    if (isAutoScrolling) {
        return;
    }
    if (visibleSongs.length === 0) {
        showError('各曲のファイルが正しく分類されていないか、ファイルがありません。');
        return;
    }

    const currentScroll = songList.scrollTop;
    const gatePosition = visibleSongs[0].offsetTop;

    let closestIndex = 0;
    let minDistance = Infinity;

    visibleSongs.forEach((el, i) => {
        const elementPosition = el.offsetTop - gatePosition;
        const distance = Math.abs(currentScroll - elementPosition);

        if (distance < minDistance) {
            minDistance = distance;
            closestIndex = i;
        }
    });
    currentCursorIndex = closestIndex;
    
    //index(本物)を逆算
    const targetElement = visibleSongs[currentCursorIndex];
    visibleIndex = parseInt(targetElement.dataset.index);
    updateVisual(visibleIndex);
}


//決定
function decideGene() {
    const headerImg = document.getElementById('selected-gen-jacket');
    const target = document.getElementById('gene-item-' + geneCursorIndex);
    const gen = target.dataset.gen;

    //ジャケットのsrcを更新
    const newSrc = `/images/${gen}/${gen}_jacket.jpg`;
    headerImg.src = newSrc;                           
    headerImg.style.display = 'block';

    let firstVisible = false;//リスト表示できる曲が最低限一曲あるかのフラグ

    songItems.forEach(item => {
        if (item.dataset.gen === gen) {
            item.classList.remove('hidden');
            visibleSongs.push(item);
            if (!firstVisible) {
                visibleIndex = parseInt(item.dataset.index);//最低限の1曲があるか
                firstVisible = true;
            }
        } else {
            item.classList.add('hidden');
        }
    });
    if (!firstVisible) {
        showError('フォルダ内の曲が見つかりませんでした。');
        return;
    }
    
    switchScreen('list');
    const gateOffset = window.innerHeight * 0.33;
    //2回目以降のList開いた時にindex0を初期位置とする
    songList.scrollTo({
            top: visibleSongs[currentCursorIndex].offsetTop - gateOffset,//門の位置(33dvh)に合わせる。0、つまりpadding直下の33dvh
            behavior: "smooth"
        });    
    updateVisual(visibleIndex);
}

function decideSong()//
{
    const target = document.getElementById('song-item-' + visibleIndex);//選択した曲
    if (target) {
        playSong(target.dataset.file, target.dataset.title, target.dataset.img);
    } else {
        showError('選択した曲が見つかりませんでした。');
        return;
    }
}

async function playSong(file, title, imagePath)
{
    audio.src = file;
    audio.load();
    
    //タイトルや画像を流す曲に更新
    document.getElementById('current-title').innerText = title;
    document.getElementById('jacket-img').src = imagePath;
    document.getElementById('mini-img').src = imagePath;
    document.getElementById('mini-img').style.display = 'block';
    
    isPlaying = true;
    updatePlayButton(true);
    switchScreen('player');

    await new Promise((resolve) => {
        audio.oncanplay = resolve;
    });

    try {
        await audio.play();
        
    } catch (error) {
        if (error.name === "AbortError") {
            showError("連打されたので、前の再生処理を中断しました。");
        } else if (error.name === "NotAllowedError") {
            showError("ユーザーの操作がないため、再生がブロックされました");
        } else {
            showError("再生中にエラーが発生しました。");
            console.error("生の再生エラー:", error);
        }
    }
}



//道具
function switchScreen(state) {//次の遷移先を書く
    [UI.list, UI.player, UI.gene].forEach(el => el.classList.add('hidden'));

    switch (state) {
        case 'player':
            UI.player.classList.remove('hidden');//最初のhidden用。
            UI.player.classList.remove('player-standby');
            UI.list.classList.add('hidden')
            UI.mini.classList.add('hidden'); // 全画面中はミニは隠す
            break;

        case 'list':
            UI.list.classList.remove('hidden');

            //closePlayerの後用
            UI.player.classList.add('player-standby');
            if (isPlaying) {
                UI.mini.classList.remove('hidden');
                UI.mini.style.display = 'block';
            }
            break;

        case 'gene'://geneは1枚目のスクリーンのため、戻ってくる専用。
            UI.gene.classList.remove('hidden');
            UI.list.classList.add('hidden');
            break;
    }
}


function geneUpdateVisual(index) {
    geneItems.forEach(el => el.classList.remove('selected'));//gene-itemをそれぞれを取り出し、selectedクラス除去
    
    const target = document.getElementById('gene-item-' + index);
    if (target) {
        target.classList.add('selected');
    } else {
        showError('表示の同期に失敗しました。画面をリロードしてください。');
        console.error(`Id gene-item-${index} not found.`);
        return;
    }
}

function updateVisual(index) {//仮引数indexはhtmlのindexを渡さないといけない(クラス付与なので)
    visibleSongs.forEach(el => el.classList.remove('selected'));
    
    const target = document.getElementById('song-item-' + index);
    if (target) {
        target.classList.add('selected');
    } else {
        showError('選択する曲を見つけられませんでした。');
        return;
    }
}

function closeList() {
    switchScreen('gene');

    currentCursorIndex = 0;//ボタン用の初期化
    visibleSongs = [];//初期化
    
    const target = document.getElementById('gene-item-' + geneCursorIndex);
    const itemHeight = target.offsetHeight + 15;
    geneList.scrollTo({
        top: geneCursorIndex * itemHeight,
        behavior: "smooth"
    });
}

function closePlayer()
{
    switchScreen('list');

    const gateOffset = window.innerHeight * 0.33;
    songList.scrollTo({
        top: visibleSongs[currentCursorIndex].offsetTop - gateOffset,
        behavior: "smooth"
    }); 
}

function togglePlay() {//再生、停止
    if (audio.paused) {
        audio.play();
        updatePlayButton(true);
    } else {
        audio.pause();
        updatePlayButton(false);
    }
}

const toggleLoop = ( () => {
    let isLoop = false;
    return () => {
        isLoop = !isLoop;
        audio.loop = isLoop;
        const loopBtn = document.getElementById('loop-btn');
        loopBtn.classList.toggle('active', isLoop);
    }
})();

function updatePlayButton(playing) {
    if (playing) {
        playIcon.style.display = 'none';
        pauseIcon.style.display = 'block';
    } else {
        playIcon.style.display = 'block';
        pauseIcon.style.display = 'none';
    }
    isPlaying = playing;
}

function skip(seconds)
{
    if (!isNaN(audio.duration)) {
        audio.currentTime += seconds;
    }
}

function seek(value)
{
    if (audio.duration) {
        audio.currentTime = (value / 100) * audio.duration;
    }
}

function showError(message) {
    const errorDiv = document.getElementById('error-area');
    errorDiv.textContent = `⚠️ ${message}`;
    errorDiv.style.display = 'block';

    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 5000);
}