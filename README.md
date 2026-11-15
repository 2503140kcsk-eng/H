# Starlight Wing — 星の翼

iPhoneの横画面・タッチ操作を想定した、オリジナル3D宇宙シューティングゲームです。Vite + TypeScript + Three.jsを使った静的PWAとして開発しています。

## 開発中の状態

**MVP / 縦切り版を開発中です。** すべての完成条件を満たした完成版ではありません。

現時点で追加した基盤:
- Three.jsによるトップダウン3Dシーン、3層の星背景、オリジナルの簡易機体・敵・ボス形状
- タッチドラッグ移動、自動射撃、9種の敵（狙撃・爆撃・追尾ミサイル・防御・群体・エリートを含む）、敵弾、ピックアップ、シールド、特殊攻撃
- フェーズを持つボス戦、HP / シールド / スコア / 撃破数 / コンボ
- 7種の戦闘ピックアップ：シャード、修理、オーバードライブ、マルチショット、シールド回復、速度強化、特殊ゲージ回復
- 4機体の選択・シャードによる恒久解放。標準型／高速型／重装型に加え、共鳴型「アストラ・アーク」は攻撃と機動のバランスを保ちつつシールド回復を犠牲にする。専用の共鳴リングとスイープ翼を持つ
- 3人のオリジナルパイロットを選択・恒久解放。攻撃・連射・移動・最大HP・シールド回復と必殺技が異なり、パイロットごとの固有スキルを実装。メニューには頭身のある自作軽量3D全身モデルを表示し、アイドルモーションと口形アニメーションを追加。ユーザーが選んだVRM / GLB（18 MB以下）は端末内で任意読込できる。VRM素材そのものは同梱しない
- 5種の武器と2スロット：標準弾、プリズムレーザー、追尾ホーミング弾、最大2体を貫くノヴァピアサー、追尾＋1体貫通の高出力「エクリプスランス」。発射間隔・威力・弾速を差別化し、シャードで解放
- 3惑星の連続キャンペーン：オーロラ・プライム、パイラ・リーチ、ノクティス・アーカイブ。惑星ごとの会話・ミッション・環境色・専用ボスに加え、戦闘中の固有イベントを二段階化。第一段階を達成すると保存済みのストーリー選択に応じて、弱点解析攻撃強化または護衛防壁展開へ分岐。各段階の報酬と3人分の通信台詞を実装し、クリア順で次の惑星を解放
- 追加衣装「ネビュラ・ヴェール」：シャードで解放するパイロット用カラー／装飾スキン。選択状態は端末セーブとJSONバックアップに保存
- パイロット無線通信パネル：出撃時の個別台詞、惑星イベントの通信、ボス戦の弱点開放・撃破メッセージをキュー表示。メニューではブラウザ標準の日本語音声読み上げを利用でき、発話中は口形を同期させる（録音済み声優ボイスや音素単位のリップシンクではない）
- 3種のボス：HP 50% / 25%で第II / 第III形態へ移行し、弱点コアの開閉周期・弾幕密度・攻撃間隔が変化。左右砲塔と（該当ボスの）装甲プレートを個別破壊すると対応攻撃が停止する。エンドレスではボスが巡回
- オリジナルのWeb AudioシンセBGM：通常航行とボス戦でパターンを切り替え、出撃・警告・弱点開放・勝利・敗北を状況連動キューで演出。5コンボごとに音程を変えるアクセントを追加。爆発粒子とカメラシェイクを追加（録音済み音源ファイルではなくコード生成）
- 6種の実績、ボス図鑑、端末内ローカルランキング。報酬・装備・惑星進行・コレクションをセーブとJSONバックアップへ保存
- Dexieを使った端末内セーブ、Zodによる値の検証、チェックサム付きJSONバックアップ（機体・パイロット・スキル・惑星ごとの会話分岐・隠し報酬を保存。新項目は既定値付きで追加し、旧version 1バックアップを読み込み可能）
- iPhone向けPWAマニフェストとオフラインキャッシュ設定
- Vitestによる戦闘計算・セーブ検証のテストとGitHub Actions

まだ実装・実機確認していない主な機能:
- 長編キャンペーン全体にわたる多数の追加章、選択の連鎖でミッションそのものが大幅に変わる複雑な分岐（現状はパイロット×惑星の初期9シーン＋二段階イベント分岐）
- 追加ボスの種類・独自形態、機体・武器・スキンの大幅追加、プレイヤー実測に基づく継続的な難易度調整
- 録音済み / アレンジ済みの高品質BGM・効果音。現在のBGMとコンボ音はWeb Audioによるリアルタイム合成で、録音音源ではない
- プロの声優による収録音声と音素ベースの高精度リップシンク。現状は端末読み上げ＋簡易口形同期
- 複数の完成済みVRMキャラクター素材。現状は自作軽量モデルを標準表示し、VRM / GLBをユーザーが任意で読み込む
- iPhone実機同士でのFiles / AirDrop / iCloud Driveを使ったバックアップ往復、Safari / BraveでのPWAインストール、タッチ、GPU、熱、長時間FPSの実測。手順は `docs/qa/iphone-field-test.md` に記録

## ローカル開発

Node.js 22以上を推奨します。

```bash
npm install
npm run dev
```

本番ビルドとテスト:

```bash
npm test
npm run build
npm run preview
```

## iPhoneでの試遊

**拡張ブランチの試遊用プレビュー:** [StackBlitzで feat/pilot-immersion-boss-evolution を開く](https://stackblitz.com/github/2503140kcsk-eng/H/tree/feat/pilot-immersion-boss-evolution)

StackBlitzはこの公開GitHubブランチを読み込み、Viteプレビューを起動できます。ただしWebContainersのSafari対応はベータ扱いで、iPhoneではメモリ制約やクロスオリジン分離の差により起動できない場合があります。GitHub Pagesの候補URLと初回設定手順は下記「iPhone Quality Gate と GitHub Pages 配布候補」を参照してください。ChatGPTの会話本文内でこのThree.js/Viteアプリ自体を直接実行することもできません。読み込み後にViteのプレビューを起動し、プレビューを別タブで開くとiPhoneで操作しやすくなります。iOS SafariでのWebContainersはベータ対応で、メモリ制限により大きなプロジェクトで停止する場合があります。まずSafariで試し、プレビューが起動しない場合はPCブラウザでの確認が必要です。iOS版BraveでのStackBlitz開発環境の動作は未検証です。

このStackBlitz URLは**開発用プレビュー**であり、正式な配布URLやiPhone実機の動作保証ではありません。ゲームのセーブ領域もStackBlitzのプレビューオリジンに属します。実機でのPWAインストール、Safari / BraveのGPU負荷、長時間プレイ、機種変更復元は別途確認が必要です。

iOSブラウザが画面向きの強制固定を受け付けない場合があるため、縦向きでは回転案内を表示します。

## セーブとバックアップ

- 進行状況はDexie / IndexedDBを使って端末内に保存します。
- ハンガーからJSONバックアップを書き出せます。
- 読み込み時はファイル形式・チェックサムを先に検証し、復元処理はIndexedDBトランザクションで行います。
- セーブ形式version 1を維持したまま、武器2枠・惑星進行・実績・ボス図鑑・ランキングを追加。旧version 1バックアップには安全な既定値を補完し、既存の機体/パイロット/経験値を保持します。
- 追加したPlaywright移行テストは、バックアップを書き出し、別ブラウザーコンテキストへ読み込む往復を検証します。実iPhone同士のAirDrop/iCloud移行を証明するものではありません。
- 復元前のセーブは端末内の復元スナップショットに保管します。

チェックサムは破損検出用で、暗号学的な署名や改ざん防止ではありません。バックアップのコピーはiCloud Driveなど利用者が管理する場所に保存してください。

## パフォーマンス方針

- アンチエイリアスと高負荷ポストエフェクトを初期設定で切り、devicePixelRatioを1.25に制限
- 敵・弾・粒子の同時数を制限
- フレーム時間に基づく移動・当たり判定
- タブが非表示になった場合は一時停止
- 60 FPSは目標であり、iPhone実機で確認するまでは達成を主張しません

## ライセンスと素材

3D機体・敵・ボスと星空はコード生成の軽量形状です。BGMは独自の旋律をWeb Audioで合成します。外部モデル・音楽・画像を追加する際は、個別ファイルのライセンス、帰属表示、再配布条件を確認します。

## 開発計画

- [設計書](docs/superpowers/specs/2026-11-14-starlight-wing-design.md)
- [MVP実装計画](docs/superpowers/plans/2026-11-14-starlight-wing-mvp.md)
- [惑星・戦闘拡張計画](docs/superpowers/plans/2026-11-15-planetary-combat-expansion.md)
- [拡張仕様](docs/superpowers/specs/2026-11-15-planetary-combat-expansion.md)
- [パイロット没入・ボス進化仕様](docs/superpowers/specs/2026-11-15-pilot-immersion-boss-evolution.md)
- [パイロット没入・ボス進化実装計画](docs/superpowers/plans/2026-11-15-pilot-immersion-boss-evolution.md)
- [iPhone実機検証チェックリスト](docs/qa/iphone-quality-gate.md)
- [ツールとリポジトリの役割分担](docs/architecture/tool-roles.md)


## ChatGPTからiPhoneで試遊する場合

この会話の中でGitHub上のViteアプリを直接ゲームとして実行することはできません。ChatGPTから上のStackBlitzリンクを開き、iPhone SafariでViteのプレビューを起動して別タブで試遊してください。これは開発プレビューであり、iOS Safari / Braveの実機互換性やPWAインストールを保証するものではありません。


## iPhone Quality Gate と GitHub Pages 配布候補

iPhone向け診断はハンガーの「◎ iPhone診断 / Q-TRACE」から開けます。Q-TRACE（Quality Trace）は、ブラウザー能力の確認、ゲーム実行中のイベント観測、利用者が実機で確認した項目を分離した診断パスポートです。結果は端末内で生成し、JSON / CSVとして書き出します。診断内容を外部サーバーへ送信しません。

- `Q-TRACE` はHTTPS、WebGL 2、Pointer Events、タッチ能力、横画面、PWA / Service Worker、IndexedDB、Web Audio、WebGL復旧、キャンバス入力、ページ復帰を検査します。
- WebGL context lost / restored、キャンバス pointer down / up / cancel、visibilitychange / pagehide / pageshow は画面を開いている間も継続して観測します。観測していない項目はPASSにせず「実機確認」と表示します。
- JSON / CSVには判定状態、根拠、次の確認方法、ブラウザー環境、実機確認チェックを含めます。スコアはブラウザー内の自動検査結果であり、実機認証やFPS保証ではありません。
- 旧version 1セーブの移行と、チェックサム不一致・切断・サイズ超過バックアップの拒否を回帰テストします。

### GitHub Pages 候補

GitHub Pagesのproject site URLは `https://2503140kcsk-eng.github.io/H/` です。候補版は `feat/iphone-quality-gate` のQuality Gateが通った場合だけGitHub PagesへデプロイするWorkflowを追加しました。初回のみリポジトリの **Settings → Pages → Build and deployment → Source → GitHub Actions** を選択してください。Pages設定が完了し、Actionsのdeploy jobが成功するまでは、このURLの公開済み動作を保証しません。

PagesビルドではViteのbase、PWA manifestのid / scope / start_url、Workboxのfallbackを `/H/` に統一します。通常の開発・既定ビルドは `/` のままです。VercelやSupabaseの有料枠、APIキー、バックエンドは必要ありません。

### 実機検証の境界

PlaywrightのiPhone viewport / touch emulationは自動回帰検査用です。iOS Safari / Brave実機のGPU、音声ポリシー、PWAインストール、熱・持続FPS、Files / AirDrop / iCloud Drive経由の端末間復元を代替しません。実機チェックは `docs/qa/iphone-quality-gate.md` を参照してください。
