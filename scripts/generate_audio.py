#!/usr/bin/env python3
"""Prepare a static MP3 audiobook from story data for genuine HTMLAudio playback."""
import asyncio
import json
import os
import pathlib
import re
import subprocess
import tempfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / "audio"
OUT.mkdir(exist_ok=True)
VOICE = os.getenv("STORY_VOICE", "vi-VN-NamMinhNeural")

def load_stories():
    js = """
const vm=require('vm'),fs=require('fs');
const context={window:{}};
vm.runInNewContext(fs.readFileSync('stories.js','utf8'),context);
console.log(JSON.stringify(context.window.NHI_STORIES));
"""
    result = subprocess.check_output(["node", "-e", js], cwd=ROOT, text=True)
    return json.loads(result)

def spoken_text(story):
    segments = []
    for scene in story["scenes"]:
        if scene["type"] == "scene":
            segments.append(" " + scene["text"] + ". ")
        elif scene["type"] == "system":
            segments.append(" Thông báo hệ thống. " + scene["text"].replace("XP", "điểm kinh nghiệm") + ". ")
        elif scene["type"] == "clinical":
            segments.append(" Kiến thức lâm sàng cần nhớ. " + scene["text"] + ". ")
        else:
            segments.append(scene["text"])
    return re.sub(r"\s+", " ", " ".join(segments)).strip()

def chunks(text, max_len=1800):
    pieces = re.split(r'(?<=[.!?。！？;:])\s+', text)
    result, current = [], ""
    for piece in pieces:
        if len(piece) > max_len:
            if current:
                result.append(current.strip())
                current = ""
            for start in range(0, len(piece), max_len):
                result.append(piece[start:start+max_len].strip())
        elif len(current) + len(piece) + 1 <= max_len:
            current += " " + piece
        else:
            result.append(current.strip())
            current = piece
    if current.strip():
        result.append(current.strip())
    return result

async def synthesize(text, path, edge_tts):
    error = None
    for attempt in range(3):
        try:
            if edge_tts is None:
                raise RuntimeError("edge-tts unavailable")
            speak = edge_tts.Communicate(text=text, voice=VOICE, rate="-5%")
            await speak.save(str(path))
            if path.stat().st_size < 200:
                raise ValueError("empty TTS output")
            return "neural"
        except Exception as exc:
            error = exc
            await asyncio.sleep(2*(attempt+1))
    # Fallback ensures MP3 exists even if network TTS is unavailable.
    wav = path.with_suffix(".wav")
    subprocess.run(["espeak-ng", "-v", "vi-sgn", "-s", "145", "-w", str(wav), text],
                   check=True, stdout=subprocess.DEVNULL)
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
                    "-i", str(wav), "-ar", "24000", "-ac", "1", "-b:a", "56k", str(path)],
                   check=True)
    wav.unlink(missing_ok=True)
    print("  fallback voice due to:", str(error)[:160], flush=True)
    return "fallback"

async def build_one(story, edge_tts):
    target = OUT / (story["id"] + ".mp3")
    parts = chunks(spoken_text(story))
    manifest = []
    with tempfile.TemporaryDirectory() as tmp:
        temp = pathlib.Path(tmp)
        for n, piece in enumerate(parts):
            original = temp / f"raw_{n:03d}.mp3"
            normalized = temp / f"audio_{n:03d}.mp3"
            mode = await synthesize(piece, original, edge_tts)
            subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
                            "-i", str(original), "-ar", "24000", "-ac", "1",
                            "-b:a", "56k", str(normalized)], check=True)
            manifest.append(normalized)
            print(f"    segment {n+1}/{len(parts)}: {mode}", flush=True)
        list_file = temp / "concat.txt"
        list_file.write_text("\n".join("file '" + str(p) + "'" for p in manifest),
                             encoding="utf-8")
        subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
                        "-f", "concat", "-safe", "0", "-i", str(list_file),
                        "-c", "copy", str(target)], check=True)
    print("DONE", story["id"], target.stat().st_size, "bytes", flush=True)

async def main():
    try:
        import edge_tts
    except ImportError:
        edge_tts = None
    for story in load_stories():
        print("BUILD", story["number"], story["id"], flush=True)
        await build_one(story, edge_tts)
    print("AUDIO_READY", len(list(OUT.glob("*.mp3"))), flush=True)

if __name__ == "__main__":
    asyncio.run(main())
