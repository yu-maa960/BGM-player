let geneList;
let geneItems;
let geneCursorIndex = 0;
let songList;

let visibleSongs = [];  //選択した世代の曲のみを格納する
let visibleIndex = 0;   //visibleSongs内で選択している曲のindex(固有)
let currentCursorIndex = 0; //visibleSongs内でのindex(固有のindexではなく見かけ上)

let isAutoScrolling = false;

let errorTimer = null;

//jsonにgeneration,geneTitleは必須．
//代表世代画像必須,jpg
// jsonには，各曲ごとに配列でgeneration,geneTitle,Titlr,imagePath,filePath

//isPlayingの更新場所，currentCursorの更新
//songItem個々のimgpathはいるのか，その他も．各Item自身に持たせる必要性
fetch('../player.json')
    .then(response => response.json())
    .then(songs => {
        const seenGen = new Set();  //重複なし世代登録
        const representative_song = {}; //各世代の代表曲1つ用マップ

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
        
    });

function initGeneScreen(generations) {
    geneList = document.getElementById('gene_list');

    generations.forEach((gene, geneIndex) => {
        const geneItem = document.createElement('div');
        geneItem.className = 'gene_item';
        geneItem.id = `gene_item_${geneIndex}`;
        geneItem.dataset.index = geneIndex; //必要
        geneItem.dataset.gen = gene.generation; //必要

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

        songItem.dataset.index = startIndex;
        songItem.dataset.file = song.filePath;
        //songItem.dataset.title = song.title;
        //songItem.dataset.img = song.imagePath;
        songItem.dataset.gen = song.generation;
        //songItem.dataset.geneName = song.geneTitle;

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

    songList.addEventListener('scroll', TapCursor, {passive: true});
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

function geneMoveCoursor(direction) {
    
}

function geneTapCursor() {
    if (isAutoScrolling) {
        return;
    }

    if (geneItemsms.length === 0) {
        showError('Any folder not found');
        return;
    }

    const currentScroll = geneList.scrollTop;
    const gatePosition = geneItems[0].offsetTop;
    let nextIndex = 0;
    let minDistance = Infinity;

    geneItems.forEach((element, i) => {
        const elementPosition = element.offsetTop - gatePosition;
        const distance = Math.abs(currentScroll - elementPosition);
        if (distance < minDistance) {
            minDistance = distance;
            nextIndex = i;
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

function tapCursor() {
    
}

function decideGene() { //タッチでも直接呼び出せるように，仮引数無し
    const headerImg = document.getElementById('selected_gen_jacket');
    const target = document.getElementById('gene_item_' + geneCursorIndex);
    const gen = target.dataset.gen;

    const newSrc = `/images/${gen}/${gen}_jacket.jpg`;
    headerImg.src = newSrc;
    headerImg.style.display = 'block';  //一応

    let existing = false;
    songItems.forEach(songItem => {
        if (songItem.dataset.gen === gen) {
            songItem.classList.remove('hidden');
            visibleSongs.push(songItem); //だれ？
            if (!existing) {
                visibleIndex = Number(songItem.dataset.index);  //だれ？
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
    const gateOffset = window.innerHeight * 0.30 + 15;  //ジャケット直下
    songList.scrollTo({
        top: visibleSongs[currentCursorIndex].offsetTop - gateOffset,    //ジャケット直下が0になるようにする(合わせる)
        behavior: "smooth"
    });
    geneUpdateVisual(visibleIndex);
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
            if (isPlaying) {    //だれ？
                Screen.mini.classList.remove('hidden');
                //Screen.mini.style.display = 'block';
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