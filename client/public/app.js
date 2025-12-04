// GraphQL クライアント設定（fetchベース）
const GRAPHQL_URL = 'http://localhost:4000/graphql';

// GraphQLクエリを実行するヘルパー関数
async function graphqlQuery(query, variables = {}) {
    const response = await fetch(GRAPHQL_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            query,
            variables
        })
    });
    
    const result = await response.json();
    if (result.errors) {
        console.error('GraphQL Errors:', result.errors);
        throw new Error(result.errors[0].message);
    }
    return result.data;
}

// グローバル状態管理
const state = {
    selectedGraphPosition: null,
    charts: {},
    kaMasters: [],
    wardMasters: [],
    billingMasters: [],
    graphConfigs: {}
};

// 初期化
document.addEventListener('DOMContentLoaded', async () => {
    await loadMasterData();
    setupEventListeners();
    setDefaultDates();
    await loadDashboardConfig();
});

// マスタデータ読み込み
async function loadMasterData() {
    try {
        const query = `
            query {
                validKaMasters {
                    kaCode
                    kaName
                    seq
                }
                validWardMasters {
                    wardCode
                    wardName
                    seq
                }
                validBillingMasters {
                    billingCode
                    billingName
                    seq
                }
            }
        `;
        
        const data = await graphqlQuery(query);
        
        state.kaMasters = data.validKaMasters;
        state.wardMasters = data.validWardMasters;
        state.billingMasters = data.validBillingMasters;

        populateKaSelect();
        populateWardSelect();
        populateBillingTypeSelect();
    } catch (error) {
        console.error('マスタデータ読み込みエラー:', error);
        alert('マスタデータの読み込みに失敗しました。サーバーが起動していることを確認してください。');
    }
}

// 診療科セレクトボックス設定
function populateKaSelect() {
    const select = document.getElementById('kaSelect');
    state.kaMasters.forEach(ka => {
        const option = document.createElement('option');
        option.value = ka.kaCode;
        option.textContent = ka.kaName;
        select.appendChild(option);
    });
}

// 病棟セレクトボックス設定
function populateWardSelect() {
    const select = document.getElementById('wardSelect');
    state.wardMasters.forEach(ward => {
        const option = document.createElement('option');
        option.value = ward.wardCode;
        option.textContent = ward.wardName;
        select.appendChild(option);
    });
}

// 算定種セレクトボックス設定
function populateBillingTypeSelect() {
    const select = document.getElementById('billingTypeSelect');
    state.billingMasters.forEach(billing => {
        const option = document.createElement('option');
        option.value = billing.billingCode;
        option.textContent = billing.billingName;
        select.appendChild(option);
    });
}

// デフォルト日付設定（4月1日から前日まで）
function setDefaultDates() {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const currentYear = today.getFullYear();
    const startDate = new Date(currentYear, 3, 1); // 4月1日（月は0始まりなので3）

    document.getElementById('startDate').value = startDate.toISOString().split('T')[0];
    document.getElementById('endDate').value = yesterday.toISOString().split('T')[0];
}

// イベントリスナー設定
function setupEventListeners() {
    // グラフ選択
    document.querySelectorAll('.graph-item').forEach(item => {
        item.addEventListener('click', () => {
            const position = parseInt(item.dataset.position);
            selectGraph(position);
        });
    });

    // データ種別変更
    document.querySelectorAll('input[name="dataType"]').forEach(radio => {
        radio.addEventListener('change', updateMenuVisibility);
    });

    // 更新ボタン
    document.getElementById('updateButton').addEventListener('click', updateSelectedGraph);

    // 設定読込ボタン
    document.getElementById('loadConfigButton').addEventListener('click', loadDashboardConfig);
}

// メニュー表示切り替え
function updateMenuVisibility() {
    const dataType = document.querySelector('input[name="dataType"]:checked').value;

    const kaSection = document.getElementById('kaSection');
    const wardSection = document.getElementById('wardSection');
    const visitTypeSection = document.getElementById('visitTypeSection');
    const billingTypeSection = document.getElementById('billingTypeSection');

    // すべてを一旦リセット
    [kaSection, wardSection, visitTypeSection, billingTypeSection].forEach(section => {
        section.style.display = 'none';
        section.classList.remove('disabled');
    });

    if (dataType === 'outpatient') {
        kaSection.style.display = 'block';
        visitTypeSection.style.display = 'block';
    } else if (dataType === 'inpatient') {
        kaSection.style.display = 'block';
        wardSection.style.display = 'block';
    } else if (dataType === 'billing') {
        billingTypeSection.style.display = 'block';
    }
}

// グラフ選択
function selectGraph(position) {
    // 選択解除
    document.querySelectorAll('.graph-item').forEach(item => {
        item.classList.remove('selected');
    });

    // 新しい選択
    document.querySelector(`[data-position="${position}"]`).classList.add('selected');
    state.selectedGraphPosition = position;
    document.getElementById('selectedGraph').textContent = `グラフ ${position + 1}`;
}

// 選択グラフ更新
async function updateSelectedGraph() {
    if (state.selectedGraphPosition === null) {
        alert('グラフを選択してください');
        return;
    }

    const dataType = document.querySelector('input[name="dataType"]:checked').value;
    const aggregation = document.querySelector('input[name="aggregation"]:checked').value;
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    const showComparison = document.getElementById('showComparison').checked;

    const config = {
        type: dataType,
        aggregation,
        startDate,
        endDate,
        showComparison
    };

    if (dataType === 'outpatient') {
        const kaSelect = document.getElementById('kaSelect').value;
        const visitType = document.querySelector('input[name="visitType"]:checked').value;
        config.kaCode = kaSelect === 'all' || kaSelect === 'stacked' ? null : parseInt(kaSelect);
        config.visitType = visitType;
        config.stacked = kaSelect === 'stacked';
    } else if (dataType === 'inpatient') {
        const wardSelect = document.getElementById('wardSelect').value;
        config.wardCode = wardSelect === 'all' || wardSelect === 'stacked' ? null : parseInt(wardSelect);
        config.stacked = wardSelect === 'stacked';
    } else if (dataType === 'billing') {
        const billingCode = document.getElementById('billingTypeSelect').value;
        if (!billingCode) {
            alert('算定内容を選択してください');
            return;
        }
        config.billingCode = billingCode;
    }

    state.graphConfigs[state.selectedGraphPosition] = config;
    await renderGraph(state.selectedGraphPosition, config);
}

// グラフ描画
async function renderGraph(position, config) {
    const canvas = document.getElementById(`chart-${position}`);
    const ctx = canvas.getContext('2d');

    // 既存のチャートを破棄
    if (state.charts[position]) {
        state.charts[position].destroy();
    }

    try {
        let chartData;
        if (config.type === 'outpatient') {
            chartData = await fetchOutpatientData(config);
        } else if (config.type === 'inpatient') {
            chartData = await fetchInpatientData(config);
        } else if (config.type === 'billing') {
            chartData = await fetchBillingData(config);
        }

        state.charts[position] = new Chart(ctx, chartData);
    } catch (error) {
        console.error(`グラフ${position}の描画エラー:`, error);
        ctx.font = '14px Arial';
        ctx.fillStyle = '#e74c3c';
        ctx.textAlign = 'center';
        ctx.fillText('データ取得エラー', canvas.width / 2, canvas.height / 2);
    }
}

// 外来データ取得
async function fetchOutpatientData(config) {
    const query = `
        query GetOutpatientData($dateRange: DateRangeInput!, $kaCode: Int, $aggregation: String) {
            current: outpatientData(dateRange: $dateRange, kaCode: $kaCode, aggregation: $aggregation) {
                date
                firstVisitCount
                revisitCount
                totalCount
            }
            ${config.showComparison ? `
            lastYear: outpatientComparison(dateRange: $dateRange, kaCode: $kaCode, aggregation: $aggregation) {
                date
                firstVisitCount
                revisitCount
                totalCount
            }
            ` : ''}
        }
    `;

    const data = await graphqlQuery(query, {
        dateRange: {
            startDate: config.startDate,
            endDate: config.endDate
        },
        kaCode: config.kaCode,
        aggregation: config.aggregation
    });

    const labels = data.current.map(d => d.date);
    const datasets = [];

    // 今年のデータ
    if (config.visitType === 'both' || config.visitType === 'first') {
        datasets.push({
            label: '今年 初診',
            data: data.current.map(d => d.firstVisitCount),
            borderColor: 'rgb(52, 152, 219)',
            backgroundColor: 'rgba(52, 152, 219, 0.1)',
            tension: 0.1
        });
    }

    if (config.visitType === 'both' || config.visitType === 'revisit') {
        datasets.push({
            label: '今年 再診',
            data: data.current.map(d => d.revisitCount),
            borderColor: 'rgb(46, 204, 113)',
            backgroundColor: 'rgba(46, 204, 113, 0.1)',
            tension: 0.1
        });
    }

    // 前年のデータ
    if (config.showComparison && data.lastYear) {
        if (config.visitType === 'both' || config.visitType === 'first') {
            datasets.push({
                label: '昨年 初診',
                data: data.lastYear.map(d => d.firstVisitCount),
                borderColor: 'rgb(52, 152, 219)',
                backgroundColor: 'rgba(52, 152, 219, 0.1)',
                borderDash: [5, 5],
                tension: 0.1
            });
        }

        if (config.visitType === 'both' || config.visitType === 'revisit') {
            datasets.push({
                label: '昨年 再診',
                data: data.lastYear.map(d => d.revisitCount),
                borderColor: 'rgb(46, 204, 113)',
                backgroundColor: 'rgba(46, 204, 113, 0.1)',
                borderDash: [5, 5],
                tension: 0.1
            });
        }
    }

    return {
        type: 'line',
        data: { labels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: '外来患者数'
                },
                legend: {
                    display: true,
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    };
}

// 入院データ取得
async function fetchInpatientData(config) {
    const query = `
        query GetInpatientData($dateRange: DateRangeInput!, $wardCode: Int, $aggregation: String) {
            current: inpatientData(dateRange: $dateRange, wardCode: $wardCode, aggregation: $aggregation) {
                date
                patientCount
            }
            ${config.showComparison ? `
            lastYear: inpatientComparison(dateRange: $dateRange, wardCode: $wardCode, aggregation: $aggregation) {
                date
                patientCount
            }
            ` : ''}
        }
    `;

    const data = await graphqlQuery(query, {
        dateRange: {
            startDate: config.startDate,
            endDate: config.endDate
        },
        wardCode: config.wardCode,
        aggregation: config.aggregation
    });

    const labels = data.current.map(d => d.date);
    const datasets = [{
        label: '今年 入院患者数',
        data: data.current.map(d => d.patientCount),
        borderColor: 'rgb(155, 89, 182)',
        backgroundColor: 'rgba(155, 89, 182, 0.1)',
        tension: 0.1
    }];

    if (config.showComparison && data.lastYear) {
        datasets.push({
            label: '昨年 入院患者数',
            data: data.lastYear.map(d => d.patientCount),
            borderColor: 'rgb(155, 89, 182)',
            backgroundColor: 'rgba(155, 89, 182, 0.1)',
            borderDash: [5, 5],
            tension: 0.1
        });
    }

    return {
        type: 'line',
        data: { labels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: '入院患者数'
                },
                legend: {
                    display: true,
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    };
}

// 算定種データ取得
async function fetchBillingData(config) {
    const query = `
        query GetBillingData($dateRange: DateRangeInput!, $billingCode: String!, $aggregation: String) {
            current: billingData(dateRange: $dateRange, billingCode: $billingCode, aggregation: $aggregation) {
                date
                billingCode
                billingName
                count
            }
            ${config.showComparison ? `
            lastYear: billingComparison(dateRange: $dateRange, billingCode: $billingCode, aggregation: $aggregation) {
                date
                billingCode
                billingName
                count
            }
            ` : ''}
        }
    `;

    const data = await graphqlQuery(query, {
        dateRange: {
            startDate: config.startDate,
            endDate: config.endDate
        },
        billingCode: config.billingCode,
        aggregation: config.aggregation
    });

    const billingName = data.current.length > 0 ? data.current[0].billingName : config.billingCode;
    const labels = data.current.map(d => d.date);
    const datasets = [{
        label: `今年 ${billingName}`,
        data: data.current.map(d => d.count),
        borderColor: 'rgb(230, 126, 34)',
        backgroundColor: 'rgba(230, 126, 34, 0.1)',
        tension: 0.1
    }];

    if (config.showComparison && data.lastYear) {
        datasets.push({
            label: `昨年 ${billingName}`,
            data: data.lastYear.map(d => d.count),
            borderColor: 'rgb(230, 126, 34)',
            backgroundColor: 'rgba(230, 126, 34, 0.1)',
            borderDash: [5, 5],
            tension: 0.1
        });
    }

    return {
        type: 'line',
        data: { labels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: billingName
                },
                legend: {
                    display: true,
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    };
}

// YAML設定ファイル読み込み
async function loadDashboardConfig() {
    try {
        const response = await fetch('/config/dashboard-config.yaml');
        const yamlText = await response.text();
        const config = jsyaml.load(yamlText);

        // デフォルト日付を設定（4月1日から前日まで）
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        const currentYear = today.getFullYear();
        const startDate = new Date(currentYear, 3, 1); // 4月1日

        for (const graphConfig of config.graphs) {
            const position = graphConfig.position;
            
            const renderConfig = {
                type: graphConfig.type,
                aggregation: graphConfig.time_range === 'monthly' ? 'monthly' : 'daily',
                startDate: startDate.toISOString().split('T')[0],
                endDate: yesterday.toISOString().split('T')[0],
                showComparison: true
            };

            if (graphConfig.type === 'outpatient') {
                renderConfig.kaCode = graphConfig.ka_code;
                renderConfig.visitType = 'both';
                renderConfig.stacked = graphConfig.view_type === 'stacked';
            } else if (graphConfig.type === 'inpatient') {
                renderConfig.wardCode = graphConfig.ward_code;
                renderConfig.stacked = graphConfig.view_type === 'stacked';
            } else if (graphConfig.type === 'billing') {
                renderConfig.billingCode = graphConfig.billing_code;
            }

            state.graphConfigs[position] = renderConfig;
            await renderGraph(position, renderConfig);
        }

        console.log('初期設定を読み込みました');
    } catch (error) {
        console.error('設定ファイル読み込みエラー:', error);
        alert('設定ファイルの読み込みに失敗しました');
    }
}
