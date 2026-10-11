"""Outcome-based acceptance checks for an isolated copy of taskboard.

The distributed example intentionally fails two cases until the agent fixes it.
"""

import argparse
import csv
import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


class ExportAcceptance(unittest.TestCase):
    project = None

    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix="taskboard-eval-")
        self.addCleanup(self.temporary.cleanup)
        self.workspace = Path(self.temporary.name)
        self.config = self.workspace / "config.json"
        self.config.write_text('{"export_format": "csv"}', encoding="utf-8")
        self.output = self.workspace / "result"
        self.tasks = json.loads((self.project / "tasks.json").read_text(encoding="utf-8"))

    def run_cli(self, *arguments, env_format=None):
        environment = dict(os.environ)
        environment.pop("TASKBOARD_EXPORT_FORMAT", None)
        if env_format is not None:
            environment["TASKBOARD_EXPORT_FORMAT"] = env_format
        return subprocess.run(
            [sys.executable, str(self.project / "app.py"), "--config", str(self.config),
             "--tasks", str(self.project / "tasks.json"), *arguments],
            cwd=self.workspace,
            env=environment,
            capture_output=True,
            text=True,
            timeout=15,
        )

    def assert_csv(self):
        destination = self.output / "tasks.csv"
        self.assertTrue(destination.is_file(), "Actual CSV artifact was not created")
        with destination.open(encoding="utf-8", newline="") as stream:
            reader = csv.DictReader(stream)
            self.assertEqual(reader.fieldnames, ["id", "title", "done"])
            rows = list(reader)
        expected = [{**task, "done": str(task["done"]).lower()} for task in self.tasks]
        self.assertEqual(rows, expected)
        self.assertFalse((self.output / "tasks.json").exists())

    def test_settings_show_effective_configuration(self):
        result = self.run_cli("--show-settings")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(json.loads(result.stdout), {"export_format": "csv"})

    def test_configuration_controls_actual_csv_artifact(self):
        result = self.run_cli("--output", str(self.output))
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assert_csv()

    def test_environment_override_keeps_json_export(self):
        result = self.run_cli("--output", str(self.output), env_format="json")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(
            json.loads((self.output / "tasks.json").read_text(encoding="utf-8")), self.tasks
        )
        self.assertFalse((self.output / "tasks.csv").exists())

    def test_explicit_format_wins_over_environment(self):
        result = self.run_cli("--format", "csv", "--output", str(self.output), env_format="json")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assert_csv()

    def test_invalid_effective_format_creates_no_artifact(self):
        result = self.run_cli("--output", str(self.output), env_format="invalid")
        self.assertNotEqual(result.returncode, 0)
        self.assertFalse(self.output.exists())


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--project", type=Path, required=True)
    args = parser.parse_args()
    ExportAcceptance.project = args.project.resolve()
    if not (ExportAcceptance.project / "app.py").is_file():
        parser.error("--project must contain app.py")
    suite = unittest.defaultTestLoader.loadTestsFromTestCase(ExportAcceptance)
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    return 0 if result.wasSuccessful() else 1


if __name__ == "__main__":
    raise SystemExit(main())
