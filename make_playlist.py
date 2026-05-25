import os
import json
import re

AUDIO_DIR = "./music"
IMAGE_DIR = "./images"
OUTPUT_JSON = "./player.json"
MASTER_TXT = "./titles.txt"

master_map = {}#フォルダ名，ファイル名の変換用辞書
playlist = []

if os.path.exists(MASTER_TXT):
    with open(MASTER_TXT, "r", encoding="utf-8") as txt_file:
        for line in txt_file:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=")
            master_map[key.strip()] = value.strip()

if os.path.exists(AUDIO_DIR):
    for gen_folder in sorted(os.listdir(AUDIO_DIR)):
        gen_path = os.path.join(AUDIO_DIR, gen_folder)#文字列繋げる

        if os.path.isdir(gen_path):#今見ているdirの中に入る
            gene_title = master_map.get(gen_folder, gen_folder)

            for file_name in sorted(os.listdir(gen_path)):
                if file_name.endswith(".mp3"):
                    file_path = f"{AUDIO_DIR}/{gen_folder}/{file_name}"
                    base_name = file_name.replace(".mp3", "")

                    if base_name in master_map:
                        title_display = master_map[base_name]
                    else:
                        title_display = re.sub(r"^\d+_", "", base_name)#文字列を綺麗にしている

                    img_path = f"{IMAGE_DIR}/{gen_folder}/{base_name}.jpg"
                    if not os.path.exists(img_path):
                        img_path = f"{IMAGE_DIR}/{gen_folder}/{gen_folder}_jacket.jpg"

                    song_data = {
                        "generation": gen_folder,
                        "geneTitle": gene_title,
                        "title": title_display,
                        "imagePath": img_path,
                        "filePath": file_path
                    }
                    playlist.append(song_data)

with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
    json.dump(playlist, f, ensure_ascii=False, indent=2)