import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'dashboard.db');

console.log('サンプルデータ生成を開始します...');

// データベースファイルを読み込み
const fileBuffer = fs.readFileSync(dbPath);
const SQL = await initSqlJs();
const db = new SQL.Database(fileBuffer);

// 日付生成ヘルパー（今日から過去730日分 = 2年分）
function generateDates(days = 730) {
    const dates = [];
    const today = new Date();
    for (let i = days - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        dates.push(date.toISOString().split('T')[0]);
    }
    return dates;
}

// ランダムな整数を生成
function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// 季節性を加味した係数（1月=0, 12月=11）
function getSeasonalFactor(dateStr) {
    const month = new Date(dateStr).getMonth();
    // 冬季（12,1,2月）と春季（3,4月）は患者数が多い傾向
    const seasonalFactors = [1.2, 1.2, 1.15, 1.1, 1.05, 0.95, 0.9, 0.9, 0.95, 1.0, 1.05, 1.15];
    return seasonalFactors[month];
}

const dates = generateDates(730);
const kaCodes = [1, 2, 3, 4, 5, 6, 7];  // 有効な診療科
const wardCodes = [101, 102, 103, 201];  // 有効な病棟
const billingTypes = [
    '救急医療管理加算',
    '薬剤管理指導料',
    '栄養サポートチーム加算',
    '褥瘡対策加算',
    '呼吸ケアチーム加算'
];

// 外来データ生成
console.log('外来データを生成中...');
let outpatientCount = 0;
for (const date of dates) {
    const seasonal = getSeasonalFactor(date);
    for (const kaCode of kaCodes) {
        // 診療科ごとに基本患者数が異なる
        const baseFirst = kaCode === 1 ? 15 : kaCode === 3 ? 12 : 8;  // 内科と小児科は多め
        const baseRevisit = kaCode === 1 ? 45 : kaCode === 3 ? 30 : 25;
        
        const firstVisit = Math.round(randomInt(baseFirst - 5, baseFirst + 5) * seasonal);
        const revisit = Math.round(randomInt(baseRevisit - 10, baseRevisit + 10) * seasonal);
        
        db.run(
            'INSERT INTO outpatient_daily (date, ka_code, first_visit_count, revisit_count) VALUES (?, ?, ?, ?)',
            [date, kaCode, Math.max(0, firstVisit), Math.max(0, revisit)]
        );
        outpatientCount++;
    }
}
console.log(`外来データ${outpatientCount}件を登録しました`);

// 入院データ生成
console.log('入院データを生成中...');
const wardCapacity = {
    101: 50,
    102: 45,
    103: 40,
    201: 10
};

let inpatientCount = 0;
for (const date of dates) {
    const seasonal = getSeasonalFactor(date);
    for (const wardCode of wardCodes) {
        const capacity = wardCapacity[wardCode];
        // 病床稼働率70-95%程度
        const occupancyRate = 0.70 + Math.random() * 0.25;
        const patientCount = Math.round(capacity * occupancyRate * seasonal);
        
        db.run(
            'INSERT INTO inpatient_daily (date, ward_code, patient_count) VALUES (?, ?, ?)',
            [date, wardCode, Math.min(capacity, Math.max(0, patientCount))]
        );
        inpatientCount++;
    }
}
console.log(`入院データ${inpatientCount}件を登録しました`);

// 算定種データ生成
console.log('算定種データを生成中...');
let billingCount = 0;
for (const date of dates) {
    const seasonal = getSeasonalFactor(date);
    for (const billingType of billingTypes) {
        // 算定種別ごとに基本件数が異なる
        let baseCount;
        if (billingType.includes('救急')) baseCount = 5;
        else if (billingType.includes('薬剤')) baseCount = 20;
        else baseCount = 10;
        
        const count = Math.round(randomInt(baseCount - 3, baseCount + 3) * seasonal);
        
        db.run(
            'INSERT INTO billing_daily (date, billing_type, count) VALUES (?, ?, ?)',
            [date, billingType, Math.max(0, count)]
        );
        billingCount++;
    }
}
console.log(`算定種データ${billingCount}件を登録しました`);

// データベースをファイルに保存
const data = db.export();
const buffer = Buffer.from(data);
fs.writeFileSync(dbPath, buffer);

db.close();
console.log('サンプルデータ生成が完了しました');
