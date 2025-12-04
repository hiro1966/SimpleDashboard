import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('クライアントライブラリのセットアップを開始します...');

const libsDir = path.join(__dirname, '../client/public/libs');

// libsディレクトリを作成
if (!fs.existsSync(libsDir)) {
    fs.mkdirSync(libsDir, { recursive: true });
    console.log('libsディレクトリを作成しました');
}

// Chart.jsをコピー
const chartJsSrc = path.join(__dirname, '../node_modules/chart.js/dist/chart.umd.js');
const chartJsDest = path.join(libsDir, 'chart.umd.js');
fs.copyFileSync(chartJsSrc, chartJsDest);
console.log('✓ Chart.js をコピーしました');

// js-yamlをコピー
const jsYamlSrc = path.join(__dirname, '../node_modules/js-yaml/dist/js-yaml.min.js');
const jsYamlDest = path.join(libsDir, 'js-yaml.min.js');
fs.copyFileSync(jsYamlSrc, jsYamlDest);
console.log('✓ js-yaml をコピーしました');

console.log('\nセットアップが完了しました！');
console.log('インターネット接続なしで動作可能です。');
