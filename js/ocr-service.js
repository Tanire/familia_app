
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
        // Simple heuristic to extract Total
        // Look for lines containing "TOTAL" or "IMPORTE" and a number
        const lines = text.split('\n');
        let maxPrice = 0.0;
        let bestLine = "";

        // Regex for Price: 12,34 or 12.34 options
        const priceRegex = /(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2}))/g;

        // Keywords to identify total
        const totalKeywords = ['TOTAL', 'VENTA', 'IMPORTE', 'PAGAR'];

        // Strategy 1: Find line with "Total" and get the biggest number in it
        for (let line of lines) {
            const upperLine = line.toUpperCase();

            // Check if it's a "total" line
            const isTotalLine = totalKeywords.some(k => upperLine.includes(k));

            if (isTotalLine) {
                const matches = line.match(priceRegex);
                if (matches) {
                    matches.forEach(m => {
                        // Normalize 1.200,50 -> 1200.50
                        let cleanNum = m.replace('.', '').replace(',', '.');
                        // Edge case: if comma was used as decimal separator but no thousands separator
                        // Example: 12,50 -> 12.50. Code above works for 1.000,00 -> 1000.00
                        // What if 50,05? -> 50.05

                        // Robust Parse
                        let num = parseFloat(m.replace(',', '.')); // Try A (12,50 -> 12.50)
                        if (isNaN(num)) {
                            num = parseFloat(m.replace('.', '').replace(',', '.')); // Try B (1.200,50 -> 1200.50)
                        }

                        if (!isNaN(num) && num > maxPrice) {
                            maxPrice = num;
                        }
                    });
                }
            }
        }

        // Strategy 2: If no "Total" keyword found, just get the biggest number at the bottom half?
        // Too risky. Let's return what we have.

        return {
            text: text,
            total: maxPrice > 0 ? maxPrice : null
        };
    }
};
