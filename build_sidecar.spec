# build_sidecar.spec — PyInstaller spec para o sidecar
# Antes de executar este arquivo, rode `npm run build` para gerar `apps/web/dist/index.html`.
# Depois: pyinstaller build_sidecar.spec
#
# Gera um executável standalone do FastAPI sidecar (main_api.py + astro_engine.py)
# para distribuição junto com o app Tauri.

import os
from PyInstaller.utils.hooks import collect_all

# `pkg_resources` (loaded by one of the HTTP dependencies) imports the
# namespace package `backports` at runtime. A hidden import alone does not
# include namespace-package data in a one-file executable, which made the
# packaged motor exit before opening its HTTP port on Windows.
backports_datas, backports_binaries, backports_hiddenimports = collect_all('backports')

# The compatibility sidecar imports the certified engine from the Web V1
# package. Keep the source path and certified assets in the bundle until the
# later, gated legacy-runtime removal.
api_source_path = os.path.abspath('services/api/src')
ephe_source_path = os.path.join('services', 'api', 'ephe')
ephe_datas = [(ephe_source_path, 'ephe')]

frontend_datas = [('apps/web/dist', 'apps/web/dist')]

a = Analysis(
    ['main_api.py'],
    pathex=[api_source_path],
    binaries=backports_binaries,
    datas=[
        ('astro_engine.py', '.'),        # Engine original (importado como módulo)
        ('local_storage.py', '.'),
        ('browser_workspace.py', '.'),
        ('src-tauri/migrations/private/*.sql', 'migrations/private'),
        ('src-tauri/migrations/knowledge/*.sql', 'migrations/knowledge'),
        # Snapshot editorial canônico para a primeira instalação local de
        # knowledge.sqlite; o importador preserva hash e proveniência.
        ('knowledge/engenharia_astrologica/knowledge/build/editorial_current.sqlite',
         'knowledge'),
    ] + ephe_datas + frontend_datas + backports_datas,
    hiddenimports=[
        'astro_engine',
        'local_storage',
        'swisseph',                     # Swiss Ephemeris Python bindings
        'kerykeion',                    # Fallback engine
        'uvicorn',
        'uvicorn.logging',
        'uvicorn.loops',
        'uvicorn.loops.auto',
        'uvicorn.protocols',
        'uvicorn.protocols.http',
        'uvicorn.protocols.http.auto',
        'uvicorn.protocols.websockets',
        'uvicorn.protocols.websockets.auto',
        'uvicorn.lifespan',
        'uvicorn.lifespan.on',
        'uvicorn.lifespan.on_impl',
        'uvicorn.lifespan.off',
        'fastapi',
        'pydantic',
        'starlette',
        'starlette.routing',
        'starlette.middleware',
        'starlette.middleware.cors',
        'anyio',
        'h11',
        *backports_hiddenimports,
        'tzdata',
        'tzdata.zoneinfo',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
)

pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='astro-engine-x86_64-pc-windows-msvc',   # Nome que o Tauri espera
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=True,                   # IMPORTANTE: sidecar precisa de console para logs
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
