
// Wrapper for Tesseract.js interaction

const OCRService = {

    // Config
    worker: null,

    init: async function () {
        if (this.worker) return;
        // Tesseract is loaded via CDN globally
    },

    scanImage: async function (imageFile, progressCallback) {
        if (!window.Tesseract) {
            alert("La librería de escaneo no se ha cargado correctamente. Comprueba tu conexión.");
            return null;
        }

        try {
            const worker = await Tesseract.createWorker('eng', 1, {
                logger: m => {
                    if (progressCallback) progressCallback(m);
                }
            });

            // We use 'eng' (English) often because traineddata is smaller and numbers are universal.
            // But 'spa' (Spanish) is better for text keyworks like "TOTAL".
            // Let's try to load both if possible or just Spanish.
            // For lightness, let's start with Spanish.
            await worker.loadLanguage('spa');
            await worker.initialize('spa');

            const ret = await worker.recognize(imageFile);
            await worker.terminate();

            return ret.data.text;

        } catch (err) {
            console.error("OCR Error:", err);
            alert("Error al procesar la imagen: " + err.message);
            return null;
        }
    },

    parseReceiptText: function (text) {
        const lines = text.split('\n');
        let maxPrice = 0.0;
        let items = [];

        // Regex para buscar precios: 12,34 o 12.34
        const priceRegex = /(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2}))/g;
        // Regex para detectar "Cantidad x PrecioUnitario" ej: "2 x 1,50" o "2 * 1.50"
        const unitPriceRegex = /(\d+)\s*[xX*]\s*(\d+[.,]\d{2})/;
        
        const totalKeywords = ['TOTAL', 'VENTA', 'IMPORTE', 'PAGAR', 'SUMA', 'TARJETA', 'EFECTIVO', 'CAMBIO', 'ENTREGADO'];
        const badStartKeywords = ['TEL', 'CIF', 'NIF', 'CALLE', 'PLAZA', 'AVDA', 'C/', 'FACTURA', 'TICKET', 'FECHA', 'HORA', 'GRACIAS'];

        for (let i = 0; i < lines.length; i++) {
            const trimmedLine = lines[i].trim();
            if (trimmedLine.length < 3) continue;

            const upperLine = trimmedLine.toUpperCase();
            
            // Comprobar si hay precios
            const matches = trimmedLine.match(priceRegex);
             
            if (matches) {
                // Cogemos el último número como el precio total de la línea
                const priceStr = matches[matches.length - 1];
                let num = parseFloat(priceStr.replace(',', '.'));
                
                if (isNaN(num)) {
                     num = parseFloat(priceStr.replace('.', '').replace(',', '.'));
                }

                if (isNaN(num)) continue;

                const isTotalLine = totalKeywords.some(k => upperLine.includes(k));

                if (isTotalLine) {
                    if (num > maxPrice) {
                        maxPrice = num;
                    }
                } else {
                    const isHeader = badStartKeywords.some(k => upperLine.startsWith(k));
                    
                    if (!isHeader && num > 0 && num < 1000) { 
                         // Buscar nombre del artículo
                         const priceIdx = trimmedLine.lastIndexOf(priceStr);
                         let itemName = trimmedLine.substring(0, priceIdx).trim();
                         itemName = itemName.replace(/[^a-zA-Z0-9\sñÑáéíóúÁÉÍÓÚ%]/g, '').trim();
                         
                         let qty = 1;
                         let unitPrice = num;
                         
                         // Intentar buscar multiplicador en la misma línea (Ej: 2 x 1.50 ARTICULO 3.00)
                         let unitMatch = trimmedLine.match(unitPriceRegex);
                         
                         // Si no hay multiplicador en la misma línea, mirar la línea anterior (muy común en Mercadona/Consum)
                         if (!unitMatch && i > 0) {
                             const prevLine = lines[i-1].trim();
                             unitMatch = prevLine.match(unitPriceRegex);
                             // Si la línea anterior tiene cantidad x precio, el nombre puede estar en la línea anterior o en esta
                             if (unitMatch) {
                                 const idx = prevLine.indexOf(unitMatch[0]);
                                 if (idx > 3) {
                                     itemName = prevLine.substring(0, idx).trim().replace(/[^a-zA-Z0-9\sñÑáéíóúÁÉÍÓÚ%]/g, '').trim();
                                 }
                             }
                         }

                         if (unitMatch) {
                             qty = parseInt(unitMatch[1]);
                             unitPrice = parseFloat(unitMatch[2].replace(',', '.'));
                         }

                         if (itemName.length > 2) {
                             items.push({ 
                                 name: itemName, 
                                 price: num, 
                                 qty: qty, 
                                 unitPrice: unitPrice 
                             });
                         }
                    }
                }
            }
        }

        return {
            text: text,
            total: maxPrice > 0 ? maxPrice : null,
            items: items
        };
    }
};
