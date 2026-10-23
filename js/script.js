const audio = new Audio();

let Screen;

let geneList;
let geneItems;
let geneCursorIndex = 0;
let songList;
let songItems;

let visibleSongs = [];  //選択した世代の曲のみを格納する
let uniqueIndex = 0;   //visibleSongs内で選択している曲のindex(固有)
let visibleCursorIndex = 0; //visibleSongs内でのindex(固有のindexではなく見かけ上)

let playIcon;
let pauseIcon;

let startX;
let startY;
let offsetX;
let offsetY;

let isAutoScrolling = false;
let isDragging = false;
let isPlaying = false;

let scrollTimeout;
let errorTimer = null;



fetch('../player.json')
    .then(response => response.json())
    .then(songs => {
        const seenGen = new Set();  //重複なし世代登録
        const representative_song = []; //各世代の代表曲1つ用マップ

        songs.forEach(song => {
            if (!seenGen.has(song.generation)) {
                seenGen.add(song.generation);
                representative_song.push({
                    generation: song.generation,
                    geneTitle: song.geneTitle
                });
            }
        });

        initGeneScreen(representative_song);
        initSongScreen(songs);
        const miniImg = document.getElementById('mini_img');
        miniImg.addEventListener('pointerdown', handleMiniDown, {passive: false});
        playIcon = document.getElementById('icon_play');
        pauseIcon = document.getElementById('icon_pause');
        if (window.lucide) {
            lucide.createIcons();
        }
        geneUpdateVisual(0);    //初期設定

        Screen = {
            list: document.getElementById('list_screen'),
            player: document.getElementById('player_screen'),
            gene: document.getElementById('gene_screen'),
            mini: document.getElementById('mini_player')
        }
    })
    .catch(error => console.error("Fatal Error:", error));

function initGeneScreen(generations) {
    geneList = document.getElementById('gene_list');

    generations.forEach((gene, geneIndex) => {
        const geneItem = document.createElement('div');
        geneItem.className = 'gene_item';
        geneItem.id = `gene_item_${geneIndex}`;
        geneItem.dataset.index = geneIndex;
        geneItem.dataset.gen = gene.generation;

        const img = document.createElement('img');
        img.className = 'gene_thumbnail';
        img.src = `./images/${gene.generation}/${gene.generation}_jacket.jpg`;  //世代画像

        const geneTitle = document.createElement('h3');
        geneTitle.className = 'gene_text';
        geneTitle.textContent = gene.geneTitle;

        geneItem.appendChild(img);
        geneItem.appendChild(geneTitle);
        geneList.appendChild(geneItem);
    });

    geneList.addEventListener('scroll', geneTapCursor, {passive: true});
    geneList.addEventListener('click', filterAndShowList);

    geneItems = document.querySelectorAll('.gene_item');
}

function initSongScreen(songs) {
    songList = document.getElementById('song_list');

    songs.forEach((song, startIndex) => {
        const songItem = document.createElement('div');
        songItem.className = 'song_item';
        songItem.id = `song_item_${startIndex}`;

        //以下5つ全部使用
        songItem.dataset.index = startIndex;
        songItem.dataset.file = song.filePath;
        songItem.dataset.title = song.title;
        songItem.dataset.img = song.imagePath;
        songItem.dataset.gen = song.generation;

        const img = document.createElement('img');
        img.className = 'list_thumbnail';
        img.src = song.imagePath;

        const songInfo = document.createElement('div');
        songInfo.className = 'song_info';

        const title =document.createElement('h3');
        title.className = 'title_text';
        title.textContent = song.title;

        const gen = document.createElement('div');
        gen.className = 'gen_text';
        gen.textContent = song.geneTitle;

        songInfo.appendChild(title);
        songInfo.appendChild(gen);

        songItem.appendChild(img);
        songItem.appendChild(songInfo);

        songList.appendChild(songItem);
    });

    songList.addEventListener('scroll', tapCursor, {passive: true});
    songList.addEventListener('click', selectAndPlay);

    songItems = document.querySelectorAll('.song_item');
}

function filterAndShowList(event) {
    const item = event.target.closest('.gene_item');
    if (!item) {
        return;
    }
    geneCursorIndex = Number(item.dataset.index);
    geneUpdateVisual(geneCursorIndex);
    decideGene();
}

function selectAndPlay(event) {
    const item = event.target.closest('.song_item');
    if (!item) {
        return;
    }
    const uIndex = Number(item.dataset.index);   //固有index
    const vIndex = visibleSongs.findIndex(element => element.dataset.index === String(uIndex)); //リスト上のindex
    if (vIndex < visibleSongs.length) {
        visibleCursorIndex = vIndex;
        uniqueIndex = uIndex;
        updateVisual(uniqueIndex);
        decideSong();
    } else {
        showError('Touch Error');
    }
}

function handleMiniDown(event) {
    isDragging = true;

    const rect = Screen.mini.getBoundingClientRect();
    startX = event.clientX;
    startY = event.clientY;
    offsetX = event.clientX - rect.right;    //掴んだ位置のオフセット
    offsetY = event.clientY - rect.bottom;

    event.preventDefault();

    window.addEventListener('pointermove', handleMiniDrag);
    window.addEventListener('pointerup', handleMiniDragEnd, {once: true});
}

function handleMiniDrag(event) {
    if (!isDragging) {
        return;
    }
    Screen.mini.style.transition = 'none';
    Screen.mini.style.bottom = 'auto';
    Screen.mini.style.right = 'auto';

    Screen.mini.style.right = `${window.innerWidth - (event.clientX - offsetX)}px`;    //掴んだ位置からの距離でDragする．右端が0に注意(軸が逆向き)
    Screen.mini.style.bottom = `${window.innerHeight - (event.clientY - offsetY)}px`;
}

function handleMiniDragEnd(event) {
    isDragging = false;

    window.removeEventListener('pointermove', handleMiniDrag);

    const diffX = Math.abs(event.clientX - startX);
    const diffY = Math.abs(event.clientY - startY);


    //タッチ処理
    if (diffX < 10 && diffY < 10) {
        switchScreen('player');
        return;
    }

    const margin = 70;  //miniのサイズ
    const rect = Screen.mini.getBoundingClientRect();

    Screen.mini.style.transition = 'all 0.7s';
    Screen.mini.style.left = 'auto';
    Screen.mini.style.right = '20px';

    if (rect.top < margin) {
        Screen.mini.style.bottom = `${window.innerHeight - 2 * margin}px`;  //上端をmarginに合わせたい
    } else if (rect.bottom > window.innerHeight - margin) {
        Screen.mini.style.bottom = `${margin}px`;
    }
}

//ボタン操作
function geneMoveCursor(direction) {
    if (geneItems.length === 0) {
        return;
    }

    if (scrollTimeout) {
        clearTimeout(scrollTimeout);
    }

    geneCursorIndex += direction;
    if (geneCursorIndex < 0) {
        geneCursorIndex = geneItems.length - 1;
    } else if (geneCursorIndex >= geneItems.length) {
        geneCursorIndex = 0;
    }

    isAutoScrolling = true;
    const target = document.getElementById('gene_item_' + geneCursorIndex);
    if (target) {
        const gatePosition = document.getElementById('gene_item_0').offsetTop;  //代表
        geneList.scrollTo({
            top: target.offsetTop - gatePosition,
            behavior: 'smooth'
        });
        geneUpdateVisual(geneCursorIndex);
    } else {
        showError('Missed Cursor');
        isAutoScrolling = false;
        return;
    }

    scrollTimeout = setTimeout(() => {
        isAutoScrolling = false;
    }, 200);
}

function geneTapCursor() {
    if (isAutoScrolling) {
        return;
    }

    if (geneItems.length === 0) {
        showError('Any folder not found');
        return;
    }

    const currentScroll = geneList.scrollTop;
    const gatePosition = geneItems[0].offsetTop;
    let nextIndex = 0;
    let minDistance = Infinity;

    geneItems.forEach((element, index) => {
        const elementPosition = element.offsetTop - gatePosition;
        const distance = Math.abs(currentScroll - elementPosition);
        if (distance < minDistance) {
            minDistance = distance;
            nextIndex = index;
        }
    });

    if (nextIndex >= 0 && nextIndex < geneItems.length) {
        if (nextIndex !== geneCursorIndex) {
            geneCursorIndex = nextIndex;
            geneUpdateVisual(nextIndex);
        }
    } else {
        showError("Failed to identify next index");
        return;
    }
}

function moveCursor(direction) {
    if (visibleSongs.length === 0) {
        return;
    }

    if (scrollTimeout) {
        clearTimeout(scrollTimeout);
    }

    visibleCursorIndex += direction;
    if (visibleCursorIndex < 0) {
        visibleCursorIndex = visibleSongs.length - 1;
    } else if (visibleCursorIndex >= visibleSongs.length) {
        visibleCursorIndex = 0;
    }

    isAutoScrolling = true;

    const target = visibleSongs[visibleCursorIndex];
    if (target) {
        uniqueIndex = Number(target.dataset.index);
        const gatePosition = visibleSongs[0].offsetTop;
        songList.scrollTo({
            top: target.offsetTop - gatePosition,
            behavior: 'smooth'
        });
        updateVisual(uniqueIndex);
    } else {
        showError('Missed Cursor');
        isAutoScrolling = false;
        return;
    }

    scrollTimeout = setTimeout(() => {
        isAutoScrolling = false;
    }, 200);
}

function tapCursor() {
    if (isAutoScrolling) {
        return;
    }
    if (visibleSongs.length === 0) {
        showError("Failed to sort files");
        return;
    } 

    const currentScroll = songList.scrollTop;
    const gatePosition = visibleSongs[0].offsetTop;
    let closestIndex = 0;
    let minDistance = Infinity;

    visibleSongs.forEach((element, index) => {
        const elementPosition = element.offsetTop - gatePosition;
        const distance = Math.abs(currentScroll - elementPosition);

        if (distance < minDistance) {
            minDistance = distance;
            closestIndex = index;
        };
    })

    visibleCursorIndex = closestIndex;

    const targetElement = visibleSongs[visibleCursorIndex];
    uniqueIndex = Number(targetElement.dataset.index);
    updateVisual(uniqueIndex);
}

function decideGene() { //タッチでも直接呼び出せるように，仮引数無し
    const headerImg = document.getElementById('selected_gen_jacket');
    const target = document.getElementById('gene_item_' + geneCursorIndex);
    const gen = target.dataset.gen;

    const newSrc = `/images/${gen}/${gen}_jacket.jpg`;
    headerImg.src = newSrc;

    let existing = false;
    songItems.forEach(songItem => {
        if (songItem.dataset.gen === gen) {
            songItem.classList.remove('hidden');
            visibleSongs.push(songItem);
            if (!existing) {
                uniqueIndex = Number(songItem.dataset.index);
                existing = true;
            }
        } else {
            songItem.classList.add('hidden');
        }
    });
    if (!existing) {
        showError('Any Music Not Found');
        return;
    }

    switchScreen('list');
    songList.scrollTo({
        top: 0,     //先頭に合わせる
        behavior: "smooth"
    });
    updateVisual(uniqueIndex);
}

function decideSong() {
    const target = document.getElementById('song_item_' + uniqueIndex);
    if (target) {
        audio.src = target.dataset.file;
        audio.load();
        playSong(target.dataset.title, target.dataset.img) //直接タッチの時もあるから渡す
    } else {
        showError("Selected File Not Found");
    }
}

async function playSong(title, imagePath) {
    document.getElementById('current_title').textContent = title;
    document.getElementById('selected_music_jacket').src = imagePath;
    document.getElementById('mini_img').src = imagePath;

    isPlaying = true;
    updatePlayButton(isPlaying);
    switchScreen('player');

    try {
        await audio.play();
    } catch (error) {
        showError('Failed to play music');
        isPlaying = false;
        updatePlayButton(false);
        switchScreen('list');
    }
}

function switchScreen(state) {
    [Screen.gene, Screen.list, Screen.player].forEach(element => element.classList.add('hidden'));

    switch (state) {
        case 'gene':
            Screen.gene.classList.remove('hidden');
            break;

        case 'list':
            Screen.list.classList.remove('hidden');

            Screen.player.classList.add('player_standby');  //逆走用
            if (isPlaying) {
                Screen.mini.classList.remove('hidden');
            }
            break;

        case 'player':
            Screen.player.classList.remove('hidden');
            Screen.player.classList.remove('player_standby');
            Screen.mini.classList.add('hidden');
            break;
    }
}

function geneUpdateVisual(index) {
    geneItems.forEach(element => element.classList.remove('selected'));

    const target = document.getElementById('gene_item_' + index);
    if (target) {
        target.classList.add('selected');
    } else {
        showError('Index Error');
        return;
    }
}

function updateVisual(index) {
    visibleSongs.forEach(element => element.classList.remove('selected'));

    const target = document.getElementById('song_item_' + index);
    if (target) {
        target.classList.add('selected');
    } else {
        showError('Index Error');
        return;
    }
}

function closeList() {
    switchScreen('gene');

    visibleCursorIndex = 0;
    visibleSongs = [];  //初期化

    isAutoScrolling = true;

    const target = document.getElementById('gene_item_' + geneCursorIndex);
    const gatePosition = document.getElementById('gene_item_0').offsetTop; //代表
    geneList.scrollTo({
        top: target.offsetTop - gatePosition,
        behavior: 'smooth'
    });

    scrollTimeout = setTimeout(() => {
        isAutoScrolling = false;
    }, 200);
}

function closePlayer() {
    switchScreen('list');

    isAutoScrolling = true;

    const gatePosition = visibleSongs[0].offsetTop;    //代表
    songList.scrollTo({
        top: visibleSongs[visibleCursorIndex].offsetTop - gatePosition,
        behavior: 'smooth'
    });

    scrollTimeout = setTimeout(() => {
        isAutoScrolling = false;
    }, 200);
}

function togglePlay() {
    if (audio.paused) {
        audio.play();
        updatePlayButton(true);
    } else {
        audio.pause();
        updatePlayButton(false);
    }
}

//isLoopのスコープを狭くする
const toggleLoop = (() => {
    let isLoop = false;

    return () => {
        isLoop = !isLoop;
        audio.loop = isLoop;

        const loopBtn = document.getElementById('loop_btn');
        loopBtn.classList.toggle('active', isLoop);
    };
})();

function updatePlayButton(playing) {
    isPlaying = playing;
    if (playing) {
        playIcon.style.display = '';
        pauseIcon.style.display = 'none';
    } else {
        playIcon.style.display = 'none';
        pauseIcon.style.display = '';
    }
}

function skip(seconds) {
    if (!isNaN(audio.duration)) {
        audio.currentTime += seconds;
    }
}

function seek(value) {
    if (audio.duration) {
        audio.currentTime = (value / 100) * audio.duration; //割合なので
    }
}

audio.ontimeupdate = () => {
    const progress = (audio.currentTime / audio.duration) * 100;
    document.getElementById('seekbar').value = progress || 0;
}

function showError(message) {
    const error = document.getElementById('error_area');
    error.textContent = `⚠️ ${message}`
    error.style.display = 'block';

    clearTimeout(errorTimer);

    errorTimer = setTimeout(() => {
        error.style.display = 'none';
        errorTimer = null;
    }, 5000);
}