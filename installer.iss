
[Setup]
AppName=Casa Mocholi Chorda
AppVersion=1.22.3
DefaultDirName={autopf}\AppFamilia
DefaultGroupName=Casa Mocholi Chorda
OutputBaseFilename=Instalar_AppFamilia
OutputDir="d:\PROGRAMACION\TRABAJOS\APP FAMILIA\instalacion"
Compression=lzma2
SolidCompression=yes
ArchitecturesInstallIn64BitMode=x64

[Files]
Source: "d:\PROGRAMACION\TRABAJOS\APP FAMILIA\dist\AppFamilia\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\Casa Mocholi Chorda"; Filename: "{app}\AppFamilia.exe"
Name: "{commondesktop}\Casa Mocholi Chorda"; Filename: "{app}\AppFamilia.exe"
    