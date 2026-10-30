# SQL 教科書（ジェネレーター）

アプリと同じデータから、ふりがな・英語併記の SQL 教科書（A4・1 Lesson＝見開き 2 ページ）を作る。

```
cd textbook
python3 build.py            # out/beginner.html を作る（SQL を全部実行して表・結果を作る）
node render.mjs             # out/beginner.pdf を作る（ページに収まらないときだけ少し縮小）
python3 pages.py            # 各 Lesson が 2 ページになっているか確認
node check-sql.mjs          # 教科書の SQL をアプリのエンジン（sql.js）でも実行して、結果が同じか確認
```

データ分析編（Unit A1〜A6）：

```
python3 build.py analysis   # out/analysis.html（図は analysis-figs.mjs がアプリと同じ charts.js で描く）
node render.mjs analysis    # out/analysis.pdf → next/book/data-analysis-textbook.pdf
python3 pages.py analysis
node check-sql.mjs analysis
```

必要なもの：Python 3、Node.js、Playwright（Chromium）、`../tools-next` の `npm install`（sql.js）。

## ファイル

- `content_beginner.py` … 初級編 Lesson 0〜18 の中身（データとして書く）
- `content_analysis.py`・`front_analysis.py` … データ分析編 Unit A1〜A6（依頼・統計の基礎・見てみる・Excel / Python・やってみよう）と、表紙・講座の地図・データ・答え
- `front_beginner.py` … 表紙・使い方・学びの地図・目次・例題の表
- `build.py` … 生成プログラム。`{漢字|かんじ}` でふりがなを付ける
- `page.css` … 見た目
- `export-data.mjs` … アプリの表（`next/js/datasets.js`）を読み出す。教科書専用の表 members は `build.py` にある

## ビルド時に自動で止まるもの

- ふりがなのない漢字がある
- 「よくある間違い」の SQL が、正しい SQL と同じ結果になる（間違いになっていない）
- 正しいはずの SQL がエラーになる

結果の表・行数・「→ 3 行になる（正しくは 4 行）」などは、すべて実行結果から作るので、手で書かない。

## 書き方のルール（全体設計の文書より）

- すべての漢字にふりがな、日本語の文の下に英語
- 1 行に収まる文は改行しない。折り返すときは「、」「。」や文節の切れ目で
- 「結果が変わる」と書くときは、必ずその結果を図（表）で見せる
- 用語は「構文」「句」「Lesson」。SQL 全体のルールは、その Lesson で一度だけ説明して、ほかでは参照する
- 本文はこのアプリで動く書き方。データベースごとの違いは DB の囲みで
