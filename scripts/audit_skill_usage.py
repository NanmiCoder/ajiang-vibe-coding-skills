#!/usr/bin/env python3
"""Offline, conservative skill-load audit. Outputs aggregates, never conversations.

Skill calls and explicit SKILL.md reads are evidence of loading, not proof that
the instructions were followed. Shell searches, writes and bulk reads are omitted.
"""
import argparse
import collections
import datetime as dt
import json
from pathlib import Path
import re
import shlex
import sys


PATH_RE = re.compile(r"[^\s\"'`\\]+/SKILL\.md")
READ_RE = re.compile(r"(?:^|[;\n&|])\s*(?:cat|sed|head|tail|bat|more|less)\s+([^;\n&|]+)")


def inventory(home):
    aliases = {}
    for root in (home / '.codex/skills', home / '.claude/skills', home / '.agents/skills'):
        if not root.exists():
            continue
        for folder in sorted(root.iterdir()):
            path = folder / 'SKILL.md'
            if not path.is_file():
                continue
            match = re.search(r'^name:\s*([^\n]+)', path.read_text(errors='replace'), re.M)
            name = match.group(1).strip().strip('\"\'') if match else folder.name
            aliases[folder.name] = name
            aliases.setdefault(name, name)
    return aliases


def skill_from_path(path, aliases):
    # Require a skills tree; arbitrary project SKILL.md files are not installed skills.
    if '/skills/' not in path or not path.endswith('/SKILL.md'):
        return None
    folder = path.rsplit('/', 2)[-2]
    if '/skills/.system/' in path:
        return 'system:' + folder
    return aliases.get(folder, folder)


def loads(name, args, aliases):
    """Yield (skill, evidence type) from supported tool inputs only."""
    if not isinstance(args, dict):
        return []
    if name == 'Skill' and isinstance(args.get('skill'), str):
        skill = args['skill']
        return [(aliases.get(skill, skill), 'skill_call')]
    if name in ('Read', 'read_file', 'read_text_file'):
        skill = skill_from_path(args.get('file_path', args.get('path', '')), aliases)
        return [(skill, 'file_read')] if skill else []
    command = args.get('cmd', args.get('command', ''))
    if name in ('functions.exec', 'exec'):
        # Nested tool calls carry shell command strings in a JS object.
        code = args.get('code', '')
        quoted = re.findall(r'["\']?(?:cmd|command)["\']?\s*:\s*("(?:\\.|[^"\\])*"|\'(?:\\.|[^\'\\])*\'|`[^`]*`)', code)
        commands = []
        for value in quoted:
            if value.startswith('`') and '${' in value:
                continue
            try:
                commands.append(json.loads(value) if value.startswith('"') else value[1:-1])
            except json.JSONDecodeError:
                pass
        command = '\n'.join(commands)
    if not isinstance(command, str) or 'SKILL.md' not in command:
        return []
    paths = []
    for match in READ_RE.finditer(command):
        fragment = match.group(1)
        # Reads combined with redirects can create/replace skills; omit them.
        if '>' in fragment:
            continue
        try:
            tokens = shlex.split(fragment)
        except ValueError:
            tokens = PATH_RE.findall(fragment)
        paths.extend(token for token in tokens if token.endswith('/SKILL.md'))
    found = {skill_from_path(path, aliases) for path in paths} - {None}
    # Large batches commonly inspect catalogs or maintain skills, rather than use them.
    return [(skill, 'shell_read') for skill in sorted(found)] if len(found) <= 3 else []


def audit(home, since, until, exclude):
    aliases = inventory(home)
    stats = collections.defaultdict(lambda: {
        'sessions': set(), 'codex_sessions': set(), 'claude_sessions': set(),
        'recent_sessions': set(), 'skill_call_sessions': set(),
        'events': collections.Counter(), 'first': None, 'last': None,
    })
    roots = [('codex', home / '.codex/sessions'),
             ('codex', home / '.codex/archived_sessions'),
             ('claude', home / '.claude/projects')]
    seen_calls = set()
    counters = collections.Counter()
    evidence = []
    for platform, root in roots:
        for path in sorted(root.rglob('*.jsonl')):
            counters[platform + '_files'] += 1
            session = path.stem
            with path.open('rb') as stream:
                for line_number, raw in enumerate(stream, 1):
                    # Avoid parsing giant tool outputs and repeated injected catalogs.
                    candidate = (b'SKILL.md' in raw or b'"Skill"' in raw)
                    metadata = platform == 'codex' and b'"session_meta"' in raw[:250]
                    if not candidate and not metadata:
                        continue
                    try:
                        record = json.loads(raw)
                    except (ValueError, UnicodeDecodeError):
                        counters['malformed_candidate_lines'] += 1
                        continue
                    payload = record.get('payload', {})
                    if metadata and record.get('type') == 'session_meta':
                        session = payload.get('id', payload.get('session_id', session))
                        continue
                    calls = []
                    if platform == 'codex' and record.get('type') == 'response_item' and payload.get('type') in ('function_call', 'custom_tool_call'):
                        if payload['type'] == 'custom_tool_call':
                            args = {'code': payload.get('input', '')}
                        else:
                            args = payload.get('arguments', '{}')
                            try:
                                args = json.loads(args)
                            except (ValueError, TypeError):
                                args = {'code': args}  # freeform functions.exec
                        calls = [(payload.get('name'), args, payload.get('call_id', payload.get('id')))]
                    elif platform == 'claude' and record.get('type') == 'assistant':
                        session = record.get('sessionId', session)
                        content = record.get('message', {}).get('content', [])
                        if isinstance(content, list):
                            calls = [(b.get('name'), b.get('input', {}), b.get('id'))
                                     for b in content if isinstance(b, dict) and b.get('type') == 'tool_use']
                    if session in exclude:
                        continue
                    timestamp = record.get('timestamp', '')
                    try:
                        day = dt.datetime.fromisoformat(timestamp.replace('Z', '+00:00')).astimezone(dt.timezone(dt.timedelta(hours=8))).date().isoformat()
                    except (ValueError, AttributeError):
                        continue
                    if day > until:
                        continue
                    for name, args, call_id in calls:
                        found = loads(name, args, aliases)
                        if not found:
                            continue
                        identity = (platform, call_id) if call_id else (platform, session, line_number)
                        if identity in seen_calls:
                            counters['duplicate_load_calls'] += 1
                            continue
                        seen_calls.add(identity)
                        key = platform + ':' + session
                        for skill, kind in found:
                            s = stats[skill]
                            s['sessions'].add(key)
                            s[platform + '_sessions'].add(key)
                            if day >= since:
                                s['recent_sessions'].add(key)
                            if kind == 'skill_call':
                                s['skill_call_sessions'].add(key)
                            s['events'][kind] += 1
                            s['first'] = min(s['first'] or day, day)
                            s['last'] = max(s['last'] or day, day)
                            evidence.append({'skill': skill, 'kind': kind, 'day': day,
                                             'file': str(path), 'line': line_number,
                                             'session': session, 'call_id': call_id})
    rows = []
    for skill, values in stats.items():
        row = {'skill': skill}
        row.update({k: len(v) if isinstance(v, set) else dict(v) if isinstance(v, collections.Counter) else v
                    for k, v in values.items()})
        rows.append(row)
    rows.sort(key=lambda r: (-r['sessions'], r['skill']))
    return {'window': {'recent_since': since, 'until': until, 'timezone': 'Asia/Shanghai'},
            'scan': dict(counters), 'skills': rows}, evidence


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--home', type=Path, default=Path.home())
    parser.add_argument('--since', required=True, help='Recent window start, YYYY-MM-DD')
    parser.add_argument('--until', required=True, help='Last included date, YYYY-MM-DD')
    parser.add_argument('--exclude-session', action='append', default=[])
    parser.add_argument('--output', type=Path, required=True, help='Aggregate JSON output')
    parser.add_argument('--private-evidence', type=Path, help='Optional LOCAL file/line references; do not publish')
    args = parser.parse_args()
    for value in (args.since, args.until):
        dt.date.fromisoformat(value)
    result, evidence = audit(args.home.expanduser(), args.since, args.until, set(args.exclude_session))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    if args.private_evidence:
        args.private_evidence.parent.mkdir(parents=True, exist_ok=True)
        args.private_evidence.write_text(json.dumps(evidence, ensure_ascii=False, indent=2) + '\n')
        args.private_evidence.chmod(0o600)
    print(json.dumps(result['scan'], ensure_ascii=False), file=sys.stderr)


if __name__ == '__main__':
    main()
