## **BGM-player**
### 概要
BGM-player-prototype では，`Spring Boot(Java)`を用いた音楽配信プレイヤーを作成しました．
しかし，自分が音楽アプリとしてどこでも使うとなると，常時サーバーにすることができる機器が必要でした．  
前プロジェクトの目的では，作成したBGM-player-prototypeを自分のマイコンに流用し，常時サーバーとさせようと計画してましたが，コスト+周囲の環境的に実現できなさそうなので，本プロジェクトでは静的Webアプリケーションへ変えてみました．  
具体的な変更点は以下の通りです．
* `Java`による`Spring Boot`の動的Webアプリケーションの削除．
* `Python`による`json`形式のデータ生成．
* `Java Script`による`html`要素の生成．

前プロジェクトから引き継ぎ，`titles.txt`にファイル変更規則(`=`で繋げる)ことによる曲名の日本語表示，特定のディレクトリに曲，画像を入れることで`json`ファイルが更新される形式，各曲のジャケット画像がない場合は親ディレクトリの画像を表示する形式です．
基本的にはスマートフォン用に作っています．

---

### 注意事項
* titles.txtは無記入でも可能．
* 画像フォルダ`images`,音声フォルダ`music`の中に必ずフォルダを作り，その中に曲や画像を入れる．
* `json`ファイルを更新するために，`make_playlist.py`の実行を行う．
* `.gitignore`を消さない(著作権考慮)．

---

### 使い方
#### 1. このリポジトリを，ご自身のローカルPCにクローンしてください．
#### 2. `images`,`music`フォルダにそれぞれ同じ名前のカテゴリ名フォルダを作成し，その中に曲，画像を入れる．
```text
music-web/
├── music/
│   └── category_name/            (カテゴリ名)
│       ├── music1.mp3  (曲名)
│       └── music2.mp3
└── images/
    └── category_name/
        ├── music1.jpg  (曲と同じファイル名)
        ├── music2.jpg
        └── category_name_jacket.jpg (フォルダ共通ジャケット，フォルダと同じ名前)
```
#### 3. `titles.txt`の編集
```text
category_name=ポケモン
music1=戦闘BGM
```
#### 4. `make_playlist.py`の実行
#### 5. GitHubにて空のリポジトリを**`private`**で作成し，フォルダを丸ごと`push`
#### 6. Vercelと連携して`Deploy`

---

### 開発者
* **Name**: Yuma Yoshimura(yu-maa960)
* **GitHub**: [yu-maa960](https://github.com/yu-maa960)

### ライセンス
Copyright (c) 2026 Yuma Yoshimura This project is licensed under the MIT License.
