"""Extract chapters 1–4.7 of the textbook into src/data/math/statements.json.

Book pages 6–73 (PDF page = book page + 1). The text layer is FineReader;
cyrillic letters are cp1251 bytes exposed as latin-1, while math symbols are
real Unicode. This script keeps both.
"""
from __future__ import annotations

import json
import os
import re
import fitz

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PDF = next(f for f in os.listdir(ROOT) if f.endswith(".pdf"))
# Book pages inclusive. 4.8 starts on book page 74.
BOOK_FROM = 6
BOOK_TO = 73

HEAD_RE = re.compile(
    r"^(Определение|Теорема|Лемма|Следствие|Пример|Замечание|Задача|Аксиома|Принцип)"
    r"(?:\s+(\d+(?:\.\d+)?[′'ʼ\u2032]?))?"
    r"(?:\s*\(([^)\n]{1,100})\))?"
    r"(?:\s*[.\:])?\s*(.*)$"
)
SECTION_RE = re.compile(r"^(\d+(?:\.\d+)*)\.\s+(\S.{0,120})$")
MENTION_RE = re.compile(
    r"(теорем[а-я]*|лемм[а-я]*|следстви[а-я]*|аксиом[а-я]*|принцип[а-я]*)\s+(\d+(?:\.\d+)?[′'ʼ\u2032]?)",
    re.IGNORECASE,
)
KIND = {
    "Определение": "definition",
    "Теорема": "theorem",
    "Лемма": "lemma",
    "Следствие": "corollary",
    "Пример": "example",
    "Замечание": "remark",
    "Задача": "exercise",
    "Аксиома": "axiom",
    "Принцип": "principle",
}
PREFIX = {
    "definition": "def",
    "theorem": "thm",
    "lemma": "lem",
    "corollary": "cor",
    "example": "ex",
    "remark": "rem",
    "exercise": "task",
    "axiom": "ax",
    "principle": "prin",
    "prose": "prose",
}


def fix_char(ch: str) -> str:
    o = ord(ch)
    if 128 <= o <= 255:
        return bytes([o]).decode("cp1251")
    return ch


def fix(text: str) -> str:
    text = "".join(fix_char(ch) for ch in text)
    text = text.replace("\u0455", "«").replace("\u0457", "»")
    text = text.replace(" Ч ", " × ")
    text = re.sub(r"[\u0000-\u0008\u000b\u000c\u000e-\u001f]", " — ", text)
    text = text.replace("\u00ad", "")
    return text


def join_hyphens(text: str) -> str:
    text = re.sub(r"([А-Яа-яЁёA-Za-z])-\n([А-Яа-яЁёa-z])", r"\1\2", text)
    text = re.sub(r"(Теорема|Лемма|Следствие|Определение)\s*\n\s*(\d)", r"\1 \2", text)
    return text


def clean_page(text: str, book_page: int) -> str:
    text = join_hyphens(fix(text))
    lines = []
    for line in text.splitlines():
        stripped = line.strip()
        if stripped == str(book_page):
            continue
        if not stripped:
            lines.append("")
            continue
        lines.append(stripped)
    # collapse extra blanks
    out = []
    blank = False
    for line in lines:
        if not line:
            if not blank:
                out.append("")
            blank = True
        else:
            out.append(line)
            blank = False
    return "\n".join(out).strip()


def is_section(line: str) -> re.Match[str] | None:
    match = SECTION_RE.match(line)
    if not match:
        return None
    if HEAD_RE.match(line):
        return None
    title = match.group(2)
    if len(line) > 90:
        return None
    if title[:1].islower():
        return None
    return match


def heading(line: str) -> re.Match[str] | None:
    if line.startswith("Критерий ") and not re.match(r"^Критерий\s+\d", line):
        return None
    return HEAD_RE.match(line)


def main() -> None:
    doc = fitz.open(os.path.join(ROOT, PDF))
    pages: list[tuple[int, str]] = []
    fig_dir = os.path.join(ROOT, "public", "book")
    os.makedirs(fig_dir, exist_ok=True)
    for book_page in range(BOOK_FROM, BOOK_TO + 1):
        index = book_page  # PDF index 6 == book page 6
        raw = doc[index].get_text("text")
        pages.append((book_page, clean_page(raw, book_page)))
        pix = doc[index].get_pixmap(matrix=fitz.Matrix(1.35, 1.35), alpha=False)
        pix.save(os.path.join(fig_dir, f"p{book_page:03d}.jpg"), jpg_quality=72)

    section_id = "1"
    section_title = "Действительные числа"
    chunks: list[dict] = []

    def push(kind: str, number: str | None, name: str, title_rest: str, page: int, pages: list[int], lines: list[str]) -> None:
        body = "\n".join(lines).strip()
        if not body:
            return
        chunks.append(
            {
                "kind": kind,
                "number": number,
                "name": name,
                "titleRest": title_rest.strip(" ."),
                "bookPage": page,
                "bookPages": pages,
                "sectionId": section_id,
                "sectionTitle": section_title,
                "text": body,
            }
        )

    current: dict | None = None
    buf: list[str] = []

    def flush() -> None:
        nonlocal current, buf
        if current is None:
            buf = []
            return
        push(current["kind"], current["number"], current["name"], current["titleRest"], current["page"], sorted(current["pages"]), buf)
        current = None
        buf = []

    for book_page, text in pages:
        for line in text.splitlines():
            if not line:
                if current is not None:
                    buf.append("")
                continue
            sec = is_section(line)
            head = heading(line)
            if sec and not head:
                flush()
                section_id = sec.group(1)
                section_title = sec.group(2).rstrip(".")
                push("prose", None, "Раздел", section_title, book_page, [book_page], [line])
                continue
            if head:
                flush()
                current = {
                    "kind": KIND[head.group(1)],
                    "number": head.group(2),
                    "name": head.group(1),
                    "titleRest": " ".join(part for part in (head.group(3) or "", head.group(4) or "") if part).strip(),
                    "page": book_page,
                    "pages": {book_page},
                }
                buf = [line]
                continue
            if current is None:
                current = {
                    "kind": "prose",
                    "number": None,
                    "name": "Текст",
                    "titleRest": "",
                    "page": book_page,
                    "pages": {book_page},
                }
                buf = [line]
            else:
                current["pages"].add(book_page)
                buf.append(line)
    flush()

    used: set[str] = set()
    counters: dict[str, int] = {}
    statements = []
    for chunk in chunks:
        kind = chunk["kind"]
        number = chunk["number"]
        if number and kind in {"theorem", "lemma", "corollary", "definition", "axiom", "principle"}:
            base = f"{PREFIX[kind]}-{number.replace('′', 'p').replace(chr(0x2032), 'p').replace(chr(0x02BC), 'p')}"
        else:
            key = f"{kind}-{chunk['sectionId']}"
            counters[key] = counters.get(key, 0) + 1
            base = f"{PREFIX[kind]}-{chunk['sectionId']}-{counters[key]}"
        ident = base
        n = 2
        while ident in used:
            ident = f"{base}-{n}"
            n += 1
        used.add(ident)
        title = chunk["titleRest"] or chunk["name"]
        if number and chunk["name"] not in title:
            title = f"{chunk['name']} {number}" + (f". {chunk['titleRest']}" if chunk["titleRest"] else "")
        elif chunk["kind"] != "prose":
            title = chunk["name"] + (f". {chunk['titleRest']}" if chunk["titleRest"] else "")
        statements.append(
            {
                "id": ident,
                "kind": kind,
                "number": number,
                "title": re.sub(r"\s+", " ", title).strip(" ."),
                "sectionId": chunk["sectionId"],
                "sectionTitle": chunk["sectionTitle"],
                "bookPage": chunk["bookPage"],
                "bookPages": chunk["bookPages"],
                "text": chunk["text"],
            }
        )

    by_number: dict[tuple[str, str], str] = {}
    for item in statements:
        if item["number"]:
            by_number[(item["kind"], item["number"])] = item["id"]

    kind_by_word = {
        "теорем": "theorem",
        "лемм": "lemma",
        "следстви": "corollary",
        "аксиом": "axiom",
        "принцип": "principle",
    }
    for item in statements:
        mentions = []
        for match in MENTION_RE.finditer(item["text"]):
            word = match.group(1).lower()
            number = match.group(2)
            kind = next((value for key, value in kind_by_word.items() if word.startswith(key)), None)
            if not kind:
                continue
            target = by_number.get((kind, number))
            if target and target != item["id"] and target not in mentions:
                mentions.append(target)
        item["mentions"] = mentions
        item["dependsOn"] = []

    out = os.path.join(ROOT, "src", "data", "math", "statements.json")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "w", encoding="utf-8") as handle:
        json.dump(statements, handle, ensure_ascii=False, indent=2)

    catalog = os.path.join(ROOT, "_pages", "catalog.txt")
    os.makedirs(os.path.dirname(catalog), exist_ok=True)
    lines = []
    for item in statements:
        if item["kind"] == "prose" and len(item["text"]) < 40:
            continue
        lines.append(
            f"{item['id']}\t{item['kind']}\t{item['number'] or ''}\tp{item['bookPage']}\t{item['sectionId']}\t{item['title'][:110]}"
        )
    with open(catalog, "w", encoding="utf-8") as handle:
        handle.write("\n".join(lines))
    print(f"statements {len(statements)} chars {sum(len(s['text']) for s in statements)}")


if __name__ == "__main__":
    main()
