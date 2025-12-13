const fs = require('fs');
const path = require('path');

const translationsPath = path.join(__dirname, '../client/src/translations.js');
const content = fs.readFileSync(translationsPath, 'utf8');

// Primitive regex parsing (assuming standard object syntax)
// We look for `en: { ... }` and `es: { ... }`
// This is brittle but sufficient for the current file structure.
// Actually, let's just use eval? No, unsafe. 
// Let's copy the object definition structure into a temp .js file and require it? 
// No, it has `export const`.
// Let's strip `export` and eval.

try {
    const code = content.replace('export const translations =', 'const translations =');

    // Create a sandbox execution
    const sandbox = { translations: {} };
    // This is getting complicated to eval safely.
    // Let's just use regex to extract keys from the file content directly.

    // Strategy: Split file into two parts: after "en: {" and after "es: {".
    // Count brackets to find the end of each block? 
    // Or just look for key: "value" lines.

    const extractKeys = (lang) => {
        const regex = new RegExp(`${lang}:\\s*{([\\s\\S]*?)},`, 'm');
        const match = content.match(regex);
        if (!match) return [];

        const block = match[1];
        const keyRegex = /^\s*([a-zA-Z0-9_]+):/gm;
        const keys = [];
        let m;
        while ((m = keyRegex.exec(block)) !== null) {
            keys.push(m[1]);
        }
        return keys;
    };

    const enKeys = extractKeys('en');
    const esKeys = extractKeys('es');

    const missingInEs = enKeys.filter(k => !esKeys.includes(k));
    const missingInEn = esKeys.filter(k => !enKeys.includes(k));

    console.log(`Total EN keys: ${enKeys.length}`);
    console.log(`Total ES keys: ${esKeys.length}`);

    if (missingInEs.length > 0) {
        console.error('MISSING IN ES:', missingInEs);
    }
    if (missingInEn.length > 0) {
        console.error('MISSING IN EN:', missingInEn);
    }

    if (missingInEs.length === 0 && missingInEn.length === 0) {
        console.log('SUCCESS: Translation keys are consistent.');
    } else {
        process.exit(1);
    }

} catch (e) {
    console.error('Error parsing translations:', e);
}
