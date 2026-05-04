import os
import subprocess
import sys
import shutil

def main():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    instalacion_dir = os.path.join(base_dir, "instalacion")
    
    # Crear carpeta instalación si no existe
    if not os.path.exists(instalacion_dir):
        os.makedirs(instalacion_dir)

    print("=== 1. Instalando dependencias ===")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "pywebview", "pyinstaller"])

    print("\n=== 2. Compilando con PyInstaller ===")
    
    # Datos extras que necesitamos empaquetar
    add_data_args = [
        "--add-data", "index.html;.",
        "--add-data", "calendar.html;.",
        "--add-data", "recipes.html;.",
        "--add-data", "expenses.html;.",
        "--add-data", "shopping.html;.",
        "--add-data", "settings.html;.",
        "--add-data", "css;css",
        "--add-data", "js;js",
        "--add-data", "assets;assets"
    ]

    pyinstaller_args = [
        sys.executable, "-m", "PyInstaller",
        "--noconfirm",
        "--windowed", # Sin consola
        "--name", "AppFamilia",
        "--distpath", os.path.join(base_dir, "dist"),
        "--workpath", os.path.join(base_dir, "build"),
    ] + add_data_args + ["desktop_app.py"]

    subprocess.check_call(pyinstaller_args, cwd=base_dir)

    print("\n=== 3. Preparando Inno Setup Script ===")
    iss_content = """
[Setup]
AppName=Casa Mocholi Chorda
AppVersion=1.22.3
DefaultDirName={autopf}\\AppFamilia
DefaultGroupName=Casa Mocholi Chorda
OutputBaseFilename=Instalar_AppFamilia
OutputDir="{instalacion_dir}"
Compression=lzma2
SolidCompression=yes
ArchitecturesInstallIn64BitMode=x64

[Files]
Source: "{dist_dir}\\AppFamilia\\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\\Casa Mocholi Chorda"; Filename: "{app}\\AppFamilia.exe"
Name: "{commondesktop}\\Casa Mocholi Chorda"; Filename: "{app}\\AppFamilia.exe"
    """.replace("{instalacion_dir}", instalacion_dir).replace("{dist_dir}", os.path.join(base_dir, "dist")).replace("{app}", "{app}")

    iss_path = os.path.join(base_dir, "installer.iss")
    with open(iss_path, "w", encoding="utf-8") as f:
        f.write(iss_content)

    print("\n=== 4. Compilando Instalador (Inno Setup) ===")
    iscc_paths = [
        r"C:\Program Files (x86)\Inno Setup 6\ISCC.exe",
        r"C:\Program Files\Inno Setup 6\ISCC.exe",
    ]
    
    iscc_exe = None
    for p in iscc_paths:
        if os.path.exists(p):
            iscc_exe = p
            break
            
    if iscc_exe:
        subprocess.check_call([iscc_exe, iss_path])
        print(f"\n¡ÉXITO! Instalador creado en: {instalacion_dir}\\Instalar_AppFamilia.exe")
    else:
        print("\nADVERTENCIA: No se encontró Inno Setup instalado. No se pudo crear el instalador final.")
        print("El ejecutable de la aplicación se encuentra en la carpeta 'dist/AppFamilia'.")
        
if __name__ == "__main__":
    main()
