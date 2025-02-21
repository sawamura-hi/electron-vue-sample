// renderer.js
const { createApp } = Vue;
const fs = require('fs');
const path = require('path');
// yahoo-finance2 のデフォルトエクスポートを利用
const yahooFinance2 = require('yahoo-finance2').default;

// CSVファイルのパス（株データ）
const filePath = path.join(__dirname, 'data', 'stock_data.csv');
// 東証銘柄一覧を保存するファイルのパス
const tseFilePath = path.join(__dirname, 'data', 'TSE_stocks.csv');

createApp({
    data() {
        return {
            // CSVから読み込んだ株データをオブジェクトの配列で保持
            stockData: [],
            toastMessage: '',
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
                        // unitPrice の整形
                        if (record.unitPrice) {
                            const num = parseFloat(record.unitPrice.toString().replace(/,/g, ''));
                            if (!isNaN(num)) {
                                record.unitPrice = num.toLocaleString();
                            }
                        }
                        // currentPrice の整形
                        if (record.currentPrice) {
                            const num = parseFloat(record.currentPrice.toString().replace(/,/g, ''));
                            if (!isNaN(num)) {
                                record.currentPrice = num.toLocaleString();
                            }
                        }
                        data.push(record);
                    }
                    this.stockData = data;
                    this.showToast('CSVファイルの読み込みに成功しました！');
                } else {
                    this.showToast('CSVファイルが存在しません。');
                    this.stockData = [];
                }
            } catch (err) {
                console.error('CSVファイル読み込みエラー:', err);
                this.showToast('CSVファイルの読み込みに失敗しました。');
            }
        },
        // CSV形式で株データを保存する
        saveCSV() {
            try {
                const validData = this.stockData.filter((record) => {
                    return Object.values(record).some((value) => value.toString().trim() !== '');
                });
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
                    this.showToast('CSVファイルが保存されました！');
                } else {
                    this.showToast('保存するデータがありません。');
                }
            } catch (err) {
                console.error('CSVファイル保存エラー:', err);
                this.showToast('CSVファイルの保存に失敗しました。');
            }
        },
        // 新しい空行を追加する
        addRow() {
            if (this.stockData.length > 0) {
                const headers = Object.keys(this.stockData[0]);
                const newRecord = {};
                headers.forEach((header) => {
                    newRecord[header] = '';
                });
                if (!newRecord.hasOwnProperty('currentPrice')) {
                    newRecord.currentPrice = '';
                }
                this.stockData.push(newRecord);
            } else {
                this.stockData.push({ code: '', name: '', unitPrice: '', currentPrice: '', quantity: '' });
            }
        },
        // 指定した行を削除する
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
        // 新たに追加：yahoo-finance2 を利用して TSE 銘柄一覧を取得し CSV に保存する
        // 新たに fetchTSEStocks() を search 関数で実装
        async fetchTSEStocks() {
            // 例として主要な3銘柄を対象
            const tseTickers = ['7203.T', '6758.T', '9984.T'];
            try {
                const stocks = await Promise.all(
                    tseTickers.map(async (ticker) => {
                        const searchResult = await yahooFinance2.search(ticker);
                        // APIレスポンスは quotes 配列に結果が入っています
                        if (searchResult && searchResult.quotes && searchResult.quotes.length > 0) {
                            const stockInfo = searchResult.quotes[0];
                            return {
                                code: stockInfo.symbol,
                                // longname があればそちら、なければ shortname を利用
                                name: stockInfo.longname || stockInfo.shortname || '',
                            };
                        } else {
                            return { code: ticker, name: 'Not Found' };
                        }
                    }),
                );
                // CSV形式に整形（ヘッダ行 + 各レコード）
                const csvRows = ['code,name', ...stocks.map((s) => `${s.code},${s.name}`)];
                fs.writeFileSync(tseFilePath, csvRows.join('\n'), 'utf-8');
                this.showToast('TSE銘柄一覧を保存しました！');
            } catch (err) {
                console.error(err);
                this.showToast('TSE銘柄一覧の取得に失敗しました。');
            }
        },
    },
    mounted() {
        this.loadCSV();
    },
}).mount('#app');
