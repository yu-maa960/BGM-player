import os
import json
import re

MUSIC_DIR = "./music"
IMAGE_DIR = "./images"
OUTPUT_JSON = "./player.json"
TRANSLATION = "./title.txt"

title_map = {}  #フォルダ名，ファイル名の変換用辞書
playList = []

if os.path.exists(TRANSLATION):
    with open(TRANSLATION, "r", encoding="utf-8") as txt_file:  #日本語想定
        for line in txt_file:
            line = line.strip()
            if not line or "=" not in line:
                continue

            key, value = line.split("=")
            title_map[key.strip()] = value.strip()

if os.path.exists(MUSIC_DIR):
    for gen_folder in sorted(os.listdir(MUSIC_DIR)):    #世代数が10以上だとsort機能しない
        gen_path = os.path.join(MUSIC_DIR, gen_folder)

        if os.path.isdir(gen_path):
            gene_title = title_map.get(gen_folder, gen_folder)

            for file_name in sorted(os.listdir(gen_path)):
                if file_name.endswith(".mp3"):   #mp3のみ
                    file_path = f"{MUSIC_DIR}/{gen_folder}/{file_name}"
                    base_name = file_name.replace(".mp3", "")

                    if base_name in title_map:  #ファイル名の変換規則があるか確認
                        title_display = title_map[base_name]
                    else:
                        title_display = base_name

                    img_path = f"{IMAGE_DIR}/{gen_folder}/{base_name}.jpg"  #jacket名はファイル名と一緒にしなければいけない
                    if not os.path.exists(img_path):
                        img_path = f"{IMAGE_DIR}/{gen_folder}/{gen_folder}_jacket.jpg"  #代替するためにjacket画像は必ずいる

                    song_data = {
                        "title": title_display,
                        "generation": gen_folder,
                        "geneTitle": gene_title,
                        "filePath": file_path,
                        "imagePath": img_path
                    }
                    playList.append(song_data)

with open(OUTPUT_JSON, "w", encoding="utf-8") as f: #日本語想定
    json.dump(playList, f, ensure_ascii=False, indent=2)