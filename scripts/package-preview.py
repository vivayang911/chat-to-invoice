"""Allowlisted local trial archive. Does not publish or contact model/payment APIs."""
from pathlib import Path
import hashlib
import json
import os
import shutil
import socket
import subprocess
import tempfile
import time
import urllib.request
import zipfile
from datetime import datetime, timezone

root = Path(__file__).resolve().parent.parent
stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
private = root / 'work'
private.mkdir(exist_ok=True)
stage = Path(tempfile.mkdtemp(prefix='preview-stage-', dir=private)) / 'chat-to-invoice'
stage.mkdir()
files = [Path(x) for x in ['README.md', 'LICENSE', 'package.json', '.gitignore',
         'agnes-model.env.example', 'paypal-sandbox.env.example',
         'scripts/parse-model-json.mjs', 'scripts/parse-model-json.test.mjs',
         'scripts/evaluate-app-model.mjs', 'scripts/package-preview.py',
         'scripts/check-separate-confirmation.cjs', 'scripts/check-stability-ui.cjs', 'scripts/check-recovery-navigation.cjs', 'scripts/evaluate-chronology-probes.mjs',
         'scripts/check-expiry-uncertainty.cjs', 'scripts/check-buyer-link-navigation.cjs', 'scripts/check-itemized-statement.cjs', 'scripts/check-message-withdrawal.cjs',
         'scripts/check-acknowledgement-recovery.cjs',
         'scripts/check-statement-session.cjs', 'scripts/check-release-flow.cjs', 'scripts/browser-runtime.cjs',
         'docs/submission/ACCEPTANCE-AND-DELIVERY.md', 'docs/submission/RELEASE-STATUS.json',
         'docs/submission/PROJECT.md', 'docs/submission/MANUAL-DEMO-RECORD.md', 'docs/submission/DEMO-SCRIPT.md',
         'docs/submission/USER-TRIAL.md', 'docs/submission/QUICKSTART.md']]
files += [p.relative_to(root) for p in sorted((root / 'src').rglob('*')) if p.is_file()]

# Compare against local credential values in memory. Never print values or include env files.
credential_values = []
for name in ['agnes-model.env', 'paypal-sandbox.env', 'ai-model.env']:
    source = private / name
    if source.exists():
        for line in source.read_text(encoding='utf-8-sig').splitlines():
            key, sep, value = line.partition('=')
            if sep and key.strip() in ['AGNES_API_KEY', 'PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET', 'ZHIPU_API_KEY']:
                value = value.strip().strip('"\'')
                if len(value) >= 20 and not value.startswith('replace_'):
                    credential_values.append(value.encode())
manifest = []
for relative in files:
    source = (root / relative).resolve()
    source.relative_to(root)
    content = source.read_bytes()
    if any(value in content for value in credential_values):
        raise RuntimeError('Credential match in allowlisted file; archive blocked: ' + str(relative))
    target = stage / relative
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(content)
    manifest.append({'path': relative.as_posix(), 'sha256': hashlib.sha256(content).hexdigest()})
(stage / 'MANIFEST.json').write_text(json.dumps({'files': manifest, 'privateStateIncluded': False}, indent=2), encoding='utf-8')
destination = root / 'releases'
destination.mkdir(exist_ok=True)
archive = destination / ('chat-to-invoice-preview-' + stamp + '.zip')
with zipfile.ZipFile(archive, 'x', zipfile.ZIP_DEFLATED) as z:
    for source in sorted(stage.rglob('*')):
        if source.is_file():
            z.write(source, (Path('chat-to-invoice') / source.relative_to(stage)).as_posix())

# Validate the ACTUAL archive in a fresh directory without private files.
validation = Path(tempfile.mkdtemp(prefix='preview-verify-', dir=private))
with zipfile.ZipFile(archive) as z:
    if any('/work/' in name or name.endswith('.env') for name in z.namelist()):
        raise RuntimeError('Private path in archive')
    z.extractall(validation)
clean = validation / 'chat-to-invoice'
environment = dict(os.environ)
for key in ['AGNES_API_KEY', 'PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET', 'ZHIPU_API_KEY']:
    environment.pop(key, None)
node = shutil.which('node')
if not node:
    raise RuntimeError('Node.js is required to verify the package')
tests = [str(p.relative_to(clean)) for p in sorted((clean / 'src').glob('*.test.mjs'))]
tests.append('scripts/parse-model-json.test.mjs')
completed = subprocess.run([node, '--test', *tests], cwd=clean, env=environment, capture_output=True, text=True, encoding='utf-8', errors='replace')
if completed.returncode:
    raise RuntimeError('Clean archive tests failed; do not distribute this build')
(clean / 'work').mkdir()
for name in ['agnes-model.env', 'paypal-sandbox.env']:
    shutil.copyfile(clean / (name + '.example'), clean / 'work' / name)
with socket.socket() as probe:
    probe.bind(('127.0.0.1', 0))
    port = probe.getsockname()[1]
environment['PORT'] = str(port)
process = subprocess.Popen([node, '--env-file=work/agnes-model.env', '--env-file=work/paypal-sandbox.env', 'src/server.mjs'], cwd=clean, env=environment, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
try:
    ready = False
    for _ in range(50):
        if process.poll() is not None:
            break
        try:
            with urllib.request.urlopen(f'http://127.0.0.1:{port}/?operation=not-a-real-operation', timeout=1) as response:
                ready = response.status == 200 and b'Chat to Invoice' in response.read()
            if ready:
                break
        except OSError:
            time.sleep(.1)
    if not ready:
        raise RuntimeError('Clean archive startup failed')
finally:
    process.terminate()
    process.communicate(timeout=5)
report = {'archive': str(archive), 'sha256': hashlib.sha256(archive.read_bytes()).hexdigest(),
          'sourceFiles': len(files), 'bytes': archive.stat().st_size, 'cleanTestsPassed': True,
          'cleanStartupPassed': True, 'realCredentialsUsedInValidation': False,
          'privateStateIncluded': False, 'published': False}
report_file = archive.with_suffix('.json')
report_file.write_text(json.dumps(report, indent=2), encoding='utf-8')
print(json.dumps(report, ensure_ascii=False, indent=2))
