"""Small offline task exporter with an intentional configuration handoff bug."""

import argparse
import csv
import json
import os
import sys
from pathlib import Path

DEFAULT_FORMAT = "json"
FORMATS = {"json", "csv"}


def read_settings(config_path, explicit_format=None):
    settings = json.loads(Path(config_path).read_text(encoding="utf-8"))
    if not isinstance(settings, dict):
        raise ValueError("Configuration must be an object")
    chosen = settings.get("export_format", DEFAULT_FORMAT)
    if "TASKBOARD_EXPORT_FORMAT" in os.environ:
        chosen = os.environ["TASKBOARD_EXPORT_FORMAT"]
    if explicit_format is not None:
        chosen = explicit_format
    if not isinstance(chosen, str) or chosen not in FORMATS:
        raise ValueError("export_format must be json or csv")
    return {"export_format": chosen}


def write_export(tasks, output_dir, export_format=DEFAULT_FORMAT):
    output = Path(output_dir)
    output.mkdir(parents=True, exist_ok=True)
    destination = output / ("tasks." + export_format)
    if export_format == "csv":
        with destination.open("w", encoding="utf-8", newline="") as stream:
            writer = csv.DictWriter(stream, fieldnames=["id", "title", "done"])
            writer.writeheader()
            for task in tasks:
                writer.writerow({**task, "done": str(task["done"]).lower()})
    else:
        destination.write_text(
            json.dumps(tasks, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )
    return destination


def main(argv=None):
    parser = argparse.ArgumentParser(description="Export a local task board")
    parser.add_argument("--config", required=True)
    parser.add_argument("--tasks", default=str(Path(__file__).with_name("tasks.json")))
    parser.add_argument("--format", choices=sorted(FORMATS))
    parser.add_argument("--output")
    parser.add_argument("--show-settings", action="store_true")
    args = parser.parse_args(argv)
    try:
        settings = read_settings(args.config, args.format)
        if args.show_settings:
            print(json.dumps(settings))
            return 0
        if args.output is None:
            parser.error("--output is required for export")
        tasks = json.loads(Path(args.tasks).read_text(encoding="utf-8"))
        destination = write_export(tasks, args.output)
    except (OSError, ValueError, TypeError) as error:
        print("Taskboard error: " + str(error), file=sys.stderr)
        return 2
    print(str(destination))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
