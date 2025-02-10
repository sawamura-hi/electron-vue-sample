// renderer.js
const { createApp } = Vue;
const fs = require('fs');
const path = require('path');

// テキストファイルのパス（アプリと同じフォルダ内の sample.txt）
const filePath = path.join(__dirname, 'sample.txt');

createApp({
  data() {
    return {
      textContent: ''  // テキストエリアにバインドする内容
    };
  },
  methods: {
    // テキストファイルを読み込む
    loadFile() {
      try {
        if (fs.existsSync(filePath)) {
          this.textContent = fs.readFileSync(filePath, 'utf-8');
        } else {
          // ファイルが存在しない場合は空文字列で初期化
          this.textContent = '';
        }
      } catch (err) {
        console.error('ファイル読み込みエラー:', err);
        alert('テキストファイルの読み込みに失敗しました。');
      }
    },
    // テキストファイルを保存する
    saveFile() {
      try {
        fs.writeFileSync(filePath, this.textContent, 'utf-8');
        alert('ファイルが保存されました！');
      } catch (err) {
        console.error('ファイル保存エラー:', err);
        alert('ファイルの保存に失敗しました。');
      }
    }
  },
  mounted() {
    // コンポーネントマウント時にファイルを読み込む
    this.loadFile();
  }
}).mount('#app');
