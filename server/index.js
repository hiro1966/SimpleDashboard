import { createYoga, createSchema } from 'graphql-yoga';
import { createServer } from 'http';
import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '../database/dashboard.db');

// データベース初期化
let db;
const SQL = await initSqlJs();
const fileBuffer = fs.readFileSync(dbPath);
db = new SQL.Database(fileBuffer);

// データベースヘルパー関数
function query(sql, params = []) {
    try {
        const stmt = db.prepare(sql);
        stmt.bind(params);
        const results = [];
        while (stmt.step()) {
            const row = stmt.getAsObject();
            results.push(row);
        }
        stmt.free();
        return results;
    } catch (error) {
        console.error('Query error:', error);
        throw error;
    }
}

// GraphQLスキーマ定義
const typeDefs = `
  type KaMaster {
    id: Int!
    kaName: String!
    kaCode: Int!
    seq: Int!
    valid: Boolean!
  }

  type WardMaster {
    id: Int!
    wardName: String!
    wardCode: Int!
    seq: Int!
    bedCount: Int!
    valid: Boolean!
  }

  type OutpatientData {
    date: String!
    kaCode: Int!
    kaName: String
    firstVisitCount: Int!
    revisitCount: Int!
    totalCount: Int!
  }

  type InpatientData {
    date: String!
    wardCode: Int!
    wardName: String
    patientCount: Int!
    bedCount: Int
    occupancyRate: Float
  }

  type BillingData {
    date: String!
    billingType: String!
    count: Int!
  }

  type AggregatedData {
    date: String!
    count: Int!
  }

  input DateRangeInput {
    startDate: String!
    endDate: String!
  }

  type Query {
    # マスタデータ取得
    validKaMasters: [KaMaster!]!
    validWardMasters: [WardMaster!]!
    allBillingTypes: [String!]!

    # 外来データ取得
    outpatientData(
      dateRange: DateRangeInput!
      kaCode: Int
      aggregation: String
    ): [OutpatientData!]!

    # 入院データ取得
    inpatientData(
      dateRange: DateRangeInput!
      wardCode: Int
      aggregation: String
    ): [InpatientData!]!

    # 算定種データ取得
    billingData(
      dateRange: DateRangeInput!
      billingType: String!
      aggregation: String
    ): [BillingData!]!

    # 前年同期比較用データ取得
    outpatientComparison(
      dateRange: DateRangeInput!
      kaCode: Int
      aggregation: String
    ): [OutpatientData!]!

    inpatientComparison(
      dateRange: DateRangeInput!
      wardCode: Int
      aggregation: String
    ): [InpatientData!]!

    billingComparison(
      dateRange: DateRangeInput!
      billingType: String!
      aggregation: String
    ): [BillingData!]!
  }
`;

// リゾルバー実装
const resolvers = {
  Query: {
    // 有効な診療科マスタ取得
    validKaMasters: () => {
      const rows = query('SELECT * FROM ka_master WHERE valid = 1 ORDER BY seq');
      return rows.map(row => ({
        id: row.id,
        kaName: row.ka_name,
        kaCode: row.ka_code,
        seq: row.seq,
        valid: row.valid === 1
      }));
    },

    // 有効な病棟マスタ取得
    validWardMasters: () => {
      const rows = query('SELECT * FROM ward_master WHERE valid = 1 ORDER BY seq');
      return rows.map(row => ({
        id: row.id,
        wardName: row.ward_name,
        wardCode: row.ward_code,
        seq: row.seq,
        bedCount: row.bed_count,
        valid: row.valid === 1
      }));
    },

    // 全算定種別取得
    allBillingTypes: () => {
      const rows = query('SELECT DISTINCT billing_type FROM billing_daily ORDER BY billing_type');
      return rows.map(row => row.billing_type);
    },

    // 外来データ取得
    outpatientData: (_, { dateRange, kaCode, aggregation = 'daily' }) => {
      let sql;
      let params = [dateRange.startDate, dateRange.endDate];

      if (aggregation === 'monthly') {
        if (kaCode) {
          sql = `
            SELECT 
              strftime('%Y-%m', date) as month,
              ka_code,
              SUM(first_visit_count) as first_visit_count,
              SUM(revisit_count) as revisit_count
            FROM outpatient_daily
            WHERE date BETWEEN ? AND ? AND ka_code = ?
            GROUP BY month, ka_code
            ORDER BY month
          `;
          params.push(kaCode);
        } else {
          sql = `
            SELECT 
              strftime('%Y-%m', date) as month,
              SUM(first_visit_count) as first_visit_count,
              SUM(revisit_count) as revisit_count
            FROM outpatient_daily
            WHERE date BETWEEN ? AND ?
            GROUP BY month
            ORDER BY month
          `;
        }
      } else {
        if (kaCode) {
          sql = `
            SELECT date, ka_code, first_visit_count, revisit_count
            FROM outpatient_daily
            WHERE date BETWEEN ? AND ? AND ka_code = ?
            ORDER BY date
          `;
          params.push(kaCode);
        } else {
          sql = `
            SELECT 
              date,
              SUM(first_visit_count) as first_visit_count,
              SUM(revisit_count) as revisit_count
            FROM outpatient_daily
            WHERE date BETWEEN ? AND ?
            GROUP BY date
            ORDER BY date
          `;
        }
      }

      const rows = query(sql, params);

      return rows.map(row => ({
        date: row.month || row.date,
        kaCode: row.ka_code || 0,
        kaName: null,
        firstVisitCount: row.first_visit_count,
        revisitCount: row.revisit_count,
        totalCount: row.first_visit_count + row.revisit_count
      }));
    },

    // 入院データ取得
    inpatientData: (_, { dateRange, wardCode, aggregation = 'daily' }) => {
      let sql;
      let params = [dateRange.startDate, dateRange.endDate];

      if (aggregation === 'monthly') {
        if (wardCode) {
          sql = `
            SELECT 
              strftime('%Y-%m', date) as month,
              ward_code,
              CAST(AVG(patient_count) AS INTEGER) as patient_count
            FROM inpatient_daily
            WHERE date BETWEEN ? AND ? AND ward_code = ?
            GROUP BY month, ward_code
            ORDER BY month
          `;
          params.push(wardCode);
        } else {
          sql = `
            SELECT 
              strftime('%Y-%m', date) as month,
              CAST(AVG(patient_count) AS INTEGER) as patient_count
            FROM inpatient_daily
            WHERE date BETWEEN ? AND ?
            GROUP BY month
            ORDER BY month
          `;
        }
      } else {
        if (wardCode) {
          sql = `
            SELECT date, ward_code, patient_count
            FROM inpatient_daily
            WHERE date BETWEEN ? AND ? AND ward_code = ?
            ORDER BY date
          `;
          params.push(wardCode);
        } else {
          sql = `
            SELECT 
              date,
              SUM(patient_count) as patient_count
            FROM inpatient_daily
            WHERE date BETWEEN ? AND ?
            GROUP BY date
            ORDER BY date
          `;
        }
      }

      const rows = query(sql, params);

      return rows.map(row => {
        const result = {
          date: row.month || row.date,
          wardCode: row.ward_code || 0,
          wardName: null,
          patientCount: row.patient_count,
          bedCount: null,
          occupancyRate: null
        };

        if (row.ward_code) {
          const wardRows = query('SELECT bed_count FROM ward_master WHERE ward_code = ?', [row.ward_code]);
          if (wardRows.length > 0) {
            result.bedCount = wardRows[0].bed_count;
            result.occupancyRate = (row.patient_count / wardRows[0].bed_count) * 100;
          }
        }

        return result;
      });
    },

    // 算定種データ取得
    billingData: (_, { dateRange, billingType, aggregation = 'daily' }) => {
      let sql;
      const params = [dateRange.startDate, dateRange.endDate, billingType];

      if (aggregation === 'monthly') {
        sql = `
          SELECT 
            strftime('%Y-%m', date) as month,
            billing_type,
            SUM(count) as count
          FROM billing_daily
          WHERE date BETWEEN ? AND ? AND billing_type = ?
          GROUP BY month, billing_type
          ORDER BY month
        `;
      } else {
        sql = `
          SELECT date, billing_type, count
          FROM billing_daily
          WHERE date BETWEEN ? AND ? AND billing_type = ?
          ORDER BY date
        `;
      }

      const rows = query(sql, params);

      return rows.map(row => ({
        date: row.month || row.date,
        billingType: row.billing_type,
        count: row.count
      }));
    },

    // 前年同期比較用（1年前のデータを取得）
    outpatientComparison: (_, { dateRange, kaCode, aggregation = 'daily' }) => {
      const startDate = new Date(dateRange.startDate);
      const endDate = new Date(dateRange.endDate);
      startDate.setFullYear(startDate.getFullYear() - 1);
      endDate.setFullYear(endDate.getFullYear() - 1);

      const lastYearRange = {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      };

      return resolvers.Query.outpatientData(_, { dateRange: lastYearRange, kaCode, aggregation });
    },

    inpatientComparison: (_, { dateRange, wardCode, aggregation = 'daily' }) => {
      const startDate = new Date(dateRange.startDate);
      const endDate = new Date(dateRange.endDate);
      startDate.setFullYear(startDate.getFullYear() - 1);
      endDate.setFullYear(endDate.getFullYear() - 1);

      const lastYearRange = {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      };

      return resolvers.Query.inpatientData(_, { dateRange: lastYearRange, wardCode, aggregation });
    },

    billingComparison: (_, { dateRange, billingType, aggregation = 'daily' }) => {
      const startDate = new Date(dateRange.startDate);
      const endDate = new Date(dateRange.endDate);
      startDate.setFullYear(startDate.getFullYear() - 1);
      endDate.setFullYear(endDate.getFullYear() - 1);

      const lastYearRange = {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      };

      return resolvers.Query.billingData(_, { dateRange: lastYearRange, billingType, aggregation });
    }
  }
};

// Yogaサーバー作成
const yoga = createYoga({
  schema: createSchema({
    typeDefs,
    resolvers
  }),
  cors: {
    origin: '*',
    credentials: true
  },
  graphiql: true
});

const server = createServer(yoga);
const PORT = 4000;

server.listen(PORT, () => {
  console.log(`🚀 GraphQL Yoga Server ready at http://localhost:${PORT}/graphql`);
});
