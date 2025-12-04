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
const billingCodes = ['B001', 'B008', 'B001-9', 'B005-6', 'B001-2-9'];  // 算定種コード

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

// 入院データ生成（新フィールド対応）
console.log('入院データを生成中...');
const wardCapacity = {
    101: 50,
    102: 45,
    103: 40,
    201: 10
};

// 病棟ごとの前日患者数を保持
const previousDayPatients = {};
wardCodes.forEach(code => {
    previousDayPatients[code] = Math.round(wardCapacity[code] * 0.8); // 初期値80%稼働
});

let inpatientCount = 0;
for (const date of dates) {
    const seasonal = getSeasonalFactor(date);
    
    for (const wardCode of wardCodes) {
        const capacity = wardCapacity[wardCode];
        const prevPatients = previousDayPatients[wardCode];
        
        // 新入院・退院・転入・転出を計算
        const baseNewAdmission = Math.round(capacity * 0.15 * seasonal); // 基本15%
        const baseDischarge = Math.round(capacity * 0.14 * seasonal); // 基本14%
        const baseTransferIn = randomInt(0, 2);
        const baseTransferOut = randomInt(0, 2);
        
        const newAdmission = Math.max(0, baseNewAdmission + randomInt(-3, 3));
        const discharge = Math.max(0, baseDischarge + randomInt(-3, 3));
        const transferIn = baseTransferIn;
        const transferOut = Math.min(prevPatients, baseTransferOut);
        
        // 当日患者数 = 前日患者数 + 新入院 + 転入 - 退院 - 転出
        let patientCount = prevPatients + newAdmission + transferIn - discharge - transferOut;
        patientCount = Math.max(0, Math.min(capacity, patientCount));
        
        // 診療科はランダムに選択（実際は病棟ごとに診療科が決まっているが簡略化）
        const kaCode = kaCodes[randomInt(0, kaCodes.length - 1)];
        
        db.run(
            'INSERT INTO inpatient_daily (date, ward_code, ka_code, patient_count, new_admission_count, discharge_count, transfer_in_count, transfer_out_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [date, wardCode, kaCode, patientCount, newAdmission, discharge, transferIn, transferOut]
        );
        
        // 次の日のために保存
        previousDayPatients[wardCode] = patientCount;
        inpatientCount++;
    }
}
console.log(`入院データ${inpatientCount}件を登録しました`);

// 算定種データ生成（billing_code使用）
console.log('算定種データを生成中...');
let billingCount = 0;
for (const date of dates) {
    const seasonal = getSeasonalFactor(date);
    for (const billingCode of billingCodes) {
        // 算定種別ごとに基本件数が異なる
        let baseCount;
        if (billingCode === 'B001') baseCount = 5;  // 救急
        else if (billingCode === 'B008') baseCount = 20;  // 薬剤
        else baseCount = 10;
        
        const count = Math.round(randomInt(baseCount - 3, baseCount + 3) * seasonal);
        
        db.run(
            'INSERT INTO billing_daily (date, billing_code, count) VALUES (?, ?, ?)',
            [date, billingCode, Math.max(0, count)]
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
