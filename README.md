# Cookie とタブ状態管理の再現サンプル

Qiita記事「Cookieに検索状態を保存したら別タブの状態が混ざった：PiniaとsessionStorageの責務を整理する」の挙動を、実ブラウザと複数タブで確認するための最小プロジェクトです。対象コミットは `f9c8369`（記事下書き追加）と `8746af5`（見出し書式の調整）です。二つのコミットは同じ記事を対象にしているため、このサンプルも一つです。

## 再現する契約

| 条件 | 画面が読む状態 | 永続化先 | タブ間の結果 |
| --- | --- | --- | --- |
| 不具合条件 | 詳細表示のたびにCookieを読む | Cookie | タブBが保存した値でタブAが上書きされる |
| 修正条件 | 実行中メモリを優先する | `sessionStorage`はリロード復元だけに使う | 各タブの値が混ざらない |

実装はフレームワークに依存しないTypeScriptです。記事におけるPiniaの状態を、このサンプルではモジュール内の`memoryState`で置き換えています。したがって、重要なのはPiniaというライブラリ名ではなく、**現在のタブの画面状態をCookieから読まない**ことです。

## 実行

Node.js 20以上とpnpmを用意して、次を実行します。

```bash
pnpm install
pnpm build
pnpm test:e2e
```

`test:e2e`は同一`BrowserContext`で二つの`Page`を作り、Cookieが共有される複数タブを再現します。最初のテストは意図的に`customer-b`がタブAへ混入することを検証します。二つ目のテストは、タブAの`customer-a`がリロード後も復元されることを確認します。

## 手動で観察する

```bash
pnpm dev
```

表示されたURLを二つのタブで開きます。まず「不具合を再現」のまま、タブAで`customer-a`、タブBで`customer-b`を検索します。タブAの「詳細を開く」を押すと`customer-b`が表示されます。次に両タブで「修正後を検証」を選び、同じ操作を繰り返すと、タブAには`customer-a`が残ります。

## 構成

| パス | 役割 |
| --- | --- |
| `src/main.ts` | Cookie条件とタブ分離条件の状態管理を実装する |
| `src/style.css` | 手動観察用の最小画面スタイルを定義する |
| `tests/multi-tab.spec.ts` | 二つのタブの状態が混ざる条件と分離される条件をE2Eで検証する |
| `playwright.config.ts` | テスト対象のViteサーバーを起動する |

## 参考

[1]: https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Cookies "MDN: Using HTTP cookies"
[2]: https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage "MDN: Window: sessionStorage property"

Cookieは同一オリジンでリクエストに添付される共有状態であり、`sessionStorage`はタブごとに分離されるストレージです。[1] [2]
