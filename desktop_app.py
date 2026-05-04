import webview
import os
import sys

def get_resource_path(relative_path):
    """Obtener la ruta absoluta al recurso, funciona tanto en desarrollo como en PyInstaller"""
    try:
        # PyInstaller crea una carpeta temporal y guarda la ruta en _MEIPASS
        base_path = sys._MEIPASS
    except Exception:
        base_path = os.path.abspath(".")

    return os.path.join(base_path, relative_path)

if __name__ == '__main__':
    # Ruta al archivo HTML principal
    index_html = get_resource_path("index.html")
    
    # Crear ventana nativa (webview)
    webview.create_window(
        "Casa Mocholí Chordà", 
        url=index_html, 
        width=1024, 
        height=768, 
        min_size=(800, 600),
        text_select=True, # Permitir seleccionar texto
        confirm_close=False
    )
    
    # Iniciar la aplicación de escritorio
    webview.start(private_mode=False) # private_mode=False para permitir que LocalStorage se guarde
