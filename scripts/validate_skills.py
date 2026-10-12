"""Validate this repository's five independently installable ajiang skills offline.

Python 3.9+, standard library only. Validates our single-line metadata subset,
local resource boundaries and README assets; not a general YAML/secret scanner.
"""

import argparse
import re
import xml.etree.ElementTree as ET
from pathlib import Path

EXPECTED = {
    "ajiang-debug", "ajiang-review", "ajiang-feature", "ajiang-ablation", "ajiang-git-commit-pr",
}


def local_links(text):
    targets = re.findall(r"\]\(([^)]+)\)", text)
    targets += re.findall(r"<(?:img|a)\b[^>]*(?:src|href)=[\"']([^\"']+)[\"']", text)
    return [target.split("#", 1)[0] for target in targets
            if not re.match(r"https?://|mailto:|#", target)]


def validate_skill(folder):
    errors = []
    entry = folder / "SKILL.md"
    if not entry.is_file():
        return [str(folder.name) + ": missing SKILL.md"]
    content = entry.read_text(encoding="utf-8")
    match = re.match(r"\A---\n(.*?)\n---\n", content, re.S)
    if not match:
        return [folder.name + ": missing frontmatter"]
    fields = {}
    for line in match.group(1).splitlines():
        item = re.fullmatch(r"(name|description|license): ([^\n]+)", line)
        if not item or item.group(1) in fields:
            errors.append(folder.name + ": invalid or duplicate single-line metadata")
        else:
            fields[item.group(1)] = item.group(2)
    name = fields.get("name", "")
    if not re.fullmatch(r"ajiang-[a-z]+(?:-[a-z]+)*", name) or name != folder.name or len(name) > 64:
        errors.append(folder.name + ": invalid ajiang name or folder mismatch")
    if not 1 <= len(fields.get("description", "")) <= 1024:
        errors.append(folder.name + ": description must be 1..1024 characters")
    if fields.get("license") != "MIT" or not (folder / "LICENSE").is_file():
        errors.append(folder.name + ": missing MIT license")
    for path in folder.rglob("*"):
        if path.is_symlink():
            errors.append(folder.name + ": symlink is not standalone")
        if path.is_file() and path.suffix == ".md":
            text = path.read_text(encoding="utf-8")
            if re.search(r"/Users/|/home/|[A-Z]:\\Users\\|\[TODO:", text):
                errors.append(folder.name + ": personal path or unfinished scaffold")
            for target in local_links(text):
                destination = (path.parent / target).resolve()
                if folder.resolve() not in destination.parents:
                    errors.append(folder.name + ": link leaves standalone skill: " + target)
                elif not destination.is_file():
                    errors.append(folder.name + ": missing resource: " + target)
    return errors


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument("--skill", type=Path, help="Validate one independently installed skill")
    args = parser.parse_args()
    root = args.root.resolve()
    if args.skill:
        errors = validate_skill(args.skill.resolve())
    else:
        folders = sorted(path for path in (root / "skills").iterdir() if path.is_dir())
        names = {path.name for path in folders}
        errors = []
        if names != EXPECTED:
            errors.append("Skill set differs: " + str(names.symmetric_difference(EXPECTED)))
        for folder in folders:
            errors.extend(validate_skill(folder))
            if (folder / "LICENSE").is_file() and (root / "LICENSE").is_file():
                if (folder / "LICENSE").read_bytes() != (root / "LICENSE").read_bytes():
                    errors.append(folder.name + ": standalone license differs")
        for path in root.rglob("*.md"):
            if ".git" in path.parts:
                continue
            for target in local_links(path.read_text(encoding="utf-8")):
                destination = (path.parent / target).resolve()
                if root not in destination.parents:
                    errors.append("Repository link escapes root: " + target)
                elif not destination.exists():
                    errors.append("Broken repository link: " + target)
        for asset in (root / "assets/readme").glob("*.svg"):
            try:
                svg = ET.parse(asset).getroot()
                tags = {node.tag.rsplit("}", 1)[-1] for node in svg.iter()}
                if "viewBox" not in svg.attrib or not {"title", "desc"}.issubset(tags):
                    errors.append(asset.name + ": missing SVG accessibility metadata")
                if {"script", "foreignObject"}.intersection(tags):
                    errors.append(asset.name + ": unsupported SVG content")
            except ET.ParseError:
                errors.append(asset.name + ": invalid SVG")
    for error in errors:
        print("FAIL: " + error)
    if errors:
        return 1
    print("PASS: five ajiang skills, metadata, standalone resources, local links and README assets")
    print("Actual CLI install and model behavior are separate verification layers.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
