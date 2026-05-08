const fs = require('fs');
const path = require('path');
const { SourceMapConsumer } = require('source-map');

const mapFilePath = 'resources/downloader/downloader.js.map';
const outputDir = 'resources/downloader/extracted-sources';

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

const rawSourceMap = JSON.parse(fs.readFileSync(mapFilePath, 'utf8'));

SourceMapConsumer.with(rawSourceMap, null, (consumer) => {
    const sources = consumer.sources;
    
    sources.forEach((source) => {
        // Skip node_modules
        if (source.includes('node_modules')) return;

        // Retrieve original content
        const content = consumer.sourceContentFor(source, true);
        
        if (content !== null) {
            // Clean the source path to avoid deep nesting
            const cleanName = path.basename(source);
            const outputPath = path.join(outputDir, cleanName);
            
            fs.writeFileSync(outputPath, content);
            console.log(`Extracted: ${outputPath}`);
        }
    });
    
    consumer.destroy();
});
