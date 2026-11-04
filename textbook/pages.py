"""Report the pages each Lesson uses in out/<name>.pdf (markers @@LESSONn@@)."""
import pypdf, re, sys
name = sys.argv[1] if len(sys.argv) > 1 else 'beginner'
r = pypdf.PdfReader(f'out/{name}.pdf')
starts = {}
for i, pg in enumerate(r.pages):
    for m in re.findall(r'@@LESSON(\w+?)@@', pg.extract_text()):
        starts[int(m) if m.isdigit() else m] = i + 1
end_page = starts.pop('END', None)
keys = sorted(starts, key=lambda k: starts[k])
bad = 0
for j, k in enumerate(keys):
    end = (starts[keys[j + 1]] - 1) if j + 1 < len(keys) else ((end_page - 1) if end_page else len(r.pages))
    n = end - starts[k] + 1
    bad += n != 2
    print(f'Lesson {str(k):>3}: p.{starts[k]}–{end} ({n} pages){"  ← not 2" if n != 2 else ""}')
print(f'{len(r.pages)} pages in total' + (f', {bad} lesson(s) not on 2 pages' if bad else ''))
