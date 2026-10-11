"""Small fixtures for evidence filtering and replay deduplication; no private data."""
import json
from pathlib import Path
import tempfile
import unittest

from audit_skill_usage import audit, loads


class AuditTests(unittest.TestCase):
    aliases = {'taste-skill': 'design-taste-frontend'}

    def test_load_forms_and_alias(self):
        path = '/home/example/.codex/skills/taste-skill/SKILL.md'
        self.assertEqual(loads('Skill', {'skill': 'taste-skill'}, self.aliases),
                         [('design-taste-frontend', 'skill_call')])
        self.assertEqual(loads('Read', {'file_path': path}, self.aliases),
                         [('design-taste-frontend', 'file_read')])
        for key in ('cmd', '"cmd"'):
            code = 'text(await tools.exec_command({' + key + ':' + json.dumps('cat ' + path) + '}));'
            self.assertEqual(loads('exec', {'code': code}, self.aliases),
                             [('design-taste-frontend', 'shell_read')])

    def test_omit_search_write_bulk_and_dynamic_command(self):
        path = '/home/example/.codex/skills/taste-skill/SKILL.md'
        for command in ('rg SKILL.md ~/.codex/skills', 'ls ' + path, 'cat > ' + path,
                        'cat ' + ' '.join('/x/skills/' + str(i) + '/SKILL.md' for i in range(4))):
            self.assertEqual(loads('Bash', {'command': command}, self.aliases), [])
        self.assertEqual(loads('exec', {'code': 'tools.exec_command({cmd:`cat ${path}/SKILL.md`})'}, self.aliases), [])

    def test_log_formats_replay_catalog_cutoff_and_timezone(self):
        with tempfile.TemporaryDirectory() as tmp:
            home = Path(tmp)
            root = home / '.codex/sessions'
            root.mkdir(parents=True)
            call = {'type': 'response_item', 'timestamp': '2026-10-10T20:00:00Z',
                    'payload': {'type': 'custom_tool_call', 'name': 'exec', 'call_id': 'original',
                                'input': 'tools.exec_command({cmd:"cat /x/skills/taste-skill/SKILL.md"})'}}
            catalog = {'type': 'response_item', 'timestamp': call['timestamp'],
                       'payload': {'type': 'message', 'role': 'developer',
                                   'content': '/x/skills/catalog-only/SKILL.md'}}
            standard = {'type': 'response_item', 'timestamp': call['timestamp'],
                        'payload': {'type': 'function_call', 'name': 'exec_command', 'call_id': 'standard',
                                    'arguments': json.dumps({'cmd': 'cat /x/skills/other/SKILL.md'})}}
            future = json.loads(json.dumps(standard))
            future['timestamp'] = '2026-10-12T00:00:00Z'
            future['payload']['call_id'] = 'future'
            for session, items in [('a', [call, call, catalog, standard, future]), ('fork', [call])]:
                meta = {'type': 'session_meta', 'payload': {'id': session}}
                (root / (session + '.jsonl')).write_text('\n'.join(json.dumps(x) for x in [meta] + items) + '\n')
            claude = home / '.claude/projects/example'
            claude.mkdir(parents=True)
            claude_call = {'type': 'assistant', 'sessionId': 'c', 'timestamp': call['timestamp'],
                           'message': {'content': [{'type': 'tool_use', 'id': 'skill', 'name': 'Skill',
                                                    'input': {'skill': 'taste-skill'}}]}}
            (claude / 'c.jsonl').write_text(json.dumps(claude_call) + '\n')
            result, evidence = audit(home, '2026-10-11', '2026-10-11', set())
            rows = {r['skill']: r for r in result['skills']}
            self.assertEqual(set(rows), {'taste-skill', 'other'})
            self.assertEqual(rows['taste-skill']['sessions'], 2)
            self.assertEqual(rows['taste-skill']['recent_sessions'], 2)
            self.assertEqual(rows['taste-skill']['events'], {'shell_read': 1, 'skill_call': 1})
            self.assertEqual(result['scan']['duplicate_load_calls'], 2)
            self.assertEqual({e['day'] for e in evidence}, {'2026-10-11'})
            filtered, _ = audit(home, '2026-10-11', '2026-10-11', {'a', 'fork'})
            self.assertEqual(filtered['skills'][0]['sessions'], 1)


if __name__ == '__main__':
    unittest.main()
