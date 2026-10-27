#!/usr/bin/env python3
"""Cached source-audio transcription and optional short forced alignment."""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys


def atomic_json(path: Path, data) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(path.name + '.tmp')
    temporary.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')
    temporary.replace(path)


def signature(path: Path) -> dict:
    stat = path.stat()
    return {'path': str(path.resolve()), 'bytes': stat.st_size, 'mtime_ns': stat.st_mtime_ns}


def log(message: str) -> None:
    print(message, file=sys.stderr, flush=True)


def cache_matches(out: Path, key: dict, force: bool) -> bool:
    if force or not out.exists():
        return False
    try:
        return json.loads(out.read_text(encoding='utf-8')).get('cache_key') == key
    except (ValueError, OSError):
        return False


def pcm_array(video: Path, directory: Path, start=0.0, end=None):
    import numpy as np
    if start < 0 or (end is not None and end <= start):
        raise ValueError('Range must satisfy 0 <= start < end.')
    key = {'source': signature(video), 'start': start, 'end': end, 'rate': 16000}
    digest = hashlib.sha256(json.dumps(key, sort_keys=True).encode()).hexdigest()[:16]
    raw = directory / f'.speech-{digest}.f32'
    directory.mkdir(parents=True, exist_ok=True)
    if not raw.exists():
        temporary = raw.with_suffix('.tmp')
        command = ['ffmpeg', '-v', 'error']
        if start:
            command += ['-ss', str(start)]
        command += ['-i', str(video), '-map', '0:a:0', '-vn']
        if end is not None:
            command += ['-t', str(end-start)]
        command += ['-ac', '1', '-ar', '16000', '-f', 'f32le', '-y', str(temporary)]
        subprocess.run(command, check=True)
        if temporary.stat().st_size == 0:
            raise ValueError('No audio samples decoded.')
        temporary.replace(raw)
    # Decode with FFmpeg rather than PyAV: avoids backend-version API mismatch.
    return np.memmap(raw, dtype=np.float32, mode='r')


def cached_model(request: str) -> str:
    if request != 'auto':
        return str(Path(request).expanduser()) if Path(request).expanduser().exists() else request
    root = Path(os.environ.get('HF_HUB_CACHE', os.environ.get('HUGGINGFACE_HUB_CACHE',
        str(Path(os.environ.get('HF_HOME', str(Path.home()/'.cache/huggingface')))/'hub'))))
    names = ['mobiuslabsgmbh/faster-whisper-large-v3-turbo',
             'Systran/faster-whisper-large-v3-turbo', 'Systran/faster-whisper-small',
             'Systran/faster-whisper-medium', 'Systran/faster-whisper-base']
    for name in names:
        repo = root / ('models--' + name.replace('/', '--'))
        candidates = []
        ref = repo/'refs/main'
        if ref.exists():
            candidates.append(repo/'snapshots'/ref.read_text().strip())
        if (repo/'snapshots').exists():
            candidates += sorted((repo/'snapshots').iterdir(), key=lambda p: p.stat().st_mtime, reverse=True)
        for candidate in candidates:
            if (candidate/'model.bin').is_file() and (candidate/'config.json').is_file():
                return str(candidate)
    log('No cached faster-whisper model found; the small model will be downloaded once.')
    return 'small'


def transcribe(args) -> None:
    source = Path(args.video).expanduser().resolve()
    out = Path(args.out).expanduser().resolve()
    if out.suffix.lower() != '.json' or out == source:
        raise ValueError('--out must be a separate .json analysis file.')
    if args.prompt_file and Path(args.prompt_file).resolve() in [out, out.with_suffix('.txt')]:
        raise ValueError('Analysis output would overwrite the prompt input.')
    prompt = Path(args.prompt_file).read_text(encoding='utf-8') if args.prompt_file else args.prompt
    key = {'source': signature(source), 'task': 'transcribe', 'model_request': args.model,
           'language': args.language, 'prompt': prompt, 'start': args.start, 'end': args.end}
    if cache_matches(out, key, args.force):
        print(json.dumps({'cached': True, 'output': str(out)}, ensure_ascii=False))
        return
    model_name = cached_model(args.model)
    try:
        import numpy as np
        from faster_whisper import WhisperModel
    except ImportError as error:
        raise SystemExit('Missing ASR dependencies. Reuse an existing environment or run:\n'
            'uv run --with faster-whisper --with numpy python speech.py transcribe ...') from error
    log(f'Transcribing {source.name} using {model_name}')
    model = WhisperModel(model_name, device='cpu', compute_type='int8', cpu_threads=args.threads)
    samples = pcm_array(source, out.parent, args.start, args.end)
    segments, info = model.transcribe(np.asarray(samples), language=args.language,
        beam_size=3, word_timestamps=True, condition_on_previous_text=False,
        vad_filter=False, initial_prompt=prompt)
    rows = []
    for segment in segments:
        rows.append({'start': round(args.start+segment.start, 4),
                     'end': round(args.start+segment.end, 4), 'text': segment.text,
                     'words': [{'start': round(args.start+w.start, 4),
                                'end': round(args.start+w.end, 4), 'word': w.word,
                                'probability': round(w.probability, 5)} for w in (segment.words or [])]})
        log(f'{rows[-1]["start"]:.2f}-{rows[-1]["end"]:.2f} {segment.text}')
    result = {'cache_key': key, 'source': str(source), 'model_used': model_name, 'language': info.language,
              'segments': rows, 'note': 'Recognition and word times are clues, not verified cuts.'}
    atomic_json(out, result)
    out.with_suffix('.txt').write_text('\n'.join(
        f'{row["start"]:09.3f} - {row["end"]:09.3f} {row["text"]}' for row in rows)+'\n', encoding='utf-8')
    print(json.dumps({'cached': False, 'segments': len(rows), 'output': str(out)}, ensure_ascii=False))


def align(args) -> None:
    source = Path(args.video).expanduser().resolve()
    cases_path = Path(args.cases).expanduser().resolve()
    cases = json.loads(cases_path.read_text(encoding='utf-8'))
    if not isinstance(cases, list) or not cases:
        raise ValueError('cases must be a non-empty JSON list.')
    for case in cases:
        if not (0 <= case['start'] < case['end'] and case['end']-case['start'] <= 30 and case['text'].strip()):
            raise ValueError('Each alignment case needs actual text and an audio range of 0-30 seconds.')
    out = Path(args.out).expanduser().resolve()
    if out.suffix.lower() != '.json' or out in [source, cases_path]:
        raise ValueError('--out must be a separate .json analysis file.')
    key = {'source': signature(source), 'task': 'align', 'model': args.model,
           'language': args.language, 'cases': cases}
    if cache_matches(out, key, args.force):
        print(json.dumps({'cached': True, 'output': str(out)}, ensure_ascii=False))
        return
    try:
        import numpy as np
        import torch
        import whisper
        from whisper.timing import find_alignment
        from whisper.tokenizer import get_tokenizer
    except ImportError as error:
        raise SystemExit('Optional alignment requires openai-whisper and Torch. '
            'Prefer the Python interpreter used by an existing whisper CLI; '
            'ordinary transcription does not need these packages.') from error
    torch.set_num_threads(args.threads)
    model = whisper.load_model(args.model, device='cpu')
    tokenizer = get_tokenizer(model.is_multilingual, language=args.language, task='transcribe')
    rows = []
    for case in cases:
        audio = np.asarray(pcm_array(source, out.parent, case['start'], case['end'])).copy()
        mel = whisper.log_mel_spectrogram(whisper.pad_or_trim(audio), n_mels=model.dims.n_mels)
        words = find_alignment(model, tokenizer, tokenizer.encode(case['text']), mel, len(audio)//160)
        row = {**case, 'words': [{'word': w.word, 'start': round(case['start']+w.start, 4),
                                 'end': round(case['start']+w.end, 4),
                                 'probability': round(float(w.probability), 5)} for w in words]}
        rows.append(row)
        log(f'Aligned {case["start"]:.2f}-{case["end"]:.2f}')
    atomic_json(out, {'cache_key': key, 'source': str(source), 'cases': rows,
        'note': 'Alignment is approximate; check original phonemes/tails at uncertain seams.'})
    print(json.dumps({'cached': False, 'cases': len(rows), 'output': str(out)}, ensure_ascii=False))


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest='command', required=True)
    t = commands.add_parser('transcribe', help='One cached independent ASR pass, optionally a short range')
    t.add_argument('video')
    t.add_argument('--out', required=True)
    t.add_argument('--model', default='auto')
    t.add_argument('--language', default='zh')
    prompt = t.add_mutually_exclusive_group()
    prompt.add_argument('--prompt', default='简体中文。')
    prompt.add_argument('--prompt-file')
    t.add_argument('--start', type=float, default=0.0)
    t.add_argument('--end', type=float)
    t.add_argument('--threads', type=int, default=min(8, os.cpu_count() or 1))
    t.add_argument('--force', action='store_true')
    t.set_defaults(function=transcribe)
    a = commands.add_parser('align', help='Optional forced alignment for a few <=30-second disputed seams')
    a.add_argument('video')
    a.add_argument('--cases', required=True)
    a.add_argument('--out', required=True)
    a.add_argument('--model', default='small')
    a.add_argument('--language', default='zh')
    a.add_argument('--threads', type=int, default=min(8, os.cpu_count() or 1))
    a.add_argument('--force', action='store_true')
    a.set_defaults(function=align)
    args = parser.parse_args()
    if args.threads < 1:
        parser.error('--threads must be positive.')
    try:
        args.function(args)
    except (ValueError, FileNotFoundError, subprocess.CalledProcessError) as error:
        raise SystemExit(str(error)) from error


if __name__ == '__main__':
    main()
