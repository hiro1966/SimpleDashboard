import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'dashboard.db');
const schemaPath = path.join(__dirname, 'schema.sql');

console.log('データベース初期化を開始します...');

// 既存のDBがあれば削除
if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
    console.log('既存のデータベースを削除しました');
}

// SQL.jsを初期化
const SQL = await initSqlJs();
const db = new SQL.Database();
console.log('新しいデータベースを作成しました');

// スキーマを読み込んで実行
const schema = fs.readFileSync(schemaPath, 'utf8');
db.run(schema);
console.log('スキーマを適用しました');

// 診療科マスタの初期データ
const kaMasterData = [
    { ka_name: '内科', ka_code: 1, seq: 1, valid: 1 },
    { ka_name: '外科', ka_code: 2, seq: 2, valid: 1 },
    { ka_name: '小児科', ka_code: 3, seq: 3, valid: 1 },
    { ka_name: '整形外科', ka_code: 4, seq: 4, valid: 1 },
    { ka_name: '皮膚科', ka_code: 5, seq: 5, valid: 1 },
    { ka_name: '眼科', ka_code: 6, seq: 6, valid: 1 },
    { ka_name: '耳鼻咽喉科', ka_code: 7, seq: 7, valid: 1 },
    { ka_name: '産婦人科', ka_code: 8, seq: 8, valid: 0 }  // 無効な例
];

for (const ka of kaMasterData) {
    db.run(
        'INSERT INTO ka_master (ka_name, ka_code, seq, valid) VALUES (?, ?, ?, ?)',
        [ka.ka_name, ka.ka_code, ka.seq, ka.valid]
    );
}
console.log(`診療科マスタに${kaMasterData.length}件登録しました`);

// 病棟マスタの初期データ
const wardMasterData = [
    { ward_name: '1病棟', ward_code: 101, seq: 1, bed_count: 50, valid: 1 },
    { ward_name: '2病棟', ward_code: 102, seq: 2, bed_count: 45, valid: 1 },
    { ward_name: '3病棟', ward_code: 103, seq: 3, bed_count: 40, valid: 1 },
    { ward_name: 'ICU', ward_code: 201, seq: 4, bed_count: 10, valid: 1 },
    { ward_name: '4病棟', ward_code: 104, seq: 5, bed_count: 30, valid: 0 }  // 無効な例
];

for (const ward of wardMasterData) {
    db.run(
        'INSERT INTO ward_master (ward_name, ward_code, seq, bed_count, valid) VALUES (?, ?, ?, ?, ?)',
        [ward.ward_name, ward.ward_code, ward.seq, ward.bed_count, ward.valid]
    );
}
console.log(`病棟マスタに${wardMasterData.length}件登録しました`);

// データベースをファイルに保存
const data = db.export();
const buffer = Buffer.from(data);
fs.writeFileSync(dbPath, buffer);

db.close();
console.log('データベース初期化が完了しました');
