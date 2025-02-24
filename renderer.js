// renderer.js
const puppeteer = require('puppeteer');
const { createApp } = Vue;
const fs = require('fs');
const path = require('path');
const yahooFinance2 = require('yahoo-finance2').default;

// CSVファイルのパス（株データ）
const filePath = path.join(__dirname, 'data', 'stock_data.csv');

// debounce 関数（指定した delay だけ呼び出しを遅延させる）
function debounce(func, delay) {
    let timer;
    return function (...args) {
        const context = this;
        clearTimeout(timer);
        timer = setTimeout(() => {
            func.apply(context, args);
        }, delay);
    };
}

createApp({
    data() {
        return {
            stockData: [],
            toastMessage: '',
            // TSE_stocks.csv の内容を保持
            tseStocks: [],
        };
    },
    methods: {
        showToast(message, duration = 2000) {
            this.toastMessage = message;
            setTimeout(() => {
                this.toastMessage = '';
            }, duration);
        },
        // CSVファイルから株データを読み込む
        loadCSV() {
            try {
                if (fs.existsSync(filePath)) {
                    const csvText = fs.readFileSync(filePath, 'utf-8');
                    const lines = csvText.trim().split('\n');
                    const headers = lines[0].split(',').map((h) => h.trim());
                    const data = [];
                    for (let i = 1; i < lines.length; i++) {
                        const row = lines[i].split(',').map((item) => item.trim());
                        if (row.length !== headers.length) continue;
                        const record = {};
                        headers.forEach((header, index) => {
                            record[header] = row[index];
                        });
                        // ドロップダウン表示用フラグ
                        record.showDropdown = false;
                        // unitPrice, currentPrice のフォーマット処理
                        if (record.unitPrice) {
                            const num = parseFloat(record.unitPrice.toString().replace(/,/g, ''));
                            if (!isNaN(num)) {
                                record.unitPrice = num.toLocaleString();
                            }
                        }
                        if (record.currentPrice) {
                            const num = parseFloat(record.currentPrice.toString().replace(/,/g, ''));
                            if (!isNaN(num)) {
                                record.currentPrice = num.toLocaleString();
                            }
                        }
                        data.push(record);
                    }
                    this.stockData = data;
                } else {
                    this.showToast('CSVファイルが存在しません。');
                    this.stockData = [];
                }
            } catch (err) {
                console.error('CSVファイル読み込みエラー:', err);
                this.showToast('CSVファイルの読み込みに失敗');
            }
        },
        // CSV形式で株データを保存する
        saveCSV() {
            try {
                const validData = this.stockData.filter((record) => Object.values(record).some((value) => value.toString().trim() !== ''));
                if (validData.length > 0) {
                    const headers = ['code', 'name', 'quantity', 'unitPrice', 'currentPrice'];
                    const csvRows = [
                        headers.join(','),
                        ...validData.map((record) => {
                            const rec = {
                                code: record.code,
                                name: record.name,
                                quantity: record.quantity,
                                unitPrice: record.unitPrice ? record.unitPrice.toString().replace(/,/g, '') : '',
                                currentPrice: record.currentPrice ? record.currentPrice.toString().replace(/,/g, '') : '',
                            };
                            return headers.map((header) => rec[header]).join(',');
                        }),
                    ];
                    const csvText = csvRows.join('\n');
                    fs.writeFileSync(filePath, csvText, 'utf-8');
                    this.showToast('保存しました');
                } else {
                    this.showToast('保存するデータがありません。');
                }
            } catch (err) {
                console.error('CSVファイル保存エラー:', err);
                this.showToast('CSVファイルの保存に失敗');
            }
        },
        // 新しい空行を追加（ドロップダウンフラグ初期化）
        addRow() {
            const newRecord = { code: '', name: '', unitPrice: '', currentPrice: '', quantity: '', showDropdown: false };
            this.stockData.push(newRecord);
        },
        // 行の削除
        deleteRow(index) {
            this.stockData.splice(index, 1);
            this.showToast('行を削除しました');
        },
        // 購入金額（unitPrice × quantity）を計算
        computePurchase(record) {
            const unitPrice = parseFloat(record.unitPrice.toString().replace(/,/g, ''));
            const quantity = parseFloat(record.quantity);
            if (!isNaN(unitPrice) && !isNaN(quantity)) {
                const result = unitPrice * quantity;
                return result.toLocaleString();
            }
            return '';
        },
        // 評価損益（(currentPrice - unitPrice) × quantity）を計算
        computeGainLoss(record) {
            const unitPrice = parseFloat(record.unitPrice.toString().replace(/,/g, ''));
            const currentPrice = parseFloat(record.currentPrice.toString().replace(/,/g, ''));
            const quantity = parseFloat(record.quantity);
            if (!isNaN(unitPrice) && !isNaN(currentPrice) && !isNaN(quantity)) {
                const gainLoss = (currentPrice - unitPrice) * quantity;
                return gainLoss.toLocaleString();
            }
            return '';
        },
        // 評価損益率を計算
        computeGainLossPercent(record) {
            const unitPrice = parseFloat(record.unitPrice.toString().replace(/,/g, ''));
            const currentPrice = parseFloat(record.currentPrice.toString().replace(/,/g, ''));
            if (!isNaN(unitPrice) && unitPrice !== 0 && !isNaN(currentPrice)) {
                const percent = ((currentPrice - unitPrice) / unitPrice) * 100;
                return percent.toFixed(2) + '%';
            }
            return '';
        },
        // unitPrice のフォーマット処理（フォーカスアウト時）
        formatUnitPrice(record) {
            let value = record.unitPrice.toString().replace(/,/g, '');
            const num = parseFloat(value);
            if (!isNaN(num)) {
                record.unitPrice = num.toLocaleString();
            }
        },
        // unitPrice のフォーマット解除（フォーカス時）
        removeFormatUnitPrice(record) {
            record.unitPrice = record.unitPrice.toString().replace(/,/g, '');
        },
        // currentPrice のフォーマット処理（フォーカスアウト時）
        formatCurrentPrice(record) {
            let value = record.currentPrice.toString().replace(/,/g, '');
            const num = parseFloat(value);
            if (!isNaN(num)) {
                record.currentPrice = num.toLocaleString();
            }
        },
        // currentPrice のフォーマット解除（フォーカス時）
        removeFormatCurrentPrice(record) {
            record.currentPrice = record.currentPrice.toString().replace(/,/g, '');
        },
        // 生の評価損益を計算（条件判定用）
        rawGainLoss(record) {
            const unitPrice = parseFloat(record.unitPrice.toString().replace(/,/g, ''));
            const currentPrice = parseFloat(record.currentPrice.toString().replace(/,/g, ''));
            const quantity = parseFloat(record.quantity);
            if (!isNaN(unitPrice) && !isNaN(currentPrice) && !isNaN(quantity)) {
                return (currentPrice - unitPrice) * quantity;
            }
            return 0;
        },
        // 評価額（currentPrice × quantity）を計算
        computeEvaluation(record) {
            const currentPrice = parseFloat(record.currentPrice.toString().replace(/,/g, ''));
            const quantity = parseFloat(record.quantity);
            if (!isNaN(currentPrice) && !isNaN(quantity)) {
                const result = currentPrice * quantity;
                return result.toLocaleString();
            }
            return '';
        },

        async fetchCurrentPrice() {
            this.showToast('現在株価を取得中...');
            try {
                // 1つのブラウザインスタンスを起動
                const browser = await puppeteer.launch({ headless: true });
                // 各レコードについて処理
                for (let record of this.stockData) {
                    if (!record.code) continue;
                    const page = await browser.newPage();
                    // Kabutan のページへアクセス（銘柄コードを利用）
                    await page.goto(`https://kabutan.jp/stock/?code=${record.code}`, { waitUntil: 'networkidle2' });
                    // 指定のセレクタから株価テキストを取得
                    const price = await page.evaluate(() => {
                        const elem = document.querySelector('#stockinfo_i1 > div.si_i1_2 > span.kabuka');
                        return elem ? elem.textContent.trim() : null;
                    });

                    console.log(price);

                    const numericPrice = price ? parseFloat(price.replace(/,/g, '').replace(/円/g, '')) : null;

                    record.currentPrice = numericPrice;
                    await page.close();
                }
                await browser.close();
                this.showToast('株価の取得が完了');
            } catch (error) {
                console.error('株価取得エラー:', error);
                this.showToast('株価の取得に失敗');
            }
            this.saveCSV();
        },

        // TSE_stocks.csv の読み込み
        loadTSEStocks() {
            const tseFilePath = path.join(__dirname, 'data', 'TSE_stocks.csv');
            if (fs.existsSync(tseFilePath)) {
                const csvText = fs.readFileSync(tseFilePath, 'utf-8');
                const lines = csvText.trim().split('\n');
                const data = [];
                for (let i = 1; i < lines.length; i++) {
                    const parts = lines[i].split(',');
                    if (parts.length >= 2) {
                        data.push({ code: parts[0].trim(), name: parts[1].trim() });
                    }
                }
                // 前方一致検索を高速化するためソート（任意）
                this.tseStocks = data.sort((a, b) => a.code.localeCompare(b.code));
            } else {
                this.showToast('TSE_stocks.csvが存在しません。');
                this.tseStocks = [];
            }
        },
        // 前方一致検索：入力された query に一致する銘柄を返す
        filteredStocks(query) {
            if (!query) return [];
            return this.tseStocks.filter((stock) => stock.code.startsWith(query));
        },
        // 銘柄コードが完全一致した場合、対応する銘柄名を自動入力
        updateMatchingStockName(record) {
            const match = this.tseStocks.find((stock) => stock.code === record.code);
            if (match) {
                record.name = match.name;
            }
        },
        // 入力イベント：debounce を利用して updateMatchingStockName を呼び出す
        onInput(record) {
            record.showDropdown = true;
            this.debouncedUpdateMatchingStockName(record);
        },
        // ドロップダウンの候補をクリックした際の処理
        selectStock(record, stock) {
            record.code = stock.code;
            record.name = stock.name;
            record.showDropdown = false;
        },
    },
    mounted() {
        this.loadCSV();
        this.loadTSEStocks();
        // updateMatchingStockName を debounce 化（300ms）
        this.debouncedUpdateMatchingStockName = debounce(this.updateMatchingStockName, 300);
    },
}).mount('#app');
