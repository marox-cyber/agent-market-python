from pathlib import Path
import zipfile
root = Path(__file__).resolve().parent.parent
paths = ['lib', 'web', 'worker', 'scripts', 'test', 'data/snapshot.json', 'data/deployment.json', 'README.md', 'LICENSE', 'package.json', 'SUBMISSION.md', '.github']
with zipfile.ZipFile(root / 'artifacts/stoa-flow-source.zip', 'w', zipfile.ZIP_DEFLATED) as z:
    for name in paths:
        p = root / name
        files = sorted(p.rglob('*')) if p.is_dir() else [p]
        for f in files:
            if f.is_file() and '__pycache__' not in str(f):
                z.write(f, 'stoa-flow/' + str(f.relative_to(root)))
    z.writestr('stoa-flow/.openai/hosting.json', '{"project_id":"REPLACE_WITH_YOUR_SITE_ID"}\n')
