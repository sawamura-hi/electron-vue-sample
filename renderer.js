// renderer.js
const { createApp } = Vue;
const fs = require('fs');
const path = require('path');

// CSVファイルのパスを stock_data.csv に変更（サンプルデータと合わせる）
const filePath = path.join(__dirname, 'data', 'stock_data.csv');

createApp({
    data() {
        return {
            // CSVから読み込んだ株データをオブジェクトの配列で保持する
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
        // CSVファイルを読み込むメソッド
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
                        // unitPriceフィールドが存在する場合、初期描画用にカンマ区切りに整形
                        if (record.unitPrice) {
                            const num = parseFloat(record.unitPrice.toString().replace(/,/g, ''));
                            if (!isNaN(num)) {
                                record.unitPrice = num.toLocaleString();
                            }
                        }
                        // currentPriceフィールドも同様に整形
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
        // CSV形式で株データを保存するメソッド
        saveCSV() {
            try {
                // 入力されていない（全フィールドが空）の行を除外
                const validData = this.stockData.filter((record) => {
                    return Object.values(record).some((value) => value.toString().trim() !== '');
                });
                if (validData.length > 0) {
                    // 保存時は計算結果の列（評価損益、評価損益率、評価額）は保存せず、元データのみ保存
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
        // 新しい空行を追加するメソッド
        addRow() {
            if (this.stockData.length > 0) {
                const headers = Object.keys(this.stockData[0]);
                const newRecord = {};
                headers.forEach((header) => {
                    newRecord[header] = '';
                });
                // currentPriceを明示的に追加
                if (!newRecord.hasOwnProperty('currentPrice')) {
                    newRecord.currentPrice = '';
                }
                this.stockData.push(newRecord);
            } else {
                this.stockData.push({ code: '', name: '', unitPrice: '', currentPrice: '', quantity: '' });
            }
        },
        // 指定した行を削除するメソッド
        deleteRow(index) {
            this.stockData.splice(index, 1);
            this.showToast('行を削除しました');
        },
        // unitPriceとquantityの掛け算結果（購入金額）を計算し、カンマ付きの文字列で返す
        computePurchase(record) {
            const unitPrice = parseFloat(record.unitPrice.toString().replace(/,/g, ''));
            const quantity = parseFloat(record.quantity);
            if (!isNaN(unitPrice) && !isNaN(quantity)) {
                const result = unitPrice * quantity;
                return result.toLocaleString();
            }
            return '';
        },
        // 評価損益を計算するメソッド
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
        // 評価損益率を計算するメソッド
        computeGainLossPercent(record) {
            const unitPrice = parseFloat(record.unitPrice.toString().replace(/,/g, ''));
            const currentPrice = parseFloat(record.currentPrice.toString().replace(/,/g, ''));
            if (!isNaN(unitPrice) && unitPrice !== 0 && !isNaN(currentPrice)) {
                const percent = ((currentPrice - unitPrice) / unitPrice) * 100;
                return percent.toFixed(2) + '%';
            }
            return '';
        },
        // unitPrice入力欄のフォーマット処理：フォーカスが外れたときにカンマ区切りにする
        formatUnitPrice(record) {
            let value = record.unitPrice.toString().replace(/,/g, '');
            const num = parseFloat(value);
            if (!isNaN(num)) {
                record.unitPrice = num.toLocaleString();
            }
        },
        // unitPrice入力欄のフォーマット解除：フォーカス時にカンマを除去して編集可能にする
        removeFormatUnitPrice(record) {
            record.unitPrice = record.unitPrice.toString().replace(/,/g, '');
        },
        // currentPrice入力欄のフォーマット処理：フォーカスが外れたときにカンマ区切りにする
        formatCurrentPrice(record) {
            let value = record.currentPrice.toString().replace(/,/g, '');
            const num = parseFloat(value);
            if (!isNaN(num)) {
                record.currentPrice = num.toLocaleString();
            }
        },
        // currentPrice入力欄のフォーマット解除：フォーカス時にカンマを除去して編集可能にする
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
        // 新たに追加：評価額（保有株数×現在株価）を計算するメソッド
        computeEvaluation(record) {
            const currentPrice = parseFloat(record.currentPrice.toString().replace(/,/g, ''));
            const quantity = parseFloat(record.quantity);
            if (!isNaN(currentPrice) && !isNaN(quantity)) {
                const result = currentPrice * quantity;
                return result.toLocaleString();
            }
            return '';
        },
    },
    mounted() {
        this.loadCSV();
    },
}).mount('#app');
